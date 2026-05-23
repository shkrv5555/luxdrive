/**
 * ════════════════════════════════════════════════════════════
 * Chat Controller (REST API)
 * ════════════════════════════════════════════════════════════
 *
 * Socket.io olmayan mühit (ilk yükləmə, mobil push)
 * üçün REST nüsxələri.
 */
import * as Chat from '../models/Chat.js';
import { HttpError } from '../middleware/errorHandler.js';
import { isOnline } from '../config/socket.js';
import { query } from '../config/database.js';

/**
 * GET /api/chat/conversations
 * İstifadəçinin bütün söhbətləri (son mesaj + oxunmamış sayı)
 */
export async function listConversations(req, res) {
  const conversations = await Chat.getConversationList(req.user.id);
  // Hər söhbətdə qarşı tərəfin onlayn statusu da qaytarılır
  const enriched = conversations.map((c) => ({
    ...c,
    other_online: isOnline(c.other_id),
  }));
  res.json({ conversations: enriched });
}

/**
 * GET /api/chat/messages/:userId
 * Konkret istifadəçi ilə mesaj tarixçəsi
 *
 * Query: ?limit=50&before=2026-05-22T10:00:00Z
 */
export async function getMessages(req, res) {
  const otherId = req.params.userId;
  const limit  = Math.min(100, parseInt(req.query.limit) || 50);
  const before = req.query.before;

  if (otherId === req.user.id) {
    throw new HttpError(400, 'SELF_CONVERSATION', 'Özünüzlə söhbət ola bilməz');
  }

  const messages = await Chat.getConversation(req.user.id, otherId, { limit, before });
  res.json({
    messages,
    otherOnline: isOnline(otherId),
  });
}

/**
 * GET /api/chat/unread-count
 * Badge üçün ümumi oxunmamış sayı
 */
export async function unreadCount(req, res) {
  const count = await Chat.totalUnread(req.user.id);
  res.json({ count });
}

/**
 * GET /api/chat/support
 * Dəstək (admin) məlumatı + onlayn statusu
 * Customer chat widget bunu istifadə edərək admin ilə birbaşa söhbət açır
 */
export async function getSupport(req, res) {
  const { rows } = await query(
    `SELECT id, name, avatar_url FROM users
     WHERE role = 'admin' AND is_blocked = FALSE
     ORDER BY created_at ASC LIMIT 1`
  );
  const admin = rows[0];
  if (!admin) {
    return res.json({ admin: null, online: false });
  }
  res.json({
    admin: {
      id: admin.id,
      name: admin.name || 'LuxDrive Dəstək',
      avatar_url: admin.avatar_url,
    },
    online: isOnline(admin.id),
  });
}
