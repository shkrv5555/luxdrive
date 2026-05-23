/**
 * ════════════════════════════════════════════════════════════
 * Favorites Routes — /api/favorites/*
 * ════════════════════════════════════════════════════════════
 */
import express from 'express';
import { param } from 'express-validator';
import * as favCtrl from '../controllers/favorites.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.use(authenticate);

router.get('/',     asyncHandler(favCtrl.list));
router.get('/ids',  asyncHandler(favCtrl.listIds));

router.post('/:carId',
  [param('carId').isUUID(), validate],
  asyncHandler(favCtrl.add)
);

router.post('/:carId/toggle',
  [param('carId').isUUID(), validate],
  asyncHandler(favCtrl.toggle)
);

router.delete('/:carId',
  [param('carId').isUUID(), validate],
  asyncHandler(favCtrl.remove)
);

export default router;
