/**
 * ════════════════════════════════════════════════════════════
 * User Model — DB sorğularını ayrılmış sinifdə birləşdirir
 * ════════════════════════════════════════════════════════════
 *
 * Controller-lər birbaşa SQL yazmır — bu modeldəki metodları çağırır.
 * Bu, kod təkrarını azaldır və DB sxema dəyişiklikləri zamanı
 * yalnız bir faylı yeniləməyə imkan verir.
 */
import bcrypt from 'bcrypt';
import { query } from '../config/database.js';

const SALT_ROUNDS = 10;

/**
 * Email-ə görə istifadəçi tap (login üçün — şifrə hash-i daxil)
 */
export async function findByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, name, phone, date_of_birth,
            avatar_url, role, is_blocked, email_verified, created_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

/**
 * ID-yə görə istifadəçi tap (şifrə hash-i daxil deyil — təhlükəsiz cavab)
 */
export async function findById(id) {
  const { rows } = await query(
    `SELECT id, email, name, phone, date_of_birth, avatar_url, role,
            is_blocked, email_verified, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Yeni istifadəçi yarat — şifrəni bcrypt ilə hash edir
 *
 * @param {object} data - {email, password, name, phone, dateOfBirth, role}
 * @returns {object} Yaradılmış istifadəçi (şifrə hash-i çıxarılmış)
 */
export async function create({ email, password, name, phone, dateOfBirth, role = 'customer' }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, name, phone, date_of_birth, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, name, phone, date_of_birth, avatar_url, role, created_at`,
    [email.toLowerCase(), passwordHash, name, phone, dateOfBirth, role]
  );
  return rows[0];
}

/**
 * Şifrə müqayisəsi (bcrypt const-time)
 */
export async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Profili yenilə (yalnız təhlükəsiz sahələr)
 */
export async function updateProfile(userId, { name, phone, avatarUrl }) {
  const { rows } = await query(
    `UPDATE users
     SET name = COALESCE($2, name),
         phone = COALESCE($3, phone),
         avatar_url = COALESCE($4, avatar_url)
     WHERE id = $1
     RETURNING id, email, name, phone, avatar_url, role`,
    [userId, name, phone, avatarUrl]
  );
  return rows[0];
}

/**
 * Şifrə dəyiş — köhnə şifrə yoxlanmış olmalıdır (controller-də)
 */
export async function updatePassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query(
    `UPDATE users SET password_hash = $2 WHERE id = $1`,
    [userId, passwordHash]
  );
}

/**
 * Last login timestamp-i yenilə (login uğurlu olarsa)
 */
export async function updateLastLogin(userId) {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
}

/**
 * Bloklama statusu dəyiş (admin əməliyyatı)
 */
export async function setBlocked(userId, blocked) {
  const { rows } = await query(
    `UPDATE users SET is_blocked = $2 WHERE id = $1 RETURNING id, email, is_blocked`,
    [userId, blocked]
  );
  return rows[0];
}

/**
 * İstifadəçini sil (admin əməliyyatı)
 * CASCADE: avtomobillər, bookings və s. avtomatik silinir
 */
export async function deleteUser(userId) {
  await query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * Bütün istifadəçilər (admin üçün — pagination)
 *
 * @param {object} opts - {role, search, limit, offset, blocked}
 */
export async function findAll({ role, search, limit = 20, offset = 0, blocked }) {
  const conditions = [];
  const params = [];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (blocked !== undefined) {
    params.push(blocked);
    conditions.push(`is_blocked = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, offset);
  const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await query(
    `SELECT id, email, name, phone, date_of_birth, avatar_url, role,
            is_blocked, email_verified, created_at, last_login_at,
            COUNT(*) OVER() AS total_count
     FROM users ${where}
     ORDER BY created_at DESC
     ${limitClause}`,
    params
  );

  return {
    items: rows.map(({ total_count, ...u }) => u),
    total: rows[0]?.total_count ? parseInt(rows[0].total_count) : 0,
  };
}

/**
 * Statistikalar (admin dashboard üçün)
 */
export async function getStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE role = 'customer')                AS customers,
      COUNT(*) FILTER (WHERE role = 'renter')                  AS renters,
      COUNT(*) FILTER (WHERE is_blocked = TRUE)                AS blocked,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_30d
    FROM users
  `);
  return rows[0];
}
