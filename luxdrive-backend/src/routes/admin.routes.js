/**
 * ════════════════════════════════════════════════════════════
 * Admin Routes — /api/admin/*
 * ════════════════════════════════════════════════════════════
 *
 * Bütün endpoint-lər `authenticate` + `requireRole('admin')` ilə qorunur.
 */
import express from 'express';
import { body, param } from 'express-validator';
import * as adminCtrl from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Bütün admin route-larını qoru
router.use(authenticate, requireRole('admin'));

// ── Statistika ────────────────────────────────────────────
router.get('/stats', asyncHandler(adminCtrl.getStats));

// ── İstifadəçilər ─────────────────────────────────────────
router.get('/users', asyncHandler(adminCtrl.listUsers));

router.put('/users/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('phone').optional().matches(/^\+?[0-9\s-]{7,20}$/),
    validate,
  ],
  asyncHandler(adminCtrl.updateUser)
);

router.patch('/users/:id/block',
  [
    param('id').isUUID(),
    body('blocked').isBoolean(),
    validate,
  ],
  asyncHandler(adminCtrl.setUserBlocked)
);

router.delete('/users/:id',
  [param('id').isUUID(), validate],
  asyncHandler(adminCtrl.deleteUser)
);

// ── Promo kodları ─────────────────────────────────────────
router.get('/promo-codes', asyncHandler(adminCtrl.listPromoCodes));

router.post('/promo-codes',
  [
    body('code').trim().isLength({ min: 3, max: 40 }),
    body('discountPct').isInt({ min: 1, max: 100 }),
    body('validFrom').optional().isISO8601(),
    body('validUntil').optional().isISO8601(),
    body('maxUses').optional().isInt({ min: 1 }),
    validate,
  ],
  asyncHandler(adminCtrl.createPromoCode)
);

router.patch('/promo-codes/:id/toggle',
  [param('id').isUUID(), validate],
  asyncHandler(adminCtrl.togglePromoCode)
);

router.delete('/promo-codes/:id',
  [param('id').isUUID(), validate],
  asyncHandler(adminCtrl.deletePromoCode)
);

export default router;
