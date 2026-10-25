import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  getUserProfile,
  updateProfile,
} from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', requireAuth, getMe);
router.get('/profile/:username', getUserProfile);
router.put('/profile', requireAuth, updateProfile);

export default router;