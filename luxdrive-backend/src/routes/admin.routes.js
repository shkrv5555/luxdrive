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
import * as pagesCtrl from '../controllers/pages.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// UUID-like format check (sıfır-UUID-lər də qəbul edir — seed data üçün)
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bütün admin route-larını qoru
router.use(authenticate, requireRole('admin'));

// ── Statistika ────────────────────────────────────────────
router.get('/stats', asyncHandler(adminCtrl.getStats));

// ── İstifadəçilər ─────────────────────────────────────────
router.get('/users', asyncHandler(adminCtrl.listUsers));

router.put('/users/:id',
  [
    param('id').matches(UUID_LIKE).withMessage('Yanlış ID formatı'),
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('phone').optional().matches(/^\+?[0-9\s-]{7,20}$/),
    validate,
  ],
  asyncHandler(adminCtrl.updateUser)
);

router.patch('/users/:id/block',
  [
    param('id').matches(UUID_LIKE).withMessage('Yanlış ID formatı'),
    body('blocked').isBoolean(),
    validate,
  ],
  asyncHandler(adminCtrl.setUserBlocked)
);

router.delete('/users/:id',
  [param('id').matches(UUID_LIKE).withMessage('Yanlış ID formatı'), validate],
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
  [param('id').matches(UUID_LIKE).withMessage('Yanlış ID formatı'), validate],
  asyncHandler(adminCtrl.togglePromoCode)
);

router.delete('/promo-codes/:id',
  [param('id').matches(UUID_LIKE).withMessage('Yanlış ID formatı'), validate],
  asyncHandler(adminCtrl.deletePromoCode)
);

// ── Sayt səhifələri (About, Contact, ...) ─────────────────
// GET /admin/pages — bütün səhifələrin siyahısı
router.get('/pages', asyncHandler(pagesCtrl.listPagesAdmin));

// PUT /admin/pages/:slug — səhifə məzmununu yenilə
router.put('/pages/:slug',
  [
    param('slug').isAlphanumeric().isLength({ min: 2, max: 50 }),
    body('title').trim().isLength({ min: 2, max: 200 })
      .withMessage('Başlıq 2–200 simvol arasında olmalıdır'),
    body('content').isLength({ min: 1, max: 50000 })
      .withMessage('Məzmun boş ola bilməz'),
    body('meta').optional().isObject(),
    validate,
  ],
  asyncHandler(pagesCtrl.updatePageAdmin)
);

export default router;
