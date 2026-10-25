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
} from '../controllers/serverController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getServers);
router.post('/', requireAuth, createServer);
router.post('/:serverId/join', requireAuth, joinServer);
router.get('/:serverId/groups', getServerGroups);
router.post('/:serverId/groups', requireAuth, createGroup);
router.get('/groups/:groupId/chat', getGroupChatHistory);
router.get('/search', globalOmniSearch);
router.get('/notifications', requireAuth, getNotifications);

export default router;