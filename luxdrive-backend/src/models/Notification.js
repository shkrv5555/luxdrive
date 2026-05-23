/**
 * ════════════════════════════════════════════════════════════
 * Notification Model
 * ════════════════════════════════════════════════════════════
 *
 * REST API + Socket.io üçün ortaq DB qatı.
 *
 * Bildiriş yaradılması üçün `create()` çağırılır — sonra
 * çağıran kod özü `emitToUser(userId, 'notification:new', notif)`
 * ilə real-time push edir (yalnız onlayn olarsa).
 */
import { query } from '../config/database.js';
import { emitToUser } from '../config/socket.js';

/**
 * Bildiriş yarat + real-time push
 *
 * @param {object} data - { userId, type, title, message, link }
 * @returns yaradılmış bildiriş obyekti
 */
export async function create({ userId, type, title, message, link }) {
  const { rows } = await query(`
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, type, title, message, link, is_read, created_at
  `, [userId, type, title, message || null, link || null]);

  const notif = rows[0];

  // Real-time push — yalnız onlayn olsa çatdırılır
  emitToUser(userId, 'notification:new', notif);

  // Unread count yenilə
  const { rows: cntRows } = await query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  emitToUser(userId, 'notification:unreadCount', {
    count: parseInt(cntRows[0].cnt),
  });

  return notif;
}

/**
 * İstifadəçinin bildirişləri (pagination)
 */
export async function findByUser(userId, { limit = 20, offset = 0, unreadOnly = false } = {}) {
  const params = [userId];
  let unreadFilter = '';
  if (unreadOnly) {
    unreadFilter = 'AND is_read = FALSE';
  }
  params.push(limit, offset);

  const { rows } = await query(`
    SELECT id, type, title, message, link, is_read, created_at,
           COUNT(*) OVER() AS total_count
    FROM notifications
    WHERE user_id = $1 ${unreadFilter}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: rows.map(({ total_count, ...n }) => n),
    total: rows[0]?.total_count ? parseInt(rows[0].total_count) : 0,
  };
}

/**
 * Oxunmamış sayı
 */
export async function unreadCount(userId) {
  const { rows } = await query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(rows[0].cnt);
}

/**
 * Tək bildirişi oxundu kimi işarələ
 */
export async function markRead(id, userId) {
  const { rowCount } = await query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rowCount > 0;
}

/**
 * Bütün bildirişləri oxundu et
 */
export async function markAllRead(userId) {
  const { rowCount } = await query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rowCount;
}

/**
 * Sil
 */
export async function remove(id, userId) {
  const { rowCount } = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rowCount > 0;
}

/**
 * 30 gündən köhnə bildirişləri sil (cron üçün)
 */
export async function purgeOld() {
  const { rowCount } = await query(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'`
  );
  return rowCount;
}
