# LuxDrive Backend API

Premium avtomobil icarəsi platforması üçün RESTful API + Real-time çat.

## Texnologiya Stack-i

- **Runtime:** Node.js 20+
- **Framework:** Express.js 4
- **Verilənlər Bazası:** PostgreSQL 15+
- **Autentifikasiya:** JWT (jsonwebtoken) + bcrypt
- **Real-time:** Socket.io 4
- **Validasiya:** express-validator
- **Şəkil yükləmə:** multer + sharp
- **Təhlükəsizlik:** helmet, cors, express-rate-limit

## Quraşdırma

```bash
# 1. Asılılıqları yüklə
npm install

# 2. PostgreSQL-də DB yarat
createdb luxdrive

# 3. Schema-nı tətbiq et
psql -d luxdrive -f database/schema.sql

# 4. Mühit dəyişənlərini konfiqurasiya et
cp .env.example .env
# .env faylını redaktə edin (DB kredensialları, JWT_SECRET)

# 5. Serveri işə sal
npm run dev    # development (nodemon)
npm start      # production
```

## API Endpoint-ləri

### Autentifikasiya
- `POST /api/auth/register` — Qeydiyyat (müştəri / icarəçi)
- `POST /api/auth/login` — Giriş (JWT qaytarır)
- `POST /api/auth/admin-login` — Admin girişi
- `POST /api/auth/refresh` — Token yeniləmə
- `POST /api/auth/logout` — Çıxış (refresh token-i ləğv edir)
- `GET  /api/auth/me` — Cari istifadəçi (token tələb olunur)

### İstifadəçilər
- `GET    /api/users/profile` — Öz profilim
- `PUT    /api/users/profile` — Profili yenilə
- `PUT    /api/users/password` — Şifrəni dəyiş
- `POST   /api/users/avatar` — Avatar yüklə (multipart)

### Avtomobillər
- `GET    /api/cars` — Siyahı (filter, sort, pagination)
- `GET    /api/cars/:id` — Detal
- `POST   /api/cars` — Yeni əlavə et (renter+)
- `PUT    /api/cars/:id` — Yenilə (sahib və ya admin)
- `DELETE /api/cars/:id` — Sil (sahib və ya admin)
- `PATCH  /api/cars/:id/availability` — Boş/icarədə statusu

### Rezervasiyalar
- `POST   /api/bookings` — Yeni rezervasiya (tarix uyğunluğu yoxlanılır)
- `GET    /api/bookings/my` — Mənim rezervasiyalarım
- `PATCH  /api/bookings/:id/cancel` — Ləğv et
- `GET    /api/bookings/admin/all` — Bütün rezervasiyalar (admin)

### Rəylər
- `GET    /api/reviews/car/:carId` — Avtomobil rəyləri
- `POST   /api/reviews` — Rəy yaz (yalnız tamamlanmış rezervasiya sonrası)
- `DELETE /api/reviews/:id` — Sil (sahib və ya admin)

### Admin
- `GET    /api/admin/stats` — Ümumi statistika
- `GET    /api/admin/users` — Bütün istifadəçilər
- `PATCH  /api/admin/users/:id/block` — Blokla/aç
- `DELETE /api/admin/users/:id` — Sil

### Real-time (Socket.io)
- `connect` — JWT-ilə autentifikasiya
- `chat:send` — Mesaj göndər
- `chat:receive` — Yeni mesaj
- `notification:new` — Real-vaxt bildiriş

## Təhlükəsizlik

- ✅ Bütün şifrələr **bcrypt** ilə hash edilir (10 round)
- ✅ JWT 24 saat etibarlıdır, refresh token 7 gün
- ✅ Bütün giriş `express-validator` ilə yoxlanılır (SQLi/XSS önləmə)
- ✅ Rate limit: 100 sorğu / 15 dəqiqə (auth-da daha sıx)
- ✅ Helmet HTTP başlıqlarını qoruyur
- ✅ CORS yalnız təyin edilmiş domenə icazə verir
- ✅ Admin endpoint-ləri `role:admin` middleware-i ilə qorunur
- ✅ Rezervasiya yaratmaq DB tranzaksiyası ilə (race condition önləmə)

## Layihə Strukturu

```
luxdrive-backend/
├── server.js              # Giriş nöqtəsi
├── package.json
├── .env.example
├── database/
│   └── schema.sql         # PostgreSQL schema + seed
└── src/
    ├── config/
    │   ├── database.js    # pg pool
    │   └── socket.js      # Socket.io setup
    ├── middleware/
    │   ├── auth.js        # JWT verification + role check
    │   ├── validate.js    # express-validator wrapper
    │   ├── errorHandler.js
    │   └── rateLimit.js
    ├── routes/            # Express routerlər
    ├── controllers/       # Biznes məntiqi
    ├── models/            # DB sorğuları
    ├── sockets/           # Socket.io handler-lər
    └── utils/             # JWT, logger, helpers
```
