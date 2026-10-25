import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectPostgres, query } from './config/postgres.js';
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

// WebSocket Real-Time Event Handling (Right Spatial Panel Group Chat)
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // When a user clicks a Group, their browser joins that Group's real-time room
  socket.on('join_group', (groupId) => {
    const roomName = `group_${groupId}`;
    socket.join(roomName);
  });

  // When a user sends a chat message inside a Group's Right Spatial Panel
  socket.on('send_group_message', async (payload) => {
    try {
      const { groupId, senderId, senderUsername, content, codeSnippet = '' } = payload;
      const savedMsg = await GroupMessage.create({
        groupId: Number(groupId),
        senderId: Number(senderId),
        senderUsername,
        content,
        codeSnippet,
      });

      // Broadcast message immediately to everyone viewing that Group
      io.to(`group_${groupId}`).emit('new_group_message', savedMsg);
    } catch (err) {
      console.error('Socket Message Error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
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