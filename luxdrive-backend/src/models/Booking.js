/**
 * ════════════════════════════════════════════════════════════
 * Booking Model
 * ════════════════════════════════════════════════════════════
 *
 * Race Condition Önləmə Strategiyası:
 *
 * Senaryо: Eyni anda 2 müştəri eyni avtomobil üçün eyni tarixləri
 *          rezerv etməyə cəhd edir.
 *
 * Həll: 3 qatlı qoruma
 *
 * 1. APP LAYER (Optional check):
 *    booking yaratmadan əvvəl `isAvailableForDates()` yoxlaması.
 *    UX üçündür — backend-də bu kifayət DEYIL!
 *
 * 2. DB TRANSACTION:
 *    Hər iki sorğu (cars yenilə + booking əlavə) tək tranzaksiyada.
 *    Race-də biri ROLLBACK olur.
 *
 * 3. DB EXCLUSION CONSTRAINT (Last line of defense):
 *    schema.sql-də `exclude_overlapping_active_bookings`:
 *      EXCLUDE USING GIST (car_id WITH =, daterange(...) WITH &&)
 *    Eyni avtomobil üçün üst-üstə düşən tarix aralığını DB qəbul ETMƏZ.
 *    Bu, AppLayer keçsə belə kompromis olmaz.
 */
import { query, transaction } from '../config/database.js';

/**
 * Yeni rezervasiya yarat — atomik tranzaksiya ilə
 *
 * @throws {Error} '23P01' kodu — DB-də tarix konflikti (exclusion violation)
 *                Bu xəta errorHandler.js-də 409 cavabı kimi qaytarılır.
 */
export async function create(data) {
  const {
    carId, customerId, renterId,
    startDate, endDate, days,
    pricePerDay, discountPct = 0, promoCode, totalPrice,
  } = data;

  return await transaction(async (client) => {
    // 1. Avtomobili "icarədə" işarələ
    // FOR UPDATE qıfılı — eyni sətri başqa tranzaksiya dəyişə bilməz
    const carRes = await client.query(
      `SELECT id, is_available, price_per_day, brand, model
       FROM cars WHERE id = $1 FOR UPDATE`,
      [carId]
    );
    if (!carRes.rows[0]) {
      throw Object.assign(new Error('Avtomobil tapılmadı'), {
        code: 'CAR_NOT_FOUND', status: 404,
      });
    }

    // 2. Rezervasiyanı əlavə et
    // DB EXCLUSION constraint burada işə düşür — konflikt varsa 23P01 atır
    const bookRes = await client.query(`
      INSERT INTO bookings (
        car_id, customer_id, renter_id,
        start_date, end_date, days,
        price_per_day, discount_pct, promo_code, total_price,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      RETURNING *
    `, [
      carId, customerId, renterId,
      startDate, endDate, days,
      pricePerDay, discountPct, promoCode, totalPrice,
    ]);

    // 3. Avtomobili `is_available = FALSE` et
    await client.query(
      `UPDATE cars SET is_available = FALSE WHERE id = $1`,
      [carId]
    );

    return bookRes.rows[0];
  });
}

/**
 * ID-yə görə rezervasiya
 */
export async function findById(id) {
  const { rows } = await query(`
    SELECT
      b.*,
      c.brand, c.model, c.year, c.image_url,
      cu.name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone,
      re.name AS renter_name,   re.email AS renter_email,   re.phone AS renter_phone
    FROM bookings b
    JOIN cars c   ON c.id  = b.car_id
    JOIN users cu ON cu.id = b.customer_id
    JOIN users re ON re.id = b.renter_id
    WHERE b.id = $1
  `, [id]);
  return rows[0] || null;
}

/**
 * Müştərinin rezervasiyaları
 */
export async function findByCustomer(customerId, status) {
  const params = [customerId];
  let statusFilter = '';
  if (status) {
    params.push(status);
    statusFilter = `AND b.status = $${params.length}`;
  }

  const { rows } = await query(`
    SELECT
      b.*,
      c.brand, c.model, c.year, c.image_url,
      re.name AS renter_name
    FROM bookings b
    JOIN cars c   ON c.id  = b.car_id
    JOIN users re ON re.id = b.renter_id
    WHERE b.customer_id = $1 ${statusFilter}
    ORDER BY b.created_at DESC
  `, params);
  return rows;
}

/**
 * İcarəçinin daxil olan rezervasiyaları
 */
export async function findByRenter(renterId, status) {
  const params = [renterId];
  let statusFilter = '';
  if (status) {
    params.push(status);
    statusFilter = `AND b.status = $${params.length}`;
  }

  const { rows } = await query(`
    SELECT
      b.*,
      c.brand, c.model, c.year, c.image_url,
      cu.name AS customer_name, cu.email AS customer_email
    FROM bookings b
    JOIN cars c   ON c.id  = b.car_id
    JOIN users cu ON cu.id = b.customer_id
    WHERE b.renter_id = $1 ${statusFilter}
    ORDER BY b.created_at DESC
  `, params);
  return rows;
}

/**
 * Bütün rezervasiyalar (admin)
 */
export async function findAll({ status, limit = 50, offset = 0 } = {}) {
  const params = [];
  let statusFilter = '';
  if (status) {
    params.push(status);
    statusFilter = `WHERE b.status = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await query(`
    SELECT
      b.*,
      c.brand, c.model,
      cu.name AS customer_name,
      re.name AS renter_name,
      COUNT(*) OVER() AS total_count
    FROM bookings b
    JOIN cars c   ON c.id  = b.car_id
    JOIN users cu ON cu.id = b.customer_id
    JOIN users re ON re.id = b.renter_id
    ${statusFilter}
    ORDER BY b.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);
  return {
    items: rows.map(({ total_count, ...b }) => b),
    total: rows[0]?.total_count ? parseInt(rows[0].total_count) : 0,
  };
}

/**
 * Rezervasiyanı ləğv et — avtomobili yenidən "boş" et
 */
export async function cancel(bookingId, userId) {
  return await transaction(async (client) => {
    // Booking-i tap və sahibi yoxla
    const bookRes = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );
    const booking = bookRes.rows[0];
    if (!booking) {
      throw Object.assign(new Error('Rezervasiya tapılmadı'), {
        code: 'BOOKING_NOT_FOUND', status: 404,
      });
    }
    // Yalnız sahibi (müştəri) və ya admin ləğv edə bilər
    // (admin yoxlanışı route layer-də olur)
    if (booking.customer_id !== userId) {
      throw Object.assign(new Error('İcazəniz yoxdur'), {
        code: 'FORBIDDEN', status: 403,
      });
    }
    if (booking.status !== 'active') {
      throw Object.assign(new Error('Yalnız aktiv rezervasiyalar ləğv edilə bilər'), {
        code: 'NOT_CANCELLABLE', status: 400,
      });
    }

    // Status-u dəyiş
    await client.query(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
      [bookingId]
    );

    // Avtomobili yenidən boş et (digər aktiv rezervasiya yoxdursa)
    const otherActiveRes = await client.query(
      `SELECT COUNT(*) AS cnt FROM bookings
       WHERE car_id = $1 AND status = 'active' AND id != $2`,
      [booking.car_id, bookingId]
    );
    if (parseInt(otherActiveRes.rows[0].cnt) === 0) {
      await client.query(
        `UPDATE cars SET is_available = TRUE WHERE id = $1`,
        [booking.car_id]
      );
    }

    return { ...booking, status: 'cancelled' };
  });
}

/**
 * Status dəyiş (admin və ya cron — bitən rezervasiyaları "completed" et)
 */
export async function updateStatus(bookingId, status) {
  const { rows } = await query(
    `UPDATE bookings SET status = $2 WHERE id = $1 RETURNING *`,
    [bookingId, status]
  );
  return rows[0] || null;
}

/**
 * Admin statistikalar — aylıq rezervasiya çartı
 */
export async function getMonthlyStats(months = 6) {
  const { rows } = await query(`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') AS month,
      COUNT(*) AS count,
      COALESCE(SUM(total_price), 0)::NUMERIC(10,2) AS revenue
    FROM bookings
    WHERE created_at > NOW() - INTERVAL '${parseInt(months)} months'
    GROUP BY month
    ORDER BY month
  `);
  return rows;
}

/**
 * Ümumi statistika
 */
export async function getStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*)                                            AS total,
      COUNT(*) FILTER (WHERE status = 'active')           AS active,
      COUNT(*) FILTER (WHERE status = 'completed')        AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')        AS cancelled,
      COALESCE(SUM(total_price), 0)::NUMERIC(12,2)        AS total_revenue,
      COALESCE(SUM(total_price) FILTER (WHERE status='completed'),0)::NUMERIC(12,2) AS completed_revenue
    FROM bookings
  `);
  return rows[0];
}
