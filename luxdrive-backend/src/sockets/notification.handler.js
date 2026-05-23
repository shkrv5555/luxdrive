/**
 * ════════════════════════════════════════════════════════════
 * Bildiriş Handler — Real-time bildirişlər
 * ════════════════════════════════════════════════════════════
 *
 * Event-lər:
 *
 *   Client → Server:
 *     • notification:fetch  — oxunmamış sayı və son N bildirişi qaytarır
 *     • notification:read   — { id } konkret bildirişi oxundu et
 *     • notification:readAll — bütün bildirişləri oxundu et
 *
 *   Server → Client:
 *     • notification:new       — yeni bildiriş gəldi (canlı push)
 *     • notification:unreadCount — oxunmamış sayı dəyişdi
 *
 * QEYD: REST endpoint-i (notifications.controller.js) də paralel var.
 * Socket onlayn istifadəçilər üçün canlı UX təmin edir,
 * REST isə tarixçə və ilk yükləmə üçündür.
 */
import { query } from '../config/database.js';

export function registerNotificationHandlers(io, socket) {
  const userId = socket.user.id;

  // ─────────────────────────────────────────────────────────
  // notification:fetch — Son bildirişləri al
  // ─────────────────────────────────────────────────────────
  socket.on('notification:fetch', async ({ limit = 20 } = {}, ack) => {
    try {
      const { rows } = await query(`
        SELECT id, type, title, message, link, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, Math.min(50, limit)]);

      const unreadRes = await query(
        `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );
      const unreadCount = parseInt(unreadRes.rows[0].cnt);

      ack?.({ ok: true, notifications: rows, unreadCount });
    } catch (err) {
      console.error('notification:fetch xətası:', err);
      ack?.({ error: 'SERVER_ERROR' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // notification:read — Konkret bildirişi oxundu et
  // ─────────────────────────────────────────────────────────
  socket.on('notification:read', async ({ id }, ack) => {
    try {
      const { rowCount } = await query(
        `UPDATE notifications SET is_read = TRUE
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      if (rowCount === 0) {
        return ack?.({ error: 'NOT_FOUND' });
      }
      // Yeni unread sayını digər cihazlara da göndər
      const unreadRes = await query(
        `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );
      io.to(`user:${userId}`).emit('notification:unreadCount', {
        count: parseInt(unreadRes.rows[0].cnt),
      });
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ error: 'SERVER_ERROR' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // notification:readAll — Hamısını oxundu et
  // ─────────────────────────────────────────────────────────
  socket.on('notification:readAll', async (_, ack) => {
    try {
      const { rowCount } = await query(
        `UPDATE notifications SET is_read = TRUE
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );
      io.to(`user:${userId}`).emit('notification:unreadCount', { count: 0 });
      ack?.({ ok: true, updated: rowCount });
    } catch (err) {
      ack?.({ error: 'SERVER_ERROR' });
    }
  });
}
