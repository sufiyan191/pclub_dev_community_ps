import express from 'express';
import {
  getPostsFeed,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  addComment,
  markAcceptedAnswer,
  castVote,
} from '../controllers/postController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getPostsFeed);
router.get('/:postId', getPostById);
router.post('/', requireAuth, createPost);
router.put('/:postId', requireAuth, updatePost);
router.delete('/:postId', requireAuth, deletePost);
router.post('/:postId/comments', requireAuth, addComment);
router.patch('/:postId/accept/:commentId', requireAuth, markAcceptedAnswer);
router.post('/vote', requireAuth, castVote);

export default router;