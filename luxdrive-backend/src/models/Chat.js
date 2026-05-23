/**
 * ════════════════════════════════════════════════════════════
 * Chat Model — Mesaj tarixçəsi (REST + Socket arasında ortaq)
 * ════════════════════════════════════════════════════════════
 */
import { query } from '../config/database.js';

/**
 * İki istifadəçi arasında mesaj tarixçəsi
 * Pagination: cursor-based (before timestamp ilə)
 */
export async function getConversation(userA, userB, { limit = 50, before } = {}) {
  const params = [userA, userB];
  let beforeClause = '';
  if (before) {
    params.push(before);
    beforeClause = `AND cm.created_at < $${params.length}`;
  }
  params.push(Math.min(100, limit));

  const { rows } = await query(`
    SELECT cm.id, cm.sender_id, cm.receiver_id, cm.content, cm.is_read, cm.created_at,
           s.name AS sender_name, s.avatar_url AS sender_avatar
    FROM chat_messages cm
    JOIN users s ON s.id = cm.sender_id
    WHERE ((cm.sender_id = $1 AND cm.receiver_id = $2)
        OR (cm.sender_id = $2 AND cm.receiver_id = $1))
      ${beforeClause}
    ORDER BY cm.created_at DESC
    LIMIT $${params.length}
  `, params);

  return rows.reverse(); // köhnədən yeniyə
}

/**
 * İstifadəçinin bütün söhbətləri — son mesajla
 * (Çat siyahısı üçün — WhatsApp kimi)
 */
export async function getConversationList(userId) {
  const { rows } = await query(`
    WITH last_messages AS (
      SELECT DISTINCT ON (
        LEAST(sender_id, receiver_id),
        GREATEST(sender_id, receiver_id)
      )
        id, sender_id, receiver_id, content, is_read, created_at,
        CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_id
      FROM chat_messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY
        LEAST(sender_id, receiver_id),
        GREATEST(sender_id, receiver_id),
        created_at DESC
    )
    SELECT
      lm.*,
      u.name AS other_name,
      u.avatar_url AS other_avatar,
      u.role AS other_role,
      (SELECT COUNT(*) FROM chat_messages
       WHERE sender_id = lm.other_id AND receiver_id = $1 AND is_read = FALSE) AS unread_count
    FROM last_messages lm
    JOIN users u ON u.id = lm.other_id
    ORDER BY lm.created_at DESC
  `, [userId]);

  return rows;
}

/**
 * Bütün oxunmamış mesaj sayı (badge üçün)
 */
export async function totalUnread(userId) {
  const { rows } = await query(
    `SELECT COUNT(*) AS cnt FROM chat_messages
     WHERE receiver_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(rows[0].cnt);
}

/**
 * Mesaj göndər (REST üçün — socket olmayan vəziyyətdə)
 * Socket handler-dən fərqli olaraq emit etmir.
 */
export async function send({ senderId, receiverId, content }) {
  const { rows } = await query(`
    INSERT INTO chat_messages (sender_id, receiver_id, content)
    VALUES ($1, $2, $3)
    RETURNING id, sender_id, receiver_id, content, is_read, created_at
  `, [senderId, receiverId, content]);
  return rows[0];
}
