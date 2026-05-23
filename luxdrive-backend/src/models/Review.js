/**
 * ════════════════════════════════════════════════════════════
 * Review Model
 * ════════════════════════════════════════════════════════════
 *
 * Biznes qaydaları:
 * • Bir müştəri eyni avtomobilə yalnız 1 rəy verə bilər
 *   (DB-də UNIQUE constraint: car_id + customer_id)
 * • Rəy vermək üçün ən azı 1 tamamlanmış rezervasiya olmalıdır
 *   (controller layer-də yoxlanılır)
 */
import { query } from '../config/database.js';

/**
 * Avtomobilin bütün rəyləri — müştəri məlumatları ilə birgə
 */
export async function findByCar(carId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(`
    SELECT
      r.*,
      u.name AS customer_name,
      u.avatar_url AS customer_avatar,
      COUNT(*) OVER() AS total_count
    FROM reviews r
    JOIN users u ON u.id = r.customer_id
    WHERE r.car_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `, [carId, limit, offset]);
  return {
    items: rows.map(({ total_count, ...r }) => r),
    total: rows[0]?.total_count ? parseInt(rows[0].total_count) : 0,
  };
}

/**
 * Müştərinin bütün rəyləri
 */
export async function findByCustomer(customerId) {
  const { rows } = await query(`
    SELECT
      r.*,
      c.brand, c.model, c.image_url
    FROM reviews r
    JOIN cars c ON c.id = r.car_id
    WHERE r.customer_id = $1
    ORDER BY r.created_at DESC
  `, [customerId]);
  return rows;
}

/**
 * Bütün rəylər (admin)
 */
export async function findAll({ limit = 50, offset = 0 } = {}) {
  const { rows } = await query(`
    SELECT
      r.*,
      c.brand, c.model,
      u.name AS customer_name,
      COUNT(*) OVER() AS total_count
    FROM reviews r
    JOIN cars c ON c.id = r.car_id
    JOIN users u ON u.id = r.customer_id
    ORDER BY r.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return {
    items: rows.map(({ total_count, ...r }) => r),
    total: rows[0]?.total_count ? parseInt(rows[0].total_count) : 0,
  };
}

/**
 * Rəy yarat
 * @throws PostgreSQL '23505' kod — eyni müştəri eyni avtomobilə təkrar rəy
 *         (UNIQUE constraint pozulması) — errorHandler 409 qaytarır.
 */
export async function create({ carId, customerId, bookingId, rating, comment }) {
  const { rows } = await query(`
    INSERT INTO reviews (car_id, customer_id, booking_id, rating, comment)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [carId, customerId, bookingId, rating, comment]);
  return rows[0];
}

/**
 * Müştərinin müəyyən avtomobilə artıq rəy verib-verməməsini yoxla
 */
export async function existsForCar(carId, customerId) {
  const { rows } = await query(
    'SELECT id FROM reviews WHERE car_id = $1 AND customer_id = $2',
    [carId, customerId]
  );
  return rows.length > 0;
}

/**
 * Müştərinin tamamlanmış rezervasiyası var-yoxmuş yoxla
 */
export async function hasCompletedBooking(carId, customerId) {
  const { rows } = await query(`
    SELECT id FROM bookings
    WHERE car_id = $1 AND customer_id = $2 AND status = 'completed'
    LIMIT 1
  `, [carId, customerId]);
  return rows[0] || null;
}

/**
 * Sil — yalnız sahibi və ya admin
 */
export async function deleteById(id) {
  const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [id]);
  return rowCount > 0;
}

/**
 * Sahibi yoxla (requireOwnership üçün)
 */
export async function getOwner(id) {
  const { rows } = await query('SELECT customer_id FROM reviews WHERE id = $1', [id]);
  return rows[0] ? { ownerId: rows[0].customer_id } : null;
}
