/**
 * ════════════════════════════════════════════════════════════
 * Bookings Routes — /api/bookings/*
 * ════════════════════════════════════════════════════════════
 */
import express from 'express';
import { body, param } from 'express-validator';
import * as bookCtrl from '../controllers/bookings.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Bütün booking route-ları autentifikasiya tələb edir
router.use(authenticate);

// ── Yeni rezervasiya ──────────────────────────────────────
router.post('/',
  [
    body('carId').isUUID().withMessage('Yanlış avtomobil ID'),
    body('startDate').isISO8601().withMessage('Düzgün başlama tarixi'),
    body('endDate').isISO8601().withMessage('Düzgün bitmə tarixi'),
    body('promoCode').optional().isLength({ max: 40 }),
    validate,
  ],
  asyncHandler(bookCtrl.create)
);

// ── Mənim rezervasiyalarım (müştəri) ──────────────────────
router.get('/my', asyncHandler(bookCtrl.myBookings));

// ── Mənə gələn (icarəçi) ──────────────────────────────────
router.get('/renter/incoming',
  requireRole('renter', 'admin'),
  asyncHandler(bookCtrl.incomingBookings)
);

// ── Bütün rezervasiyalar (admin) ──────────────────────────
router.get('/admin/all',
  requireRole('admin'),
  asyncHandler(bookCtrl.adminListAll)
);

// ── Tək rezervasiya detalı ────────────────────────────────
router.get('/:id',
  [param('id').isUUID(), validate],
  asyncHandler(bookCtrl.get)
);

// ── Ləğv et ───────────────────────────────────────────────
router.patch('/:id/cancel',
  [param('id').isUUID(), validate],
  asyncHandler(bookCtrl.cancel)
);

export default router;
