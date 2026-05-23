/**
 * ════════════════════════════════════════════════════════════
 * Global Error Handler
 * ════════════════════════════════════════════════════════════
 *
 * Express-də 4 parametrli middleware avtomatik error handler-ə çevrilir.
 * Bütün route-lardan sonra app.use(errorHandler) çağırılmalıdır.
 *
 * Production-da stack trace gizlədilir, development-də göstərilir.
 */

/**
 * Custom HTTP xəta sinfi — controller-lərdə `throw new HttpError(...)` ilə istifadə
 */
export class HttpError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Mərkəzi error handler
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Loqlama (production-da pino/winston-a göndərilə bilər)
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // PostgreSQL spesifik xətalar
  if (err.code === '23505') { // unique_violation
    return res.status(409).json({
      error: 'DUPLICATE',
      message: 'Bu dəyər artıq mövcuddur',
      detail: err.detail,
    });
  }
  if (err.code === '23503') { // foreign_key_violation
    return res.status(400).json({
      error: 'FK_VIOLATION',
      message: 'Əlaqəli resurs tapılmadı',
    });
  }
  if (err.code === '23P01') { // exclusion_violation — tarix konflikti
    return res.status(409).json({
      error: 'DATE_CONFLICT',
      message: 'Bu tarix aralığında avtomobil artıq rezerv edilib',
    });
  }
  if (err.code === '23514') { // check_violation (məs. 18+ yaş)
    return res.status(400).json({
      error: 'CHECK_VIOLATION',
      message: 'Daxil edilən məlumat tələblərə uyğun deyil',
      detail: err.detail,
    });
  }

  // Bizim öz HttpError-larımız
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // JSON parse xətası
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'JSON formatı yanlışdır',
    });
  }

  // Default — 500
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Server xətası baş verdi',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 404 handler — bütün route-lardan sonra
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Endpoint tapılmadı: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Async route-lar üçün wrapper — try/catch yazmamaq üçün
 *
 * İstifadə: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
