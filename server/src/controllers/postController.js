import { z } from 'zod';
import pool, { query } from '../config/postgres.js';
import { Notification } from '../models/Notification.js';
import { pushToUser } from '../config/socket.js';

const postSchema = z.object({
  group_id: z.number().int(),
  title: z.string().min(5).max(255),
  body_markdown: z.string().min(10),
  tags: z.array(z.string().max(25)).max(6).optional(),
});

// Edit accepts any subset of the post fields, but each one must still pass the same rules as creation.
const updatePostSchema = postSchema
  .omit({ group_id: true })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update.' });

const commentSchema = z.object({
  body_markdown: z.string().min(2),
});

const voteSchema = z.object({
  target_type: z.enum(['POST', 'COMMENT']),
  target_id: z.number().int(),
  vote_value: z.union([z.literal(1), z.literal(-1)]),
});

// Store a notification in MongoDB, then push it to the recipient if they are online.
const notify = async (data) => {
  const saved = await Notification.create(data);
  pushToUser(data.recipientUserId, 'notification', saved);
};

// Reputation a single vote is worth to the author of the voted item.
const repForVote = (value) => (value === 1 ? 5 : value === -1 ? -2 : 0);

// 1. GET POSTS FEED (Supports groupId, tag, search, and sort='newest'|'top')
export const getPostsFeed = async (req, res) => {
  try {
    const { groupId, tag, search, sort = 'newest' } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (groupId) {
      conditions.push(`p.group_id = $${idx++}`);
      values.push(Number(groupId));
    }
    if (tag) {
      conditions.push(`$${idx++} = ANY(p.tags)`);
      values.push(tag.toLowerCase());
    }
    if (search) {
      conditions.push(`(p.title ILIKE $${idx} OR p.body_markdown ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'top' ? 'p.score DESC, p.created_at DESC' : 'p.created_at DESC';

    const sql = `
      SELECT p.*,
             u.username AS author_username,
             u.avatar_url AS author_avatar,
             u.reputation AS author_reputation,
             g.name AS group_name,
             s.name AS server_name,
             s.monogram AS server_monogram,
             COUNT(c.id)::int AS comment_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN groups g ON p.group_id = g.id
      JOIN servers s ON g.server_id = s.id
      LEFT JOIN comments c ON p.id = c.post_id
      ${whereClause}
      GROUP BY p.id, u.id, g.id, s.id
      ORDER BY ${orderBy}
      LIMIT 50
    `;

    const result = await query(sql, values);
    return res.status(200).json({ success: true, posts: result.rows });
  } catch (error) {
    console.error('Get Feed Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching posts feed.' });
  }
};

// 2. GET SINGLE POST + ALL ITS ANSWERS/COMMENTS (GET /api/posts/:postId)
export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const postRes = await query(
      `SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar, u.reputation AS author_reputation, g.name AS group_name
       FROM posts p
       JOIN users u ON p.author_id = u.id
       JOIN groups g ON p.group_id = g.id
       WHERE p.id = $1`,
      [postId]
    );

    if (postRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Order comments so the Accepted Answer appears at the very top, followed by highest score!
    const commentsRes = await query(
      `SELECT c.*, u.username AS author_username, u.avatar_url AS author_avatar, u.reputation AS author_reputation
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.post_id = $1
       ORDER BY (c.id = $2) DESC, c.score DESC, c.created_at ASC`,
      [postId, postRes.rows[0].accepted_comment_id || -1]
    );

    return res.status(200).json({
      success: true,
      post: postRes.rows[0],
      comments: commentsRes.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching post details.' });
  }
};

// 3. CREATE POST (POST /api/posts)
export const createPost = async (req, res) => {
  try {
    const { group_id, title, body_markdown, tags = [] } = postSchema.parse(req.body);
    const normalizedTags = tags.map((t) => t.toLowerCase().trim());

    const result = await query(
      `INSERT INTO posts (group_id, author_id, title, body_markdown, tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [group_id, req.user.id, title, body_markdown, normalizedTags]
    );

    return res.status(201).json({ success: true, post: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error creating post.' });
  }
};

// 4. EDIT POST (PUT /api/posts/:postId) -> Enforces Ownership Access Control!
export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, body_markdown, tags } = updatePostSchema.parse(req.body);

    const existing = await query('SELECT author_id FROM posts WHERE id = $1', [postId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Strict Access Control check required by PS 06
    if (existing.rows[0].author_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit your own posts.',
      });
    }

    const updated = await query(
      `UPDATE posts
       SET title = COALESCE($1, title),
           body_markdown = COALESCE($2, body_markdown),
           tags = COALESCE($3, tags),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [title ?? null, body_markdown ?? null, tags ? tags.map((t) => t.toLowerCase().trim()) : null, postId]
    );

    return res.status(200).json({ success: true, post: updated.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error updating post.' });
  }
};

// 5. DELETE POST (DELETE /api/posts/:postId) -> Enforces Ownership Access Control!
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const existing = await query('SELECT author_id FROM posts WHERE id = $1', [postId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    if (existing.rows[0].author_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete your own posts.',
      });
    }

    await query('DELETE FROM posts WHERE id = $1', [postId]);
    return res.status(200).json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error deleting post.' });
  }
};

// 6. ADD COMMENT / ANSWER TO A POST (POST /api/posts/:postId/comments)
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { body_markdown } = commentSchema.parse(req.body);

    const postRes = await query('SELECT author_id, title, group_id FROM posts WHERE id = $1', [postId]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const result = await query(
      `INSERT INTO comments (post_id, author_id, body_markdown)
       VALUES ($1, $2, $3) RETURNING *`,
      [postId, req.user.id, body_markdown]
    );

    // Save Notification in MongoDB if someone else replied to the author's post
    const post = postRes.rows[0];
    if (post.author_id !== req.user.id) {
      await notify({
        recipientUserId: post.author_id,
        actorUsername: req.user.username,
        type: 'COMMENT_ADDED',
        message: `@${req.user.username} answered your post "${post.title.slice(0, 40)}..."`,
        postId: Number(postId),
        groupId: post.group_id,
      });
    }

    return res.status(201).json({
      success: true,
      comment: {
        ...result.rows[0],
        author_username: req.user.username,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error adding answer/comment.' });
  }
};

// 7. MARK AN ACCEPTED ANSWER (PATCH /api/posts/:postId/accept/:commentId)
export const markAcceptedAnswer = async (req, res) => {
  const client = await pool.connect();
  try {
    const { postId, commentId } = req.params;

    await client.query('BEGIN');

    const postRes = await client.query('SELECT author_id, title, accepted_comment_id FROM posts WHERE id = $1', [postId]);
    if (postRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const post = postRes.rows[0];
    if (post.author_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Only the author of the question can mark an accepted answer.',
      });
    }

    const commentRes = await client.query('SELECT author_id FROM comments WHERE id = $1 AND post_id = $2', [commentId, postId]);
    if (commentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Comment not found on this post.' });
    }

    // Update post's accepted_comment_id
    await client.query('UPDATE posts SET accepted_comment_id = $1 WHERE id = $2', [commentId, postId]);

    // Award +15 Reputation points to the helpful developer!
    const commentAuthorId = commentRes.rows[0].author_id;
    if (commentAuthorId !== req.user.id) {
      await client.query('UPDATE users SET reputation = reputation + 15 WHERE id = $1', [commentAuthorId]);

      await notify({
        recipientUserId: commentAuthorId,
        actorUsername: req.user.username,
        type: 'ANSWER_ACCEPTED',
        message: `@${req.user.username} marked your answer as Accepted (+15 Rep)!`,
        postId: Number(postId),
      });
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, accepted_comment_id: Number(commentId) });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, message: 'Error accepting answer.' });
  } finally {
    client.release();
  }
};

// 8. ATOMIC UPVOTE / DOWNVOTE ENGINE (POST /api/posts/vote)
export const castVote = async (req, res) => {
  const client = await pool.connect();
  try {
    const { target_type, target_id, vote_value } = voteSchema.parse(req.body);
    const table = target_type === 'POST' ? 'posts' : 'comments';

    await client.query('BEGIN');

    // Lock the target row first. This rejects votes on things that do not exist
    // and serialises concurrent votes on the same item.
    const targetRes = await client.query(
      `SELECT id, author_id FROM ${table} WHERE id = $1 FOR UPDATE`,
      [target_id]
    );
    if (targetRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'That post or answer no longer exists.' });
    }
    const authorId = targetRes.rows[0].author_id;

    const existingVoteRes = await client.query(
      'SELECT id, vote_value FROM votes WHERE user_id = $1 AND target_type = $2 AND target_id = $3',
      [req.user.id, target_type, target_id]
    );

    const previousValue = existingVoteRes.rows[0]?.vote_value ?? 0;
    let nextValue;

    if (previousValue === 0) {
      // Brand new vote
      await client.query(
        'INSERT INTO votes (user_id, target_type, target_id, vote_value) VALUES ($1, $2, $3, $4)',
        [req.user.id, target_type, target_id, vote_value]
      );
      nextValue = vote_value;
    } else if (previousValue === vote_value) {
      // Clicking the same button again removes the vote
      await client.query('DELETE FROM votes WHERE id = $1', [existingVoteRes.rows[0].id]);
      nextValue = 0;
    } else {
      // Switching direction
      await client.query('UPDATE votes SET vote_value = $1 WHERE id = $2', [vote_value, existingVoteRes.rows[0].id]);
      nextValue = vote_value;
    }

    const scoreDelta = nextValue - previousValue;

    const updated = await client.query(
      `UPDATE ${table} SET score = score + $1 WHERE id = $2 RETURNING score`,
      [scoreDelta, target_id]
    );

    // Reputation follows the vote's state, not the direction of the last click:
    // moving from "up" to "none" takes back the +5, so up/undo cycles can never farm points.
    if (authorId !== req.user.id) {
      const repChange = repForVote(nextValue) - repForVote(previousValue);
      if (repChange !== 0) {
        await client.query('UPDATE users SET reputation = reputation + $1 WHERE id = $2', [repChange, authorId]);
      }
    }

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      newScore: updated.rows[0].score,
      scoreDelta,
      myVote: nextValue,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Vote Error:', error);
    return res.status(500).json({ success: false, message: 'Error processing vote.' });
  } finally {
    client.release();
  }
};
