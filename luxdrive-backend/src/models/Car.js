/**
 * ════════════════════════════════════════════════════════════
 * Car Model
 * ════════════════════════════════════════════════════════════
 *
 * Avtomobil sorğuları üçün abstrak qat.
 * • Pagination + filter + sort backend-də həll olunur
 *   (frontend birdən minlərlə avtomobil yükləməməlidir).
 * • `cars_with_rating` view-dan istifadə olunur — avg_rating
 *   və review_count avtomatik gəlir.
 */
import { query } from '../config/database.js';

/**
 * Filter + Pagination ilə avtomobil siyahısı
 *
 * @param {object} opts - {
 *   search, category, transmission, fuel, status,
 *   priceMin, priceMax, renterId,
 *   sortBy ('price_asc' | 'price_desc' | 'rating' | 'newest'),
 *   limit, offset
 * }
 * @returns {{ items: Car[], total: number }}
 */
export async function findAll(opts = {}) {
  const {
    search, category, transmission, fuel,
    status,           // 'available' | 'rented' | undefined (hamısı)
    priceMin, priceMax,
    renterId,
    sortBy = 'newest',
    limit = 12,
    offset = 0,
  } = opts;

  const conditions = [];
  const params = [];

  // Mətn axtarışı — PostgreSQL full-text search istifadə edilir
  // GIN indeksi olduğu üçün çox sürətli işləyir
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(LOWER(c.brand) LIKE $${params.length} OR LOWER(c.model) LIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`c.category = $${params.length}`);
  }
  if (transmission) {
    params.push(transmission);
    conditions.push(`c.transmission = $${params.length}`);
  }
  if (fuel) {
    params.push(fuel);
    conditions.push(`c.fuel = $${params.length}`);
  }
  if (status === 'available') {
    conditions.push(`c.is_available = TRUE`);
  } else if (status === 'rented') {
    conditions.push(`c.is_available = FALSE`);
  }
  if (priceMin != null) {
    params.push(priceMin);
    conditions.push(`c.price_per_day >= $${params.length}`);
  }
  if (priceMax != null) {
    params.push(priceMax);
    conditions.push(`c.price_per_day <= $${params.length}`);
  }
  if (renterId) {
    params.push(renterId);
    conditions.push(`c.renter_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Sıralama xəritəsi — SQL injection qarşısı üçün whitelist
  const sortMap = {
    price_asc:  'c.price_per_day ASC',
    price_desc: 'c.price_per_day DESC',
    rating:     'avg_rating DESC NULLS LAST',
    newest:     'c.created_at DESC',
    oldest:     'c.created_at ASC',
  };
  const orderBy = sortMap[sortBy] || sortMap.newest;

  params.push(limit, offset);
  const sql = `
    SELECT
      c.*,
      u.name  AS renter_name,
      u.phone AS renter_phone,
      COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) AS avg_rating,
      COUNT(r.id) AS review_count,
      COUNT(*) OVER() AS total_count
    FROM cars c
    LEFT JOIN users u   ON u.id = c.renter_id
    LEFT JOIN reviews r ON r.car_id = c.id
    ${where}
    GROUP BY c.id, u.id
    ORDER BY ${orderBy}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await query(sql, params);

  return {
    items: rows.map(({ total_count, ...car }) => car),
    total: rows[0]?.total_count ? parseInt(rows[0].total_count) : 0,
    limit,
    offset,
  };
}

/**
 * Tək avtomobil — sahibi məlumatları və reytinq daxil
 */
export async function findById(id) {
  const { rows } = await query(`
    SELECT
      c.*,
      u.name  AS renter_name,
      u.phone AS renter_phone,
      u.avatar_url AS renter_avatar,
      COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM cars c
    LEFT JOIN users u   ON u.id = c.renter_id
    LEFT JOIN reviews r ON r.car_id = c.id
    WHERE c.id = $1
    GROUP BY c.id, u.id
  `, [id]);
  return rows[0] || null;
}

/**
 * Yeni avtomobil yarat (renter və ya admin tərəfindən)
 */
export async function create(data) {
  const {
    renterId, brand, model, year, pricePerDay,
    category, transmission, fuel, seats = 5,
    description, imageUrl,
  } = data;

  const { rows } = await query(`
    INSERT INTO cars (
      renter_id, brand, model, year, price_per_day,
      category, transmission, fuel, seats, description, image_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    renterId, brand, model, year, pricePerDay,
    category, transmission, fuel, seats, description, imageUrl,
  ]);
  return rows[0];
}

/**
 * Yenilə (yalnız təyin edilən sahələr)
 * COALESCE: null parametr keçilirsə, köhnə dəyər saxlanılır.
 */
export async function update(id, data) {
  const {
    brand, model, year, pricePerDay,
    category, transmission, fuel, seats,
    description, imageUrl,
  } = data;

  const { rows } = await query(`
    UPDATE cars SET
      brand         = COALESCE($2, brand),
      model         = COALESCE($3, model),
      year          = COALESCE($4, year),
      price_per_day = COALESCE($5, price_per_day),
      category      = COALESCE($6, category),
      transmission  = COALESCE($7, transmission),
      fuel          = COALESCE($8, fuel),
      seats         = COALESCE($9, seats),
      description   = COALESCE($10, description),
      image_url     = COALESCE($11, image_url)
    WHERE id = $1
    RETURNING *
  `, [
    id, brand, model, year, pricePerDay,
    category, transmission, fuel, seats, description, imageUrl,
  ]);
  return rows[0] || null;
}

/**
 * Mövcudluq statusunu dəyiş (boş/icarədə)
 */
export async function setAvailability(id, isAvailable) {
  const { rows } = await query(
    `UPDATE cars SET is_available = $2 WHERE id = $1 RETURNING *`,
    [id, isAvailable]
  );
  return rows[0] || null;
}

/**
 * Sil — booking-lər CASCADE silinir
 */
export async function deleteById(id) {
  const { rowCount } = await query('DELETE FROM cars WHERE id = $1', [id]);
  return rowCount > 0;
}

/**
 * Sahibi yoxla — middleware-də requireOwnership üçün
 */
export async function getOwner(id) {
  const { rows } = await query('SELECT renter_id FROM cars WHERE id = $1', [id]);
  return rows[0] ? { ownerId: rows[0].renter_id } : null;
}

/**
 * Müəyyən tarixlərdə avtomobilin boş olub-olmadığını yoxla
 * (booking yaradılmadan əvvəl frontend bilməsi üçün)
 */
export async function isAvailableForDates(carId, startDate, endDate) {
  const { rows } = await query(`
    SELECT COUNT(*) AS cnt
    FROM bookings
    WHERE car_id = $1
      AND status IN ('active', 'pending')
      AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')
  `, [carId, startDate, endDate]);
  return parseInt(rows[0].cnt) === 0;
}

/**
 * Admin statistikalar — kateqoriya üzrə sayğac
 */
export async function getCategoryStats() {
  const { rows } = await query(`
    SELECT category, COUNT(*) AS count
    FROM cars
    GROUP BY category
    ORDER BY count DESC
  `);
  return rows;
}
