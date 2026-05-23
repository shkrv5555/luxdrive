/**
 * ════════════════════════════════════════════════════════════
 * Auth Routes — /api/auth/*
 * ════════════════════════════════════════════════════════════
 *
 * Bütün autentifikasiya endpoint-ləri burada toplanır.
 * Validasiya inline body() ilə, mütəxəssis rate-limit ayrıca.
 */
import express from 'express';
import { body } from 'express-validator';
import * as authCtrl from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate, authLimiter } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// ── QEYDIYYAT ──────────────────────────────────────────────
router.post('/register',
  authLimiter,
  [
    body('email')
      .isEmail().withMessage('Düzgün e-mail daxil edin')
      .normalizeEmail()
      .isLength({ max: 255 }),
    body('password')
      .isLength({ min: 8 }).withMessage('Şifrə minimum 8 simvol olmalıdır')
      .matches(/[A-Z]/).withMessage('Şifrədə ən azı 1 böyük hərf olmalıdır')
      .matches(/[0-9]/).withMessage('Şifrədə ən azı 1 rəqəm olmalıdır'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 120 }).withMessage('Ad 2–120 simvol arası olmalıdır'),
    body('phone')
      .optional()
      .matches(/^\+?[0-9\s-]{7,20}$/).withMessage('Düzgün telefon nömrəsi'),
    body('dateOfBirth')
      .isISO8601().withMessage('Düzgün tarix daxil edin (YYYY-MM-DD)'),
    body('role')
      .optional()
      .isIn(['customer', 'renter']).withMessage('Rol yalnız müştəri/icarəçi ola bilər'),
    validate,
  ],
  asyncHandler(authCtrl.register)
);

// ── GİRİŞ ──────────────────────────────────────────────────
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Şifrə tələb olunur'),
    validate,
  ],
  asyncHandler(authCtrl.login)
);

// ── ADMIN GİRİŞİ ───────────────────────────────────────────
router.post('/admin-login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
  ],
  asyncHandler(authCtrl.adminLogin)
);

// ── REFRESH TOKEN ──────────────────────────────────────────
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token tələb olunur'),
    validate,
  ],
  asyncHandler(authCtrl.refresh)
);

// ── ÇIXIŞ ──────────────────────────────────────────────────
router.post('/logout', asyncHandler(authCtrl.logout));

// ── CARI İSTİFADƏÇİ ────────────────────────────────────────
router.get('/me', authenticate, asyncHandler(authCtrl.me));

export default router;
