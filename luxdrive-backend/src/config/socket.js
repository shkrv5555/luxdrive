/**
 * ════════════════════════════════════════════════════════════
 * Socket.io Konfiqurasiyası və JWT Autentifikasiya
 * ════════════════════════════════════════════════════════════
 *
 * Memarlıq:
 *
 * 1. AUTH: Hər bağlantı handshake-də JWT token tələb olunur
 *    (URL query və ya auth obyekti vasitəsilə)
 *
 * 2. ROOMS: Hər istifadəçi öz `user:<id>` otağına qoşulur.
 *    Direct mesaj göndərmək üçün: io.to(`user:<receiverId>`).emit(...)
 *
 * 3. PRESENCE: Onlayn istifadəçilər Map-də saxlanılır.
 *    Bir istifadəçi bir neçə cihazdan qoşula bilər
 *    (yəni bir userId → bir neçə socketId)
 *
 * 4. EVENTS: chat.handler.js və notification.handler.js
 *    bu fayldan import edilən io instance-ı istifadə edir.
 */
import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { query } from './database.js';
import { registerChatHandlers } from '../sockets/chat.handler.js';
import { registerNotificationHandlers } from '../sockets/notification.handler.js';

// Onlayn istifadəçilər — userId → Set<socketId>
const onlineUsers = new Map();

// Modul səviyyəsində io instance saxla — başqa fayllardan istifadə üçün
let ioInstance = null;

/**
 * Socket.io serverini HTTP server-ə bağla
 *
 * @param {http.Server} httpServer
 * @returns {Server} socket.io server instance
 */
export function initSocket(httpServer) {
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Ping/pong: 25s, qoşulma timeout: 20s
    pingTimeout:  60_000,
    pingInterval: 25_000,
  });

  ioInstance = io;

  // ── MIDDLEWARE: JWT Autentifikasiya ─────────────────────
  // Hər bağlantıdan əvvəl çağırılır
  io.use(async (socket, next) => {
    try {
      // Token həm `auth.token`, həm də `query.token`-dan oxunur
      const token = socket.handshake.auth?.token
                 || socket.handshake.query?.token;

      if (!token) return next(new Error('AUTH_REQUIRED'));

      const payload = verifyAccessToken(token);

      // DB-dən aktual istifadəçi yoxla (real-vaxt blok yoxlanışı)
      const { rows } = await query(
        `SELECT id, email, name, role, avatar_url, is_blocked
         FROM users WHERE id = $1`,
        [payload.sub]
      );
      const user = rows[0];
      if (!user) return next(new Error('USER_NOT_FOUND'));
      if (user.is_blocked) return next(new Error('USER_BLOCKED'));

      // İstifadəçi məlumatını socket-ə əlavə et
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('INVALID_TOKEN'));
    }
  });

  // ── CONNECTION ──────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 Socket qoşuldu: ${socket.user.name} (${userId.slice(0, 8)})`);

    // 1. İstifadəçini öz şəxsi otağına qoş
    socket.join(`user:${userId}`);

    // 2. Onlayn statistikasını yenilə
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // İlk dəfə qoşulursa — `online` event-i digərlərinə yay
      // (real layihədə yalnız "dostlara" yayılmalıdır — burada hamı görür)
      socket.broadcast.emit('user:online', { userId });
    }
    onlineUsers.get(userId).add(socket.id);

    // 3. Cari istifadəçiyə onlayn istifadəçilər siyahısını göndər
    socket.emit('users:online', { users: Array.from(onlineUsers.keys()) });

    // 4. Handler-ləri qeyd et — hər modulun ayrı faylı var
    registerChatHandlers(io, socket);
    registerNotificationHandlers(io, socket);

    // ── DISCONNECT ────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket ayrıldı: ${socket.user.name} (${reason})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        // Bu userId-nin başqa açıq socket-i yoxdursa — offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user:offline', { userId });
        }
      }
    });

    // Xəta — log
    socket.on('error', (err) => {
      console.error(`⚠️  Socket xəta (${socket.user.email}):`, err);
    });
  });

  console.log('✅ Socket.io qoşuldu');
  return io;
}

/**
 * Başqa modullardan io-ya çıxış (məsələn bookings controller-də)
 *
 * Misal:
 *   import { getIO } from '../config/socket.js';
 *   getIO()?.to(`user:${renterId}`).emit('notification:new', {...});
 */
export function getIO() {
  return ioInstance;
}

/**
 * İstifadəçinin onlayn olub-olmadığını yoxla
 */
export function isOnline(userId) {
  return onlineUsers.has(userId);
}

/**
 * Bir istifadəçinin bütün açıq socket-ləri
 */
export function getUserSockets(userId) {
  return Array.from(onlineUsers.get(userId) || []);
}

/**
 * Müəyyən istifadəçiyə real-time bildiriş göndər
 * Köməkçi funksiya — hər kontroller socket detallarını bilməsin deyə
 *
 * @param {string} userId — qəbul edən
 * @param {string} event  — event adı (məsələn, 'notification:new')
 * @param {object} payload
 */
export function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}
