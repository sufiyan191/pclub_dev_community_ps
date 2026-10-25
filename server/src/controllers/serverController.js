import { z } from 'zod';
import pool, { query } from '../config/postgres.js';
import { GroupMessage } from '../models/GroupMessage.js';
import { Notification } from '../models/Notification.js';

const createServerSchema = z.object({
  name: z.string().min(3).max(100),
  monogram: z.string().min(1).max(4).toUpperCase(),
  description: z.string().max(300).optional(),
  icon_url: z.string().optional(),
});

const createGroupSchema = z.object({
  name: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Group name must be lowercase letters, numbers, or hyphens (e.g., react-help)'),
  description: z.string().max(250).optional(),
});

// 1. CREATE A SERVER + DEFAULT '#general' GROUP (POST /api/servers)
export const createServer = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, monogram, description = '', icon_url = '' } = createServerSchema.parse(req.body);

    await client.query('BEGIN');

    // Insert Server
    const serverRes = await client.query(
      `INSERT INTO servers (name, monogram, description, icon_url, owner_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, monogram, description, icon_url, req.user.id]
    );
    const newServer = serverRes.rows[0];

    // Automatically add creator to "My Joined Servers" as OWNER
    await client.query(
      `INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
      [newServer.id, req.user.id]
    );

    // Automatically create a default '#general' group inside the new server
    await client.query(
      `INSERT INTO groups (server_id, name, description)
       VALUES ($1, 'general', 'General discussion and community Q&A')`,
      [newServer.id]
    );

    await client.query('COMMIT');
    return res.status(201).json({ success: true, server: newServer });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A server with that name already exists.' });
    }
    console.error('Create Server Error:', error);
    return res.status(500).json({ success: false, message: 'Error creating server.' });
  } finally {
    client.release();
  }
};

// 2. GET ALL DISCOVERABLE SERVERS + MY JOINED SERVERS (GET /api/servers)
export const getServers = async (req, res) => {
  try {
    const allServers = await query(
      `SELECT s.*, COUNT(sm.user_id)::int AS member_count
       FROM servers s
       LEFT JOIN server_members sm ON s.id = sm.server_id
       GROUP BY s.id
       ORDER BY member_count DESC, s.created_at DESC`
    );

    let joinedServers = [];
    if (req.user?.id) {
      const joinedRes = await query(
        `SELECT s.*, sm.role AS my_role
         FROM servers s
         INNER JOIN server_members sm ON s.id = sm.server_id
         WHERE sm.user_id = $1
         ORDER BY sm.joined_at ASC`,
        [req.user.id]
      );
      joinedServers = joinedRes.rows;
    }

    return res.status(200).json({
      success: true,
      allServers: allServers.rows,
      joinedServers,
    });
  } catch (error) {
    console.error('Get Servers Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching servers.' });
  }
};

// 3. JOIN A SERVER (POST /api/servers/:serverId/join)
export const joinServer = async (req, res) => {
  try {
    const { serverId } = req.params;
    await query(
      `INSERT INTO server_members (server_id, user_id, role)
       VALUES ($1, $2, 'MEMBER')
       ON CONFLICT (server_id, user_id) DO NOTHING`,
      [serverId, req.user.id]
    );
    return res.status(200).json({ success: true, message: 'Joined server successfully!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error joining server.' });
  }
};

// 4. GET ALL GROUPS IN A SERVER (GET /api/servers/:serverId/groups) -> Powers Center Panel!
export const getServerGroups = async (req, res) => {
  try {
    const { serverId } = req.params;
    const groupsRes = await query(
      `SELECT g.*, COUNT(p.id)::int AS post_count
       FROM groups g
       LEFT JOIN posts p ON g.id = p.group_id
       WHERE g.server_id = $1
       GROUP BY g.id
       ORDER BY g.created_at ASC`,
      [serverId]
    );
    return res.status(200).json({ success: true, groups: groupsRes.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching server groups.' });
  }
};

// 5. CREATE A GROUP IN A SERVER (POST /api/servers/:serverId/groups)
export const createGroup = async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, description = '' } = createGroupSchema.parse(req.body);

    const result = await query(
      `INSERT INTO groups (server_id, name, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [serverId, name, description]
    );
    return res.status(201).json({ success: true, group: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Group already exists in this server.' });
    }
    return res.status(500).json({ success: false, message: 'Error creating group.' });
  }
};

// 6. GET LIVE CHAT HISTORY FOR A GROUP FROM MONGODB (GET /api/servers/groups/:groupId/chat)
export const getGroupChatHistory = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await GroupMessage.find({ groupId: Number(groupId) })
      .sort({ createdAt: 1 })
      .limit(100);
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error loading group chat.' });
  }
};

// 7. GLOBAL OMNI-SEARCH (GET /api/servers/search?q=...) -> Powers Top Spatial Search Bar!
export const globalOmniSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(200).json({ people: [], servers: [], groups: [], posts: [] });
    }
    const pattern = `%${q}%`;

    const [people, servers, groups, posts] = await Promise.all([
      query('SELECT id, username, bio, skills, reputation, avatar_url FROM users WHERE username ILIKE $1 OR bio ILIKE $1 LIMIT 5', [pattern]),
      query('SELECT id, name, monogram, description FROM servers WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5', [pattern]),
      query('SELECT g.id, g.name, g.server_id, s.name AS server_name FROM groups g JOIN servers s ON g.server_id = s.id WHERE g.name ILIKE $1 LIMIT 5', [pattern]),
      query('SELECT id, group_id, title, tags, score, created_at FROM posts WHERE title ILIKE $1 OR body_markdown ILIKE $1 LIMIT 8', [pattern]),
    ]);

    return res.status(200).json({
      success: true,
      people: people.rows,
      servers: servers.rows,
      groups: groups.rows,
      posts: posts.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Search error.' });
  }
};

// 8. GET USER NOTIFICATIONS FROM MONGODB (GET /api/servers/notifications)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientUserId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(25);
    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching notifications.' });
  }
};