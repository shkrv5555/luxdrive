/**
 * ════════════════════════════════════════════════════════════
 * Çat Handler — Real-time mesajlaşma
 * ════════════════════════════════════════════════════════════
 *
 * Event-lər:
 *
 *   Client → Server:
 *     • chat:send       { receiverId, content }
 *     • chat:typing     { receiverId, isTyping }
 *     • chat:read       { senderId } (göndərənin bütün mesajlarını oxundu et)
 *
 *   Server → Client:
 *     • chat:message    { id, senderId, receiverId, content, createdAt }
 *     • chat:typing     { senderId, isTyping }
 *     • chat:read       { receiverId } (qarşı tərəf mesajları oxudu)
 *     • chat:error      { code, message }
 */
import { query } from '../config/database.js';

/**
 * Çat handler-lərini socket-ə qeyd et
 *
 * @param {Server} io     — socket.io server instance
 * @param {Socket} socket — cari bağlantı
 */
export function registerChatHandlers(io, socket) {
  const userId = socket.user.id;

  // ─────────────────────────────────────────────────────────
  // chat:send — Mesaj göndər
  // ─────────────────────────────────────────────────────────
  socket.on('chat:send', async (data, ack) => {
    try {
      const { receiverId, content } = data || {};

      // Validasiya
      if (!receiverId || typeof receiverId !== 'string') {
        return ack?.({ error: 'INVALID_RECEIVER', message: 'Qəbul edən tələb olunur' });
      }
      if (!content || typeof content !== 'string') {
        return ack?.({ error: 'EMPTY_MESSAGE', message: 'Mesaj boş ola bilməz' });
      }
      const trimmed = content.trim();
      if (trimmed.length === 0 || trimmed.length > 2000) {
        return ack?.({ error: 'INVALID_LENGTH', message: 'Mesaj 1–2000 simvol' });
      }
      if (receiverId === userId) {
        return ack?.({ error: 'SELF_MESSAGE', message: 'Özünüzə mesaj göndərə bilməzsiniz' });
      }

      // Qəbul edən mövcud və bloklanmamış olmalıdır
      const { rows } = await query(
        `SELECT id, name, is_blocked FROM users WHERE id = $1`,
        [receiverId]
      );
      const receiver = rows[0];
      if (!receiver) {
        return ack?.({ error: 'RECEIVER_NOT_FOUND', message: 'Qəbul edən tapılmadı' });
      }
      if (receiver.is_blocked) {
        return ack?.({ error: 'RECEIVER_BLOCKED', message: 'İstifadəçi bloklanıb' });
      }

      // DB-ə yaz
      const { rows: msgRows } = await query(`
        INSERT INTO chat_messages (sender_id, receiver_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, sender_id, receiver_id, content, is_read, created_at
      `, [userId, receiverId, trimmed]);

      const message = msgRows[0];

      // Payload — həm göndərənə, həm qəbul edənə eyni format
      const payload = {
        id: message.id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        content: message.content,
        isRead: message.is_read,
        createdAt: message.created_at,
        sender: {
          id: socket.user.id,
          name: socket.user.name,
          avatarUrl: socket.user.avatar_url,
        },
      };

      // 1. Qəbul edənə göndər (öz otağına)
      io.to(`user:${receiverId}`).emit('chat:message', payload);

      // 2. Göndərənin digər cihazlarına da göndər (sync üçün)
      socket.to(`user:${userId}`).emit('chat:message', payload);

      // 3. Acknowledgement — göndərici öz mesajını ID ilə birgə alır
      ack?.({ ok: true, message: payload });
    } catch (err) {
      console.error('chat:send xətası:', err);
      ack?.({ error: 'SERVER_ERROR', message: 'Mesaj göndərilə bilmədi' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // chat:typing — "Yazır..." göstəricisi
  // ─────────────────────────────────────────────────────────
  socket.on('chat:typing', ({ receiverId, isTyping }) => {
    if (!receiverId || receiverId === userId) return;
    // Yalnız qəbul edənə göndər — DB-yə yazılmır (efemerdir)
    io.to(`user:${receiverId}`).emit('chat:typing', {
      senderId: userId,
      isTyping: !!isTyping,
    });
  });

  // ─────────────────────────────────────────────────────────
  // chat:read — Mesajları oxundu kimi işarələ
  // ─────────────────────────────────────────────────────────
  socket.on('chat:read', async ({ senderId }, ack) => {
    try {
      if (!senderId) {
        return ack?.({ error: 'INVALID_SENDER' });
      }

      // Göndərənin bu istifadəçiyə yazdığı bütün oxunmamış mesajları oxundu et
      const { rowCount } = await query(`
        UPDATE chat_messages
        SET is_read = TRUE
        WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
      `, [senderId, userId]);

      // Göndərənə bildir (mavi tik effekti üçün)
      if (rowCount > 0) {
        io.to(`user:${senderId}`).emit('chat:read', {
          readerId: userId,
        });
      }

      ack?.({ ok: true, updated: rowCount });
    } catch (err) {
      console.error('chat:read xətası:', err);
      ack?.({ error: 'SERVER_ERROR' });
    }
  });

  // ─────────────────────────────────────────────────────────
  // chat:history — Müsahibə tarixçəsini çağır
  // ─────────────────────────────────────────────────────────
  socket.on('chat:history', async ({ withUserId, limit = 50, before }, ack) => {
    try {
      if (!withUserId) return ack?.({ error: 'INVALID_USER' });

      const params = [userId, withUserId];
      let beforeClause = '';
      if (before) {
        params.push(before);
        beforeClause = `AND created_at < $${params.length}`;
      }
      params.push(Math.min(100, parseInt(limit) || 50));

      const { rows } = await query(`
        SELECT id, sender_id, receiver_id, content, is_read, created_at
        FROM chat_messages
        WHERE ((sender_id = $1 AND receiver_id = $2)
            OR (sender_id = $2 AND receiver_id = $1))
          ${beforeClause}
        ORDER BY created_at DESC
        LIMIT $${params.length}
      `, params);

      // Çıxışda zaman ardıcıllığı ilə qaytar (köhnədən yeniyə)
      ack?.({ ok: true, messages: rows.reverse() });
    } catch (err) {
      console.error('chat:history xətası:', err);
      ack?.({ error: 'SERVER_ERROR' });
    }
  });
}
