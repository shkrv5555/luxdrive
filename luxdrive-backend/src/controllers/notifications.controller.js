/**
 * ════════════════════════════════════════════════════════════
 * Notifications Controller (REST API)
 * ════════════════════════════════════════════════════════════
 *
 * Real-time push Socket.io ilə həll olunur — bu REST endpoint-ləri
 * offline cihazlarda ilk yükləmə və tarixçə üçündür.
 */
import * as Notification from '../models/Notification.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * GET /api/notifications
 * Query: ?limit=20&offset=0&unread=true
 */
export async function list(req, res) {
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const unreadOnly = req.query.unread === 'true';

  const result = await Notification.findByUser(req.user.id, { limit, offset, unreadOnly });
  const unread = await Notification.unreadCount(req.user.id);

  res.json({ ...result, unreadCount: unread });
}

/**
 * GET /api/notifications/unread-count
 * Sadəcə oxunmamış sayı qaytarır (polling cəld olsun)
 */
export async function getUnreadCount(req, res) {
  const count = await Notification.unreadCount(req.user.id);
  res.json({ count });
}

/**
 * PATCH /api/notifications/:id/read
 */
export async function markRead(req, res) {
  const ok = await Notification.markRead(req.params.id, req.user.id);
  if (!ok) {
    throw new HttpError(404, 'NOT_FOUND', 'Bildiriş tapılmadı');
  }
  res.json({ message: 'Oxundu' });
}

/**
 * PATCH /api/notifications/read-all
 */
export async function markAllRead(req, res) {
  const updated = await Notification.markAllRead(req.user.id);
  res.json({ message: `${updated} bildiriş oxundu kimi işarələndi`, updated });
}

/**
 * DELETE /api/notifications/:id
 */
export async function remove(req, res) {
  const ok = await Notification.remove(req.params.id, req.user.id);
  if (!ok) {
    throw new HttpError(404, 'NOT_FOUND', 'Bildiriş tapılmadı');
  }
  res.json({ message: 'Silindi' });
}
