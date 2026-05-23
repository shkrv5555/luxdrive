/**
 * ════════════════════════════════════════════════════════════
 * Pages Routes — /api/pages/* (public read)
 * ════════════════════════════════════════════════════════════
 */
import express from 'express';
import { param } from 'express-validator';
import * as pagesCtrl from '../controllers/pages.controller.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.get('/:slug',
  [
    param('slug').isAlphanumeric().isLength({ min: 2, max: 50 }),
    validate,
  ],
  asyncHandler(pagesCtrl.getPage)
);

export default router;
