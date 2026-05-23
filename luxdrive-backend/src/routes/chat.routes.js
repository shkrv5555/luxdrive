/**
 * ════════════════════════════════════════════════════════════
 * Chat Routes — /api/chat/*
 * ════════════════════════════════════════════════════════════
 *
 * QEYD: Mesaj GÖNDƏRMƏ Socket.io ilə həll olunur.
 * Bu route-lar yalnız oxuma və tarixçə üçündür.
 */
import express from 'express';
import { param } from 'express-validator';
import * as chatCtrl from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.use(authenticate);

router.get('/conversations', asyncHandler(chatCtrl.listConversations));

router.get('/unread-count', asyncHandler(chatCtrl.unreadCount));

router.get('/messages/:userId',
  [param('userId').isUUID(), validate],
  asyncHandler(chatCtrl.getMessages)
);

export default router;
