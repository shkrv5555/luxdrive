/**
 * ════════════════════════════════════════════════════════════
 * Cars Routes — /api/cars/*
 * ════════════════════════════════════════════════════════════
 */
import express from 'express';
import { body, param } from 'express-validator';
import * as carsCtrl from '../controllers/cars.controller.js';
import { authenticate, requireRole, requireOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as Car from '../models/Car.js';

const router = express.Router();

// Car sahibi yoxlaması üçün loader
const carOwnerLoader = (req) => Car.getOwner(req.params.id);

// ── PUBLIC: Siyahı və detal ────────────────────────────────
router.get('/', asyncHandler(carsCtrl.list));

router.get('/:id',
  [param('id').isUUID().withMessage('Yanlış ID formatı'), validate],
  asyncHandler(carsCtrl.get)
);

router.get('/:id/availability',
  [param('id').isUUID(), validate],
  asyncHandler(carsCtrl.checkAvailability)
);

// ── PROTECTED: Avtomobil yaratmaq (yalnız renter/admin) ────
const carBodyValidation = [
  body('brand').trim().isLength({ min: 2, max: 60 }).withMessage('Marka 2–60 simvol'),
  body('model').trim().isLength({ min: 1, max: 80 }).withMessage('Model tələb olunur'),
  body('year').isInt({ min: 1980, max: new Date().getFullYear() + 1 })
    .withMessage('Düzgün il daxil edin'),
  body('pricePerDay').isFloat({ min: 1 }).withMessage('Qiymət müsbət olmalıdır'),
  body('category').isIn(['economy', 'business', 'luxury', 'suv', 'sport'])
    .withMessage('Yanlış kateqoriya'),
  body('transmission').isIn(['auto', 'manual']).withMessage('auto/manual'),
  body('fuel').isIn(['petrol', 'diesel', 'hybrid', 'electric']).withMessage('Yanlış yanacaq'),
  body('seats').optional().isInt({ min: 1, max: 12 }),
  body('description').optional().isLength({ max: 2000 }),
  body('imageUrl').optional().isURL().withMessage('Düzgün URL daxil edin'),
];

router.post('/',
  authenticate,
  requireRole('renter', 'admin'),
  carBodyValidation,
  validate,
  asyncHandler(carsCtrl.create)
);

// ── PROTECTED: Redaktə (yalnız sahibi və ya admin) ─────────
router.put('/:id',
  authenticate,
  [param('id').isUUID(), validate],
  requireOwnership(carOwnerLoader),
  carBodyValidation.map(v => v.optional()), // PUT-da bütün sahələr opsional
  validate,
  asyncHandler(carsCtrl.update)
);

// ── PROTECTED: Mövcudluq statusu ───────────────────────────
router.patch('/:id/availability',
  authenticate,
  [
    param('id').isUUID(),
    body('isAvailable').isBoolean().withMessage('isAvailable boolean olmalıdır'),
    validate,
  ],
  requireOwnership(carOwnerLoader),
  asyncHandler(carsCtrl.setAvailability)
);

// ── PROTECTED: Silmə (yalnız sahibi və ya admin) ───────────
router.delete('/:id',
  authenticate,
  [param('id').isUUID(), validate],
  requireOwnership(carOwnerLoader),
  asyncHandler(carsCtrl.remove)
);

export default router;
