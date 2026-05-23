/**
 * ════════════════════════════════════════════════════════════
 * LuxDrive Backend Server — Giriş Nöqtəsi
 * ════════════════════════════════════════════════════════════
 *
 * Bu fayl:
 *   1. Express tətbiqini qurur (middleware-lər, route-lar)
 *   2. PostgreSQL bağlantısını yoxlayır
 *   3. HTTP server-i ayağa qaldırır
 *   4. Socket.io-nu HTTP server-ə bağlayır
 *   5. Graceful shutdown idarə edir
 *
 * Faza 1: Yalnız /api/auth/* endpoint-ləri aktivdir
 * Faza 2: Cars, Bookings, Reviews route-ları əlavə olunacaq
 * Faza 3: Socket.io chat handler-ləri tam qoşulacaq
 */
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import path from 'path';
import { fileURLToPath } from 'url';

import { testConnection } from './src/config/database.js';
import { initSocket } from './src/config/socket.js';
import authRoutes          from './src/routes/auth.routes.js';
import usersRoutes         from './src/routes/users.routes.js';
import carsRoutes          from './src/routes/cars.routes.js';
import bookingsRoutes      from './src/routes/bookings.routes.js';
import reviewsRoutes       from './src/routes/reviews.routes.js';
import adminRoutes         from './src/routes/admin.routes.js';
import notificationsRoutes from './src/routes/notifications.routes.js';
import chatRoutes          from './src/routes/chat.routes.js';
import favoritesRoutes     from './src/routes/favorites.routes.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { generalLimiter } from './src/middleware/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 1. Express tətbiqini yarat ────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT) || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ── 1.1. JWT açarlarının gücünü yoxla (server başlamadan əvvəl) ──
// Zəif JWT_SECRET production-da kritik təhlükəsizlik boşluğudur
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET ən azı 32 simvol olmalıdır');
  process.exit(1);
}
if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_SECRET və JWT_REFRESH_SECRET fərqli olmalıdır');
  process.exit(1);
}

// ── 1.2. Reverse proxy etibarı (rate-limit və req.ip üçün) ───
// Production-da nginx/cloudflare arxasında işləyərkən vacibdir
if (isProd) app.set('trust proxy', 1);

// ── 2. Təhlükəsizlik middleware-ləri ─────────────────────
// helmet — HTTP başlıqlarını qoruyur (CSP, HSTS, X-Frame-Options və s.)
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
    },
  } : false, // Dev-də CSP söndürür (Vite HMR-i pozmasın)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

// CORS: yalnız təyin edilmiş frontend domenlərinə icazə verir
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Origin yoxdursa (server-to-server, curl) — yalnız dev-də icazə ver
    if (!origin) return callback(null, !isProd);
    if (corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: ${origin} icazəli deyil`));
  },
  credentials: true,
  // Yalnız zəruri başlıqlara icazə ver
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// Body parser — DoS qarşısı üçün məhdud ölçü
// Şəkillər multer ilə işlənir (ayrıca limit)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Gzip sıxma — cavablar daha kiçik göndərilir
app.use(compression());

// HTTP loqlar — development-də gözəl format, production-da JSON
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limit — bütün API üçün ümumi limit
app.use('/api', generalLimiter);

// ── 3. Health check endpoint ──────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── 4. Statik fayllar (yüklənmiş şəkillər) ────────────────
// /uploads/* — public access (avatar və avtomobil şəkilləri üçün)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
}));

// ── 5. API route-ları ─────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/cars',          carsRoutes);
app.use('/api/bookings',      bookingsRoutes);
app.use('/api/reviews',       reviewsRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/favorites',     favoritesRoutes);

// ── 6. 404 və error handler-lər (sonda olmalıdır) ─────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── 6. HTTP server-i Socket.io ilə birgə qaldır ───────────
const httpServer = http.createServer(app);

// Socket.io qoş — JWT-əsaslı real-time çat + bildirişlər
initSocket(httpServer);

// ── 7. Başlanğıc proseduru ────────────────────────────────
async function startServer() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🚗 LuxDrive Backend API — başladılır...');
  console.log('══════════════════════════════════════════════════\n');

  // DB bağlantı testi
  const dbOk = await testConnection();
  if (!dbOk && process.env.NODE_ENV === 'production') {
    console.error('❌ Production-da DB olmadan başlamaq mümkün deyil');
    process.exit(1);
  }
  if (!dbOk) {
    console.warn('⚠️  DB qoşulmadı — bəzi endpoint-lər işləməyəcək');
  }

  // Server-i ayağa qaldır
  httpServer.listen(PORT, () => {
    console.log(`\n✅ Server hazır: http://localhost:${PORT}`);
    console.log(`   Mühit: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   CORS icazə: ${corsOrigins.join(', ')}`);
    console.log(`\n   📚 Endpoint-lər:`);
    console.log(`      Auth    : POST /api/auth/{register,login,refresh,logout,admin-login}`);
    console.log(`      Auth    : GET  /api/auth/me`);
    console.log(`      Users   : GET/PUT /api/users/profile, PUT /password, POST /avatar`);
    console.log(`      Cars    : GET /api/cars (filter+pagination), GET/PUT/DELETE /api/cars/:id`);
    console.log(`      Cars    : POST /api/cars (renter+), PATCH /:id/availability`);
    console.log(`      Bookings: POST /api/bookings (transaction), GET /my, GET /renter/incoming`);
    console.log(`      Bookings: PATCH /:id/cancel`);
    console.log(`      Reviews : GET /api/reviews/car/:carId, POST /api/reviews, DELETE /:id`);
    console.log(`      Notifs  : GET /api/notifications, PATCH /:id/read, /read-all`);
    console.log(`      Chat    : GET /api/chat/conversations, /messages/:userId`);
    console.log(`      Favs    : GET /api/favorites, POST /:carId/toggle`);
    console.log(`      Admin   : GET /api/admin/stats, /users, /promo-codes`);
    console.log(`      Socket  : ws://localhost:${PORT}/socket.io (JWT in auth.token)`);
    console.log(`              events: chat:send, chat:read, chat:typing, chat:history`);
    console.log(`              events: notification:new, notification:read, notification:readAll`);
    console.log(`              events: user:online, user:offline\n`);
    console.log(`══════════════════════════════════════════════════\n`);
  });
}

// ── 8. Graceful Shutdown ──────────────────────────────────
// SIGTERM (Docker/Kubernetes) və SIGINT (Ctrl+C) zamanı təmiz çıxış
function shutdown(signal) {
  console.log(`\n⚠️  ${signal} alındı — server bağlanır...`);
  httpServer.close(() => {
    console.log('✅ HTTP server bağlandı');
    process.exit(0);
  });
  // 10 saniyə içində bağlanmazsa, məcburi çıxış
  setTimeout(() => {
    console.error('❌ Bağlanma timeout — məcburi çıxış');
    process.exit(1);
  }, 10_000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Tutulmamış xətalar — log-la və çıx (PM2/Docker yenidən başladacaq)
process.on('unhandledRejection', (err) => {
  console.error('❌ Tutulmamış Promise xətası:', err);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Tutulmamış istisna:', err);
  process.exit(1);
});

// Başlat!
startServer();
