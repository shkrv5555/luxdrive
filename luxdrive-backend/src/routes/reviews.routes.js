/**
 * ════════════════════════════════════════════════════════════
 * Reviews Routes — /api/reviews/*
 * ════════════════════════════════════════════════════════════
 */
import express from 'express';
import { body, param } from 'express-validator';
import * as reviewCtrl from '../controllers/reviews.controller.js';
import { authenticate, requireRole, requireOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as Review from '../models/Review.js';

const router = express.Router();

// Sahibi yoxlaması üçün loader
const reviewOwnerLoader = (req) => Review.getOwner(req.params.id);

// ── PUBLIC: Avtomobil rəyləri ─────────────────────────────
router.get('/car/:carId',
  [param('carId').isUUID(), validate],
  asyncHandler(reviewCtrl.listByCar)
);

// ── PROTECTED: Mənim rəylərim ─────────────────────────────
router.get('/my', authenticate, asyncHandler(reviewCtrl.myReviews));

// ── PROTECTED: Rəy yaz ────────────────────────────────────
router.post('/',
  authenticate,
  [
    body('carId').isUUID().withMessage('Yanlış avtomobil ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Reytinq 1–5 olmalıdır'),
    body('comment').trim().isLength({ min: 10, max: 1000 })
      .withMessage('Şərh 10–1000 simvol arasında olmalıdır'),
    validate,
  ],
  asyncHandler(reviewCtrl.create)
);

// ── PROTECTED: Sil ────────────────────────────────────────
router.delete('/:id',
  authenticate,
  [param('id').isUUID(), validate],
  requireOwnership(reviewOwnerLoader),
  asyncHandler(reviewCtrl.remove)
);

// ── ADMIN: Bütün rəylər ───────────────────────────────────
router.get('/admin/all',
  authenticate,
  requireRole('admin'),
  asyncHandler(reviewCtrl.adminListAll)
);

export default router;
