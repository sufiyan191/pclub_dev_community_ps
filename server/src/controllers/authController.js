import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../config/postgres.js';

// Input Validation Schemas using Zod
const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  bio: z.string().max(300).optional(),
  skills: z.array(z.string()).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Helper to generate JWT and set HttpOnly Cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true, // Prevents client-side JS from reading cookie (XSS protection)
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      bio: user.bio,
      skills: user.skills,
      reputation: user.reputation,
      role: user.role,
      created_at: user.created_at,
    },
  });
};

// 1. REGISTER USER (POST /api/auth/register)
export const registerUser = async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { username, email, password, bio = '', skills = [] } = validatedData;

    // Check if username or email is already taken
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username or email is already registered.',
      });
    }

    // Hash password with salt rounds = 10
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user and return row immediately using RETURNING
    const result = await query(
      `INSERT INTO users (username, email, password_hash, bio, skills)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, avatar_url, bio, skills, reputation, role, created_at`,
      [username, email, passwordHash, bio, skills]
    );

    return sendTokenResponse(result.rows[0], 201, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Register Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// 2. LOGIN USER (POST /api/auth/login)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Generic error message prevents user enumeration attacks
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    return sendTokenResponse(user, 200, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// 3. LOGOUT USER (POST /api/auth/logout)
export const logoutUser = (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// 4. GET CURRENT LOGGED-IN USER (GET /api/auth/me)
export const getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, avatar_url, bio, skills, reputation, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching current user.' });
  }
};

// 5. GET USER PROFILE & ACTIVITY BY USERNAME (GET /api/auth/profile/:username)
export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const userRes = await query(
      'SELECT id, username, avatar_url, bio, skills, reputation, role, created_at FROM users WHERE username = $1',
      [username]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRes.rows[0];

    // Fetch user's recent posts and comments for the Profile Activity requirement
    const postsRes = await query(
      `SELECT p.id, p.title, p.score, p.tags, p.created_at, g.name AS group_name
       FROM posts p
       JOIN groups g ON p.group_id = g.id
       WHERE p.author_id = $1
       ORDER BY p.created_at DESC LIMIT 10`,
      [user.id]
    );

    const commentsRes = await query(
      `SELECT c.id, c.body_markdown, c.score, c.created_at, p.id AS post_id, p.title AS post_title
       FROM comments c
       JOIN posts p ON c.post_id = p.id
       WHERE c.author_id = $1
       ORDER BY c.created_at DESC LIMIT 10`,
      [user.id]
    );

    return res.status(200).json({
      success: true,
      profile: {
        ...user,
        recent_posts: postsRes.rows,
        recent_comments: commentsRes.rows,
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
};

// 6. UPDATE OWN PROFILE (PUT /api/auth/profile)
export const updateProfile = async (req, res) => {
  try {
    const updateSchema = z.object({
      bio: z.string().max(300).optional(),
      skills: z.array(z.string()).optional(),
      avatar_url: z.string().url().or(z.literal('')).optional(),
    });

    const { bio, skills, avatar_url } = updateSchema.parse(req.body);

    const result = await query(
      `UPDATE users
       SET bio = COALESCE($1, bio),
           skills = COALESCE($2, skills),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4
       RETURNING id, username, email, avatar_url, bio, skills, reputation, role, created_at`,
      [bio ?? null, skills ?? null, avatar_url ?? null, req.user.id]
    );

    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
};