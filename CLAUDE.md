# LuxDrive — Claude Code Layihə Sənədi

> Bu fayl Claude Code üçün yazılıb — layihənin tam istinad mənbəyidir.
> Hər yeni session-da Claude bu sənədi oxuyaraq layihə haqqında dərhal məlumat əldə edir.

---

## 📋 Layihə Xülasəsi

**LuxDrive** — Azərbaycanda premium avtomobil icarəsi platforması.
Full-stack production tətbiqi. Müştərilər, icarəçilər və admin üçün ayrıca rollar.

**Production URL:** https://luxdrive-umber.vercel.app
**Backend API:** https://luxdrive-api-1.onrender.com
**GitHub:** https://github.com/shkrv5555/luxdrive

---

## 🏗️ Memarlıq

```
┌─────────────────────────────────────────────────────┐
│  React Frontend (Vite)                              │
│  → Vercel (CDN, edge network)                       │
│  → luxdrive-umber.vercel.app                        │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS + WSS (Socket.io)
                   ▼
┌─────────────────────────────────────────────────────┐
│  Node.js Backend (Express + Socket.io)              │
│  → Render.com (Frankfurt region)                    │
│  → luxdrive-api-1.onrender.com                      │
└──────────────────┬──────────────────────────────────┘
                   │ PostgreSQL TLS
                   ▼
┌─────────────────────────────────────────────────────┐
│  PostgreSQL 17 (Neon serverless)                    │
│  → Frankfurt AWS region                             │
│  → 10 cədvəl + 1 view                               │
└─────────────────────────────────────────────────────┘
```

**Keep-alive:** UptimeRobot 5 dəqiqədə bir `/health` endpoint-ə ping göndərir
(Render free tier 15 dəq idle sonra yatır).

---

## 📁 Layihə Strukturu

```
my projects/
├── CLAUDE.md                    ← BU FAYL
├── .gitignore                   (root - .env, node_modules, uploads)
├── index.html                   (köhnə tək-fayl demo — production-da istifadə olunmur)
│
├── luxdrive-backend/            ← Node.js Express + Socket.io
│   ├── server.js                Entry point — Express + HTTP + Socket.io qaldırır
│   ├── package.json             ES modules ("type":"module"), Node ≥20
│   ├── render.yaml              Render blueprint (auto-deploy)
│   ├── .env.example             Template
│   ├── .env                     (GİTE COMMIT EDILMƏYIB)
│   │
│   ├── database/
│   │   ├── schema.sql           Tam schema — 10 cədvəl + indekslər + view-lər
│   │   ├── migrate.js           pg ilə schema.sql tətbiq edən script
│   │   ├── migrations/          Inkremental dəyişikliklər
│   │   │   ├── 001_add_site_pages.sql
│   │   │   └── 002_add_settings.sql
│   │   ├── setup-local.js       Lokal DB + Neon → lokal data köçürmə
│   │   ├── migrate-from-neon.js Tək-yönlü data köçürmə
│   │   ├── reseed-passwords.js  Demo istifadəçi şifrələrini bcrypt-lə yenidən hash et
│   │   ├── reseed-neon.js       Eyni şey amma birbaşa Neon-a
│   │   └── change-password.js   İstənilən istifadəçinin şifrəsini dəyiş (CLI)
│   │
│   └── src/
│       ├── config/
│       │   ├── database.js      pg Pool + transaction() helper
│       │   └── socket.js        Socket.io init + JWT auth + presence
│       │
│       ├── middleware/
│       │   ├── auth.js          authenticate, requireRole, requireOwnership, optionalAuth
│       │   ├── errorHandler.js  Global error + HttpError class + asyncHandler
│       │   ├── validate.js      express-validator + generalLimiter + authLimiter
│       │   └── upload.js        multer + sharp (avatar WebP 256x256)
│       │
│       ├── models/              DB sorğu qatları (Controller-lər birbaşa SQL yazmır)
│       │   ├── User.js          findByEmail, create, verifyPassword, setBlocked
│       │   ├── Car.js           findAll (filter+sort+pagination), isAvailableForDates
│       │   ├── Booking.js       create (DB TRANSACTION!), cancel, monthly stats
│       │   ├── Review.js        existsForCar, hasCompletedBooking
│       │   ├── Notification.js  create() avtomatik real-time push edir
│       │   ├── Chat.js          getConversation, getConversationList
│       │   ├── Favorite.js      add/remove/toggle
│       │   └── Page.js          findBySlug, upsert (CMS)
│       │
│       ├── controllers/         Biznes məntiqi
│       │   ├── auth.controller.js          register, login, refresh, logout, me, adminLogin
│       │   ├── users.controller.js         profile, password (with revokeAll), avatar, delete
│       │   ├── cars.controller.js          CRUD + filter + availability check
│       │   ├── bookings.controller.js      promo validation, notifications, race-safe create
│       │   ├── reviews.controller.js       completedBooking check + unique guard
│       │   ├── chat.controller.js          REST nüsxələri + getSupport (admin info)
│       │   ├── notifications.controller.js REST API (Socket-lə paralel)
│       │   ├── favorites.controller.js     toggle, list, ids
│       │   ├── admin.controller.js         stats, users CRUD, promo CRUD
│       │   └── pages.controller.js         getPage (public), listPagesAdmin, updatePageAdmin
│       │
│       ├── routes/              Express router-lər (validation pipeline daxil)
│       │   ├── auth.routes.js
│       │   ├── users.routes.js
│       │   ├── cars.routes.js
│       │   ├── bookings.routes.js
│       │   ├── reviews.routes.js
│       │   ├── chat.routes.js
│       │   ├── notifications.routes.js
│       │   ├── favorites.routes.js
│       │   ├── admin.routes.js     `/api/admin/*` — bütün route-lar requireRole('admin')
│       │   └── pages.routes.js     `/api/pages/:slug` — public CMS
│       │
│       ├── sockets/             Socket.io event handler-ləri
│       │   ├── chat.handler.js          chat:send/typing/read/history
│       │   └── notification.handler.js  notification:fetch/read/readAll
│       │
│       └── utils/
│           └── jwt.js           signAccessToken, createRefreshToken, rotateRefreshToken
│
└── luxdrive-frontend/           ← React 18 + Vite + Redux Toolkit
    ├── package.json             Node ≥20, "type":"module"
    ├── vite.config.js           Path aliases (@api, @store, @routes, @hooks, ...)
    ├── vercel.json              SPA rewrites + security headers + cache-control
    ├── index.html               React kök
    ├── .env                     VITE_API_URL boş = proxy istifadə olunur
    ├── .env.production          Production üçün backend URL
    │
    └── src/
        ├── main.jsx             ReactDOM.createRoot + Redux Provider
        ├── App.jsx              BrowserRouter + InitialLoader + Navbar + AppRouter
        │
        ├── api/
        │   ├── client.js        Axios instance + interceptors (avto token refresh)
        │   └── endpoints.js     Bütün API çağırışları (authAPI, carsAPI, ...)
        │
        ├── store/               Redux Toolkit
        │   ├── index.js         configureStore
        │   └── slices/
        │       ├── authSlice.js          login/register/refresh/me/logout (thunks)
        │       ├── notificationsSlice.js REST + real-time merge
        │       ├── favoritesSlice.js     ID-set O(1) yoxlama
        │       └── uiSlice.js            modals, menus, chat, cookies state
        │
        ├── hooks/
        │   └── useSocket.js     Socket.io client + Redux köprü
        │
        ├── routes/
        │   ├── AppRouter.jsx        Lazy-loaded routes
        │   ├── ProtectedRoute.jsx   Role-based guard
        │   ├── PageTransition.jsx   Premium fade+blur+slide
        │   └── PageTransition.css
        │
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.jsx           5x-click admin trigger + scrolled state
        │   │   ├── Footer.jsx + CookieBanner + MobileMenu
        │   ├── ui/
        │   │   ├── Button.jsx           Variant, size, loading state, ripple
        │   │   ├── Modal.jsx            Redux-driven, Esc/backdrop bağla
        │   │   ├── Input.jsx            Password toggle, ikonlar
        │   │   └── InitialLoader.jsx    Premium splash ekran (logo+progress)
        │   ├── cars/
        │   │   └── CarCard.jsx          Heart toggle, hover transform
        │   ├── booking/
        │   │   └── BookingModal.jsx     Tarix seçim + promo + qiymət break
        │   ├── chat/
        │   │   └── ChatPanel.jsx        Floating FAB + söhbətlər + real-time
        │   └── notifications/
        │       └── NotificationDropdown.jsx
        │
        ├── pages/
        │   ├── Home.jsx              Hero + features + featured cars
        │   ├── Cars.jsx              Filter + URL sync + pagination
        │   ├── CarDetail.jsx         Specs + booking modal + reviews
        │   ├── About.jsx             DB-driven (meta.texts override)
        │   ├── Contact.jsx           DB-driven (meta phone/email/address)
        │   ├── NotFound.jsx
        │   ├── auth/
        │   │   ├── Login.jsx
        │   │   ├── Register.jsx      18+ yaş yoxlanışı (Zod refine)
        │   │   ├── AdminLogin.jsx    Gizli giriş
        │   │   └── Auth.css
        │   ├── dashboard/
        │   │   └── Dashboard.jsx     Customer + Renter (rol-əsaslı tab-lar)
        │   └── admin/
        │       └── AdminPanel.jsx    Bütün admin bölmələri tək faylda
        │
        └── styles/
            └── global.css       CSS variables (lüks palitra) + reset + animations
```

---

## 🎨 Lüks Rəng Palitri (Frontend)

CSS dəyişənləri `src/styles/global.css` faylında:

```css
--bg-0: #04040E    /* ən dərin fon */
--bg-1: #08081C    /* ikinci qat */
--bg-2: #0E0E28    /* kart fonu */
--bg-3: #141438    /* hover/üzərlik */

--gold: #D4AF37    /* əsas qızıl */
--purple: #7C3AED  /* bənövşəyi */
--cyan: #06B6D4    /* mavi-yaşıl */

--tx-1: #F0F0FF    /* əsas mətn */
--tx-2: #9090C0    /* ikinci mətn */
--tx-3: #4A4A80    /* solğun mətn */

--font-disp: 'Playfair Display'  /* başlıqlar */
--font-main: 'Inter'             /* UI */
```

Hədəf auditoriya: **18–55 yaş**, premium zövq.

---

## 🗄️ Database Schema

10 cədvəl + 1 view (PostgreSQL 17):

| Cədvəl | Açıqlama |
|---|---|
| `users` | customers + renters + admin (role enum) — 18+ check constraint |
| `refresh_tokens` | JWT refresh token-ləri (bcrypt hashed) |
| `cars` | renter_id FK, full-text search GIN indeksi |
| `bookings` | **EXCLUDE USING GIST** — eyni avtomobil eyni tarixdə 2 rezerv ola bilməz |
| `reviews` | UNIQUE(car_id, customer_id) — bir avtomobilə bir rəy |
| `favorites` | composite PK (user_id, car_id) |
| `chat_messages` | sender + receiver + is_read |
| `notifications` | type, title, message, link, is_read |
| `promo_codes` | code (UNIQUE), discount_pct, max_uses, valid_from/until |
| `site_pages` | CMS — slug ('about', 'contact', 'settings'), title, content, meta JSONB |
| `cars_with_rating` | VIEW — avg_rating və review_count avtomatik |

**Kritik feature:** `bookings` cədvəlində `exclude_overlapping_active_bookings`
exclusion constraint — race condition önləyir.

---

## 🔐 Kimlik məlumatları (demo)

```
Admin    : admin@luxdrive.az / Admin2024!     (rol: admin)
Renter 1 : ali@gmail.com     / Renter123!     (rol: renter)
Renter 2 : nigar@gmail.com   / Renter123!     (rol: renter)
Customer1: murad@gmail.com   / Customer123!   (rol: customer)
Customer2: leyla@gmail.com   / Customer123!   (rol: customer)
```

**Gizli admin girişi:** Logo-ya 5 dəfə ardıcıl klik (2 saniyə içində) → `/admin-login`

---

## 🚀 Tez İşə Salma

### Lokal Development

```bash
# 1. Backend
cd luxdrive-backend
npm install
cp .env.example .env          # DATABASE_URL doldurun (Neon və ya lokal)
npm run db:migrate            # Schema tətbiq edin
npm run db:reseed-passwords   # Demo şifrələri yenilə
npm run dev                   # http://localhost:5000

# 2. Frontend (yeni terminal)
cd luxdrive-frontend
npm install
npm run dev                   # http://localhost:5173 (proxy → :5000)
```

### Lokal PostgreSQL Setup

```bash
# PostgreSQL 17 winget ilə qurulub
# Şifrə: luxdrive_local_2026
# Database: luxdrive

cd luxdrive-backend
npm run db:setup-local        # DB yarat + schema + Neon-dan data köçür
```

---

## 📜 NPM Scripts

### Backend (`luxdrive-backend/package.json`)

| Komanda | Açıqlama |
|---|---|
| `npm start` | Production (`node server.js`) |
| `npm run dev` | nodemon (auto-restart) |
| `npm run db:init` | psql ilə schema tətbiq (psql lazım) |
| `npm run db:migrate` | pg modulu ilə schema (psql lazım deyil) |
| `npm run db:setup-local` | Lokal DB yarat + Neon-dan data köçür |
| `npm run db:reseed-passwords` | Demo şifrələri bcrypt-lə yenilə |
| `npm run change-password <email> <pass>` | İstənilən istifadəçinin şifrəsini dəyiş |
| `npm run gen:secret` | Yeni JWT secret yarat (64 random bytes hex) |

### Frontend (`luxdrive-frontend/package.json`)

| Komanda | Açıqlama |
|---|---|
| `npm run dev` | Vite dev server (`:5173`) |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Build-i lokal yoxla |
| `npm run lint` | ESLint |

---

## 🔧 Mühit Dəyişənləri

### Backend `.env` (lokal)

```env
NODE_ENV=development
PORT=5000

# DB - iki seçim:
# A) Tək URL (Neon, Heroku, Railway formatı):
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# B) Ayrı dəyişənlər (lokal PostgreSQL):
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luxdrive
DB_USER=postgres
DB_PASSWORD=luxdrive_local_2026

# JWT (min 32 simvol)
JWT_SECRET=<64-byte hex>
JWT_REFRESH_SECRET=<başqa 64-byte hex>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS (vergüllə ayrılmış)
CORS_ORIGINS=http://localhost:5173,https://luxdrive-umber.vercel.app

# Rate limit
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
```

### Backend `.env` (Render production)

Eyni amma `NODE_ENV=production` və `CORS_ORIGINS=https://luxdrive-umber.vercel.app`.
Render dashboard-da environment variables təyin edilib.

### Frontend `.env.production`

```env
VITE_API_URL=https://luxdrive-api-1.onrender.com
VITE_SOCKET_URL=https://luxdrive-api-1.onrender.com
```

---

## 🛡️ Təhlükəsizlik Memarlığı

### Authentication
- **bcrypt** (10 round) — bütün şifrələr hash-li
- **JWT access token** — 24 saat, hər API sorğusunda göndərilir
- **JWT refresh token** — 7 gün, DB-də hash-li, rotation pattern
- **Auto-refresh** — Axios interceptor 401 alarkən avtomatik refresh

### Authorization
- **`authenticate` middleware** — JWT + DB-də user yoxlanışı (real-vaxt blok)
- **`requireRole(...roles)`** — rol bazlı icazə
- **`requireOwnership(loader)`** — sahibi yoxla (admin bypass edir)

### Şəbəkə təhlükəsizliyi
- **helmet** — XSS, clickjacking, HSTS (prod), CSP (prod)
- **CORS** — yalnız təyin edilmiş origin-lər
- **Rate limit** — ümumi 100/15dəq, auth 10/15dəq
- **Body limit** — 100KB (DoS önləyici)

### SQL Injection / XSS
- **Parametrli sorğular** — bütün queries `$1, $2...`
- **express-validator** — hər input yoxlanılır
- **DB constraint-lər** — CHECK 18+, UNIQUE, FK, EXCLUDE

### Şifrə dəyişikliyi
- Köhnə şifrə yoxlanılır
- Yeni şifrə bcrypt hash
- **Bütün refresh token-lar ləğv olunur** (digər cihazlardan çıxış)

---

## 📡 API Endpoint-ləri

### Authentication
- `POST /api/auth/register` — qeydiyyat (18+ check, bcrypt hash)
- `POST /api/auth/login` — JWT cüt qaytarır
- `POST /api/auth/admin-login` — yalnız role=admin
- `POST /api/auth/refresh` — yeni cüt (rotation)
- `POST /api/auth/logout` — refresh token silinir
- `GET  /api/auth/me` — cari istifadəçi

### Users
- `GET  /api/users/profile` — öz profili
- `PUT  /api/users/profile` — yenilə (name, phone, avatarUrl)
- `PUT  /api/users/password` — şifrə dəyiş (köhnə yoxlanır)
- `POST /api/users/avatar` — multipart upload (WebP 256x256)
- `DELETE /api/users/profile` — hesabı sil

### Cars
- `GET  /api/cars` — filter+sort+pagination (search, category, priceMin/Max, transmission, fuel, status, sortBy, page, limit)
- `GET  /api/cars/:id` — detal + avg_rating + review_count
- `GET  /api/cars/:id/availability?startDate&endDate` — tarix yoxlanışı
- `POST /api/cars` — yeni (renter+)
- `PUT  /api/cars/:id` — yenilə (sahibi/admin)
- `PATCH /api/cars/:id/availability` — boş/icarədə
- `DELETE /api/cars/:id` — sil (sahibi/admin)

### Bookings
- `POST /api/bookings` — yeni rezervasiya (DB TRANSACTION + promo)
- `GET  /api/bookings/my` — müştərinin
- `GET  /api/bookings/renter/incoming` — icarəçinin
- `GET  /api/bookings/admin/all` — admin
- `PATCH /api/bookings/:id/cancel` — ləğv et (avtomobil yenidən boş)

### Reviews
- `GET  /api/reviews/car/:carId` — public
- `GET  /api/reviews/my` — öz rəylərim
- `POST /api/reviews` — yaz (tamamlanmış rezervasiya + unique check)
- `DELETE /api/reviews/:id` — sil (sahibi/admin)

### Notifications & Chat
- `GET  /api/notifications`
- `GET  /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET  /api/chat/conversations`
- `GET  /api/chat/messages/:userId`
- `GET  /api/chat/unread-count`
- `GET  /api/chat/support` — admin info + onlayn status

### Favorites
- `GET  /api/favorites`
- `GET  /api/favorites/ids` — light response (ID set)
- `POST /api/favorites/:carId/toggle`
- `DELETE /api/favorites/:carId`

### Pages (CMS)
- `GET  /api/pages/:slug` — public (about, contact)
- `GET  /api/admin/pages` — admin
- `PUT  /api/admin/pages/:slug` — admin redaktə

### Admin
- `GET  /api/admin/stats` — dashboard statistika
- `GET  /api/admin/users?role&search&blocked&limit&offset`
- `PUT  /api/admin/users/:id` — ad/telefon yenilə
- `PATCH /api/admin/users/:id/block` — blok/aç (refresh token-ları silir)
- `DELETE /api/admin/users/:id`
- `GET  /api/admin/promo-codes`
- `POST /api/admin/promo-codes`
- `PATCH /api/admin/promo-codes/:id/toggle`
- `DELETE /api/admin/promo-codes/:id`

### Socket.io Events

**Client → Server:**
- `chat:send { receiverId, content }` (ack callback)
- `chat:typing { receiverId, isTyping }`
- `chat:read { senderId }`
- `chat:history { withUserId, before, limit }`
- `notification:fetch { limit }`
- `notification:read { id }`
- `notification:readAll`

**Server → Client:**
- `chat:message` — yeni mesaj
- `chat:typing` — qarşı tərəf yazır
- `chat:read` — mavi tik
- `notification:new` — yeni bildiriş push
- `notification:unreadCount` — badge yenilə
- `user:online` / `user:offline` — presence

---

## 🔄 Auto-Deploy Pipeline

```
Local Code → git push (main branch)
              │
              ├─→ Vercel (frontend)
              │    1. npm install
              │    2. npm run build
              │    3. dist/ → CDN
              │    4. ~2 dəq
              │
              └─→ Render (backend)
                   1. npm install
                   2. npm start
                   3. ~3 dəq (cold start)
```

**Vercel:** `vercel.json` SPA rewrites + cache headers
**Render:** `render.yaml` blueprint (Frankfurt, Node 20, free plan)

---

## ⚠️ Önəmli Qaydalar (Claude üçün)

### Kod stilini saxla
- **Comments Azərbaycan dilində** — istifadəçi azərbaycanlıdır
- **Type:module** ES syntax (`import/export`, `?.`, `??`)
- **Path aliases** istifadə et: `@api`, `@store`, `@routes`, `@hooks`, `@components`, `@pages`
- **Error handling** — bütün async funksiyalarda try/catch
- **Comments yumşaq** — istifadəçi başa düşsün, lakin kod təmiz olsun

### Database qaydaları
- **HEÇ VAXT DROP DATABASE** istifadə etmə production-da
- **Migrations inkremental** — `migrations/` qovluğuna əlavə et, `schema.sql`-i tək dəfə yenidən yaradılma üçün saxla
- **Demo istifadəçi UUID-ləri "nil-style"-dir:**
  - `00000000-0000-0000-0000-000000000001` (admin)
  - `00000000-0000-0000-0000-000000000010` (Ali)
  - `00000000-0000-0000-0000-000000000020` (Murad)
- **Validator gözlənti:** `param('id').matches(UUID_LIKE)` istifadə et, **`isUUID()` istifadə ETMƏ** (nil-style UUID-ləri rədd edir)
  - Helper: `validate.js` → `isUUIDParam('id')`
  - Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

### Frontend qaydaları
- **CSS faylları mütləq git-ə əlavə et!** — yoxsa Vercel build fail olur (məs. `About.css`, `Contact.css` problemi)
- **Lazy load** səhifələr üçün — Vite manualChunks ilə vendor ayrı
- **Redux toolkit** — slice pattern, createAsyncThunk
- **react-hook-form + Zod** form validation üçün
- **react-hot-toast** bildirişlər
- **lucide-react** ikonlar (FontAwesome istifadə etmə)

### Şifrələr və secrets
- **`.env` HEÇ VAXT commit edilməsin** (git-ignored)
- Real şifrələri **chat-də göstərmə** — istifadəçi `.env`-ə özü yazsın
- Demo şifrələri kod-da OK (`schema.sql` seed)
- Push üçün **Personal Access Token** istifadə et, sonra URL-dən təmizlə:
  ```bash
  git remote set-url origin https://USER:TOKEN@github.com/repo.git
  git push
  git remote set-url origin https://github.com/repo.git
  ```

### Race condition önləmə
- **`bookings` cədvəlində EXCLUDE constraint** — eyni avtomobil eyni tarixdə 2 dəfə rezerv edilə BİLMƏZ
- `Booking.create()` `transaction()` ilə işləyir: `FOR UPDATE` lock + DB constraint = 3 qatlı qoruma
- Error code `23P01` (exclusion_violation) `errorHandler.js`-də 409 (DATE_CONFLICT) kimi qaytarılır

---

## 🐛 Bilinən Problemlər və Həllər

| Problem | Səbəb | Həll |
|---|---|---|
| Vercel build "Invalid resolved ID" | CSS/JSX faylı git-ə commit edilməyib | `git status` → untracked faylları add et |
| Admin block/delete 422 verir | Seed UUID nil-style, `isUUID()` rədd edir | `param('id').matches(UUID_LIKE)` |
| Login uğursuz olur amma şifrə düzdü | Seed-də mock bcrypt hash idi | `npm run db:reseed-passwords` |
| 404 görünür amma route var | PageTransition fadeOut animation event sıkışıb | Key-əsaslı re-mount (artıq düzəldildi) |
| Backend 502 verir | Render free tier yatıb | UptimeRobot 5 dəq ping (artıq quruldu) |
| Socket.io qoşulmur | CORS_ORIGINS-də frontend URL yoxdur | Render env-də əlavə et |
| Demo deletion zamanı bütün data itir | CASCADE delete renter → cars → bookings → reviews | `npm run db:migrate` ilə bərpa et |

---

## 🧪 Test Etmək

### Backend health check
```bash
curl https://luxdrive-api-1.onrender.com/health
# {"status":"ok","uptime":...,"env":"production"}
```

### Production login test
```bash
curl -X POST https://luxdrive-api-1.onrender.com/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@luxdrive.az","password":"Admin2024!"}'
```

### Lokal full restart
```bash
taskkill //F //IM node.exe  # bütün node prosesləri dayandır
cd luxdrive-backend && npm run dev &
cd luxdrive-frontend && npm run dev &
```

---

## 📊 İstifadə Statistikası (yaratdığım zaman)

| Kategoriya | Sayı |
|---|---|
| Backend fayl sayı | ~38 |
| Frontend fayl sayı | ~55 |
| DB cədvəl | 10 + 1 view |
| API endpoint | 45+ |
| Socket.io event | 9 |
| Cəmi kod sətri | ~12,000+ |
| Aylıq xərc | $0 |

---

## 🔮 Gələcək Genişlənmələr

Növbəti iterasiyada əlavə oluna bilər:
- **Custom domain** (`luxdrive.az`)
- **Stripe / EPoint** ödəniş inteqrasiyası
- **Email service** (Resend / Brevo) — qeydiyyat təsdiqi, şifrə bərpası
- **Multi-language** (AZ / EN / RU)
- **Real-time map** (avtomobil yerləri)
- **Mobile app** (React Native)
- **AI tövsiyə sistemi** (oxşar avtomobillər)
- **Multi-admin** — bir neçə admin hesabı
- **Audit log** — admin əməliyyatları izi
- **Backup automation** — Neon PITR

---

## 🤝 Claude Code Tövsiyələri

Bu layihədə yeni dəyişikliklər edərkən:

1. **Read CLAUDE.md** — bu fayl tam strukturu izah edir
2. **Use path aliases** — `@store/slices/...` yaz, relative path yox
3. **Test locally first** — `npm run build` frontend-də xəta olub-olmadığını yoxlayır
4. **Verify file is in git** — `git status` ilə untracked faylları yoxla
5. **Don't break demo seeds** — schema.sql-də UUID-lər çox yerə referans verir
6. **Bcrypt-li şifrələr lazımdırsa** — `reseed-passwords.js` istifadə et
7. **Migrations inkremental** — `migrations/00X_*.sql` ilə əlavə et, schema.sql-i dəyişmə
8. **Push pattern:**
   ```bash
   git add <specific files>
   git commit -m "..."
   git remote set-url origin https://USER:TOKEN@github.com/...
   git push
   git remote set-url origin https://github.com/...
   ```

---

**Son yenilənmə:** 2026-05-24
**Versiya:** 1.0 (Production deployed)
**Status:** 🟢 LIVE — https://luxdrive-umber.vercel.app
