/**
 * ════════════════════════════════════════════════════════════
 * Notifications Routes — /api/notifications/*
 * ════════════════════════════════════════════════════════════
 */
import express from 'express';
import { param } from 'express-validator';
import * as notifCtrl from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(notifCtrl.list));
router.get('/unread-count', asyncHandler(notifCtrl.getUnreadCount));

router.patch('/read-all', asyncHandler(notifCtrl.markAllRead));

router.patch('/:id/read',
  [param('id').isUUID(), validate],
  asyncHandler(notifCtrl.markRead)
);

router.delete('/:id',
  [param('id').isUUID(), validate],
  asyncHandler(notifCtrl.remove)
);

export default router;
