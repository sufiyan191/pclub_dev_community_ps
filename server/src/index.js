import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { connectPostgres, query } from './config/postgres.js';
import { setIO, userRoom } from './config/socket.js';
import { connectMongo } from './config/mongo.js';
import authRoutes from './routes/authRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
import postRoutes from './routes/postRoutes.js';
import { GroupMessage } from './models/GroupMessage.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io for Real-Time Group Chat & Notifications (Stretch Goal)
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Spatial Dev Platform API & WebSockets running' });
});

// Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/posts', postRoutes);

setIO(io);

// Identify the socket once, at connection time, from the same JWT the REST API uses.
// Anonymous visitors may still connect and read a group's chat, but cannot send.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  socket.user = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.userId, username: decoded.username };
    } catch {
      // Expired or forged token: treat as anonymous instead of rejecting the connection.
    }
  }
  next();
});

io.on('connection', (socket) => {
  // Every logged-in user gets a private room so notifications can be pushed live.
  if (socket.user) socket.join(userRoom(socket.user.id));

  // A socket sits in at most one group room at a time, so chat can never leak
  // from a group the user has already left.
  socket.on('join_group', (groupId) => {
    for (const room of socket.rooms) {
      if (room.startsWith('group_')) socket.leave(room);
    }
    socket.join(`group_${Number(groupId)}`);
  });

  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${Number(groupId)}`);
  });

  socket.on('send_group_message', async (payload, ack) => {
    try {
      if (!socket.user) {
        return ack?.({ ok: false, message: 'Log in to chat.' });
      }

      const groupId = Number(payload?.groupId);
      const content = String(payload?.content ?? '').trim().slice(0, 2000);
      const codeSnippet = String(payload?.codeSnippet ?? '').slice(0, 5000);
      if (!Number.isInteger(groupId) || !content) {
        return ack?.({ ok: false, message: 'Message cannot be empty.' });
      }

      const group = await query('SELECT 1 FROM groups WHERE id = $1', [groupId]);
      if (group.rows.length === 0) {
        return ack?.({ ok: false, message: 'That group no longer exists.' });
      }

      // Sender identity comes from the verified token, never from the client payload.
      const savedMsg = await GroupMessage.create({
        groupId,
        senderId: socket.user.id,
        senderUsername: socket.user.username,
        content,
        codeSnippet,
      });

      io.to(`group_${groupId}`).emit('new_group_message', savedMsg);
      ack?.({ ok: true });
    } catch (err) {
      console.error('Socket Message Error:', err.message);
      ack?.({ ok: false, message: 'Could not send message.' });
    }
  });
});

// Auto-Seed Initial Communities if Database is Empty (Great for Demo Day!)
const seedInitialCommunities = async () => {
  try {
    const existing = await query('SELECT COUNT(*)::int AS count FROM servers');
    if (existing.rows[0].count > 0) return;

    console.log('🌱 Seeding initial Spatial Communities & Groups...');
    const s1 = await query(
      `INSERT INTO servers (name, monogram, description) VALUES
       ('PClub IIT Indore', 'PC', 'Official Software Division community for full-stack, systems, and open source.'),
       ('Full-Stack Spatial', 'FS', 'Next.js, Node, Express, PostgreSQL, and UI architecture discussions.'),
       ('CP & Algorithms', 'CP', 'Competitive programming, Codeforces rounds, graphs, and DP discussions.')
       RETURNING id`
    );

    const [pclubId, fsId, cpId] = s1.rows.map((r) => r.id);

    await query(
      `INSERT INTO groups (server_id, name, description) VALUES
       ($1, 'general-dev', 'General software discussion & campus tech talks'),
       ($1, 'induction-doubts', 'Ask questions about PS 06 architecture & full-stack'),
       ($1, 'project-showcase', 'Share your builds and get code reviews'),
       ($2, 'nextjs-react', 'Frontend state, SSR, and Spatial Glassmorphism UI'),
       ($2, 'postgres-node', 'SQL optimization, indexing, and Express APIs'),
       ($3, 'dp-and-graphs', 'Dynamic programming, BFS/DFS, and shortest paths'),
       ($3, 'contest-upsolving', 'Post-contest discussion and complexity analysis')`,
      [pclubId, fsId, cpId]
    );
    console.log('✅ Initial Communities & Groups seeded!');
  } catch (err) {
    console.warn('⚠️ Seeding skipped (make sure schema.sql has been run in Neon first):', err.message);
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectPostgres();
  await connectMongo();
  await seedInitialCommunities();

  server.listen(PORT, () => {
    console.log(`🚀 Spatial Server + WebSockets listening on http://localhost:${PORT}`);
  });
};

startServer();