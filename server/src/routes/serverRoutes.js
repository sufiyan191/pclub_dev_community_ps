import express from 'express';
import {
  createServer,
  getServers,
  joinServer,
  getServerGroups,
  createGroup,
  getGroupChatHistory,
  globalOmniSearch,
  getNotifications,
  markNotificationsRead,
} from '../controllers/serverController.js';
import { requireAuth, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Fixed paths come first so they can never be swallowed by a parameterised route.
router.get('/search', globalOmniSearch);
router.get('/notifications', requireAuth, getNotifications);
router.post('/notifications/read', requireAuth, markNotificationsRead);
router.get('/groups/:groupId/chat', getGroupChatHistory);

router.get('/', optionalAuth, getServers);
router.post('/', requireAuth, createServer);
router.post('/:serverId/join', requireAuth, joinServer);
router.get('/:serverId/groups', getServerGroups);
router.post('/:serverId/groups', requireAuth, createGroup);

export default router;
