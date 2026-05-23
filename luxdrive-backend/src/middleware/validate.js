/**
 * ════════════════════════════════════════════════════════════
 * Validation Middleware
 * ════════════════════════════════════════════════════════════
 *
 * express-validator ilə inteqrasiya.
 * Route-larda istifadə nümunəsi:
 *
 *   import { body } from 'express-validator';
 *   import { validate } from '../middleware/validate.js';
 *
 *   router.post('/login', [
 *     body('email').isEmail().normalizeEmail(),
 *     body('password').isLength({ min: 8 }),
 *     validate
 *   ], loginController);
 */
import { validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

/**
 * Validasiya nəticələrini yoxla — uğursuzdursa 400 qaytar
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Frontend üçün dostane format: { field: 'message' }
  const formatted = {};
  errors.array().forEach((err) => {
    formatted[err.path || err.param] = err.msg;
  });

  return res.status(422).json({
    error: 'VALIDATION_FAILED',
    message: 'Daxil edilən məlumatlar yanlışdır',
    fields: formatted,
  });
}

// ════════════════════════════════════════════════════════════
// RATE LIMITERS
// ════════════════════════════════════════════════════════════

/**
 * Ümumi rate limiter — bütün API üçün
 * 15 dəqiqədə 100 sorğu
 */
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Çox sayda sorğu. Bir az gözləyin.',
  },
});

/**
 * Auth endpoint-ləri üçün daha sıx limiter
 * Brute-force hücumların qarşısını alır
 * 15 dəqiqədə 10 cəhd
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // uğurlu girişlər limitə daxil deyil
  message: {
    error: 'TOO_MANY_ATTEMPTS',
    message: 'Çox sayda uğursuz cəhd. 15 dəqiqədən sonra yenidən cəhd edin.',
  },
});
