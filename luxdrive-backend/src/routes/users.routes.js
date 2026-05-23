/**
 * ════════════════════════════════════════════════════════════
 * Users Routes — /api/users/*
 * ════════════════════════════════════════════════════════════
 */
import express from 'express';
import { body } from 'express-validator';
import * as usersCtrl from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadAvatar, processAvatar } from '../middleware/upload.js';

const router = express.Router();

// Bütün user route-ları autentifikasiya tələb edir
router.use(authenticate);

// ── Profil oxu ────────────────────────────────────────────
router.get('/profile', asyncHandler(usersCtrl.getProfile));

// ── Profil yenilə ─────────────────────────────────────────
router.put('/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 120 }),
    body('phone').optional().matches(/^\+?[0-9\s-]{7,20}$/),
    validate,
  ],
  asyncHandler(usersCtrl.updateProfile)
);

// ── Şifrə dəyiş ───────────────────────────────────────────
router.put('/password',
  [
    body('oldPassword').notEmpty().withMessage('Köhnə şifrə tələb olunur'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Yeni şifrə minimum 8 simvol')
      .matches(/[A-Z]/).withMessage('Ən azı 1 böyük hərf')
      .matches(/[0-9]/).withMessage('Ən azı 1 rəqəm'),
    validate,
  ],
  asyncHandler(usersCtrl.changePassword)
);

// ── Avatar yüklə ──────────────────────────────────────────
// Pipeline: multer (multipart parse) → sharp (resize+webp) → controller
router.post('/avatar',
  uploadAvatar,            // multer single('avatar')
  processAvatar,           // sharp emal
  asyncHandler(usersCtrl.uploadAvatar)
);

// ── Hesabı sil ────────────────────────────────────────────
router.delete('/profile', asyncHandler(usersCtrl.deleteOwnAccount));

export default router;
