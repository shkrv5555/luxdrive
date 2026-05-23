/**
 * ════════════════════════════════════════════════════════════
 * Favorite Model — İstək Siyahısı
 * ════════════════════════════════════════════════════════════
 *
 * `favorites` cədvəlində composite PRIMARY KEY (user_id, car_id)
 * təkrar girişləri DB səviyyəsində önləyir.
 */
import { query } from '../config/database.js';

/**
 * İstifadəçinin bütün favoritləri — avtomobil detalları ilə birgə
 */
export async function findByUser(userId) {
  const { rows } = await query(`
    SELECT
      c.*,
      f.created_at AS favorited_at,
      COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM favorites f
    JOIN cars c    ON c.id = f.car_id
    LEFT JOIN reviews r ON r.car_id = c.id
    WHERE f.user_id = $1
    GROUP BY c.id, f.created_at
    ORDER BY f.created_at DESC
  `, [userId]);
  return rows;
}

/**
 * Favorit əlavə et — idempotent (təkrar əlavə xəta vermir)
 */
export async function add(userId, carId) {
  await query(`
    INSERT INTO favorites (user_id, car_id) VALUES ($1, $2)
    ON CONFLICT (user_id, car_id) DO NOTHING
  `, [userId, carId]);
}

/**
 * Favoritdən çıxar
 */
export async function remove(userId, carId) {
  const { rowCount } = await query(
    `DELETE FROM favorites WHERE user_id = $1 AND car_id = $2`,
    [userId, carId]
  );
  return rowCount > 0;
}

/**
 * Bir avtomobil favoritdə olub-olmadığını yoxla
 */
export async function exists(userId, carId) {
  const { rows } = await query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND car_id = $2`,
    [userId, carId]
  );
  return rows.length > 0;
}

/**
 * Yalnız ID-ləri (light response — kartda ürək vəziyyəti üçün)
 */
export async function getIdsByUser(userId) {
  const { rows } = await query(
    `SELECT car_id FROM favorites WHERE user_id = $1`,
    [userId]
  );
  return rows.map(r => r.car_id);
}

/**
 * Sayı
 */
export async function count(userId) {
  const { rows } = await query(
    `SELECT COUNT(*) AS cnt FROM favorites WHERE user_id = $1`,
    [userId]
  );
  return parseInt(rows[0].cnt);
}
