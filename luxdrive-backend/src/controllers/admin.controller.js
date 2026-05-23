/**
 * ════════════════════════════════════════════════════════════
 * Admin Controller
 * ════════════════════════════════════════════════════════════
 *
 * Yalnız role='admin' üçün endpoint-lər.
 * Müştərilərin, icarəçilərin və avtomobillərin kütləvi idarəetməsi.
 */
import * as User from '../models/User.js';
import * as Car from '../models/Car.js';
import * as Booking from '../models/Booking.js';
import * as Review from '../models/Review.js';
import { query } from '../config/database.js';
import { revokeAllUserTokens } from '../utils/jwt.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * GET /api/admin/stats
 * Ümumi sistem statistikası — dashboard üçün
 */
export async function getStats(req, res) {
  // Paralel sorğular — daha sürətli cavab
  const [userStats, bookingStats, carCategoryStats, monthlyStats] = await Promise.all([
    User.getStats(),
    Booking.getStats(),
    Car.getCategoryStats(),
    Booking.getMonthlyStats(6),
  ]);

  // Avtomobil sayı
  const carCountRes = await query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_available = TRUE) AS available,
      COUNT(*) FILTER (WHERE is_available = FALSE) AS rented
    FROM cars
  `);
  const carCount = carCountRes.rows[0];

  // Rəy sayı
  const reviewCountRes = await query('SELECT COUNT(*) AS total FROM reviews');

  res.json({
    users: userStats,
    cars: carCount,
    bookings: bookingStats,
    reviews: { total: parseInt(reviewCountRes.rows[0].total) },
    categories: carCategoryStats,
    monthlyBookings: monthlyStats,
  });
}

/**
 * GET /api/admin/users
 * Bütün istifadəçilər — filter + pagination
 */
export async function listUsers(req, res) {
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const { role, search, blocked } = req.query;

  const result = await User.findAll({
    role,
    search,
    blocked: blocked === 'true' ? true : blocked === 'false' ? false : undefined,
    limit,
    offset,
  });
  res.json(result);
}

/**
 * PUT /api/admin/users/:id
 * Admin istifadəçi məlumatlarını dəyişə bilər
 */
export async function updateUser(req, res) {
  const { name, phone } = req.body;
  const updated = await User.updateProfile(req.params.id, { name, phone });
  if (!updated) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'İstifadəçi tapılmadı');
  }
  res.json({ message: 'İstifadəçi yeniləndi', user: updated });
}

/**
 * PATCH /api/admin/users/:id/block
 * Body: { blocked: true|false }
 *
 * Bloklanan istifadəçinin bütün refresh token-ları ləğv olunur
 */
export async function setUserBlocked(req, res) {
  const { blocked } = req.body;
  const userId = req.params.id;

  // Admin özünü bloklaya bilməz
  if (userId === req.user.id) {
    throw new HttpError(400, 'CANNOT_BLOCK_SELF', 'Özünüzü bloklaya bilməzsiniz');
  }

  const updated = await User.setBlocked(userId, blocked);
  if (!updated) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'İstifadəçi tapılmadı');
  }

  // Bloklananda bütün cihazlardan çıxar
  if (blocked) {
    await revokeAllUserTokens(userId);
  }

  res.json({
    message: blocked ? 'İstifadəçi bloklandı' : 'Blok açıldı',
    user: updated,
  });
}

/**
 * DELETE /api/admin/users/:id
 */
export async function deleteUser(req, res) {
  const userId = req.params.id;
  if (userId === req.user.id) {
    throw new HttpError(400, 'CANNOT_DELETE_SELF', 'Özünüzü silə bilməzsiniz');
  }
  await User.deleteUser(userId);
  res.json({ message: 'İstifadəçi silindi' });
}

/**
 * GET /api/admin/promo-codes
 * Endirim kodlarının siyahısı
 */
export async function listPromoCodes(req, res) {
  const { rows } = await query(`
    SELECT * FROM promo_codes ORDER BY created_at DESC
  `);
  res.json({ codes: rows });
}

/**
 * POST /api/admin/promo-codes
 * Yeni endirim kodu yarat
 */
export async function createPromoCode(req, res) {
  const { code, discountPct, validFrom, validUntil, maxUses } = req.body;
  const { rows } = await query(`
    INSERT INTO promo_codes (code, discount_pct, valid_from, valid_until, max_uses)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [code.toUpperCase(), discountPct, validFrom || null, validUntil || null, maxUses || null]);
  res.status(201).json({ message: 'Promo kodu yaradıldı', code: rows[0] });
}

/**
 * PATCH /api/admin/promo-codes/:id/toggle
 * Aktiv/deaktiv et
 */
export async function togglePromoCode(req, res) {
  const { rows } = await query(`
    UPDATE promo_codes SET is_active = NOT is_active
    WHERE id = $1 RETURNING *
  `, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Promo kodu tapılmadı');
  res.json({ code: rows[0] });
}

/**
 * DELETE /api/admin/promo-codes/:id
 */
export async function deletePromoCode(req, res) {
  await query('DELETE FROM promo_codes WHERE id = $1', [req.params.id]);
  res.json({ message: 'Silindi' });
}
