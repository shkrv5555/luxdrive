# Backend — Claude Code Sənədi

> Tam strukturu görmək üçün: `../CLAUDE.md`

## Stack
Node.js 20+ • Express 4 • Socket.io 4 • PostgreSQL 17 (Neon) • JWT + bcrypt • Multer + Sharp

## Quick Start
```bash
npm install
cp .env.example .env  # DATABASE_URL doldur
npm run db:migrate    # Schema tətbiq et
npm run dev           # :5000
```

## Memarlıq Pattern-ləri

### Layer separation
```
Routes → Controllers → Models → DB
   ↓        ↓             ↓
Validation  Business    SQL
            Logic
```
**Controller-lər birbaşa SQL YAZMIR** — Models çağırır.

### Transaction pattern (race-safe booking)
```javascript
// src/models/Booking.js
return await transaction(async (client) => {
  await client.query('SELECT ... FOR UPDATE');
  await client.query('INSERT INTO bookings ...'); // EXCLUDE constraint
  await client.query('UPDATE cars SET ...');
});
```

### Error handling
```javascript
// Controller-də
throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');

// Route-da
router.post('/path', asyncHandler(controller.method));

// errorHandler.js mərkəzi olaraq tutur
```

## Önəmli Fayllar

| Fayl | Vəzifə |
|---|---|
| `server.js` | Entry point, middleware pipeline, route mounting |
| `src/config/database.js` | pg Pool + `query()` + `transaction()` helper |
| `src/config/socket.js` | Socket.io + JWT auth + presence (`isOnline`, `emitToUser`) |
| `src/middleware/auth.js` | `authenticate`, `requireRole`, `requireOwnership` |
| `src/middleware/validate.js` | express-validator + `isUUIDParam` (nil-UUID dəstəyi) |
| `src/utils/jwt.js` | Token cüt yaratma + rotation |
| `database/schema.sql` | Tam DB schema (10 cədvəl + indekslər + view-lər) |

## DB UUID Validation

**ŞIDDƏTLİ QAYDA:** Seed istifadəçilərinin UUID-ləri "nil-style"-dir:
```
00000000-0000-0000-0000-000000000001  (admin)
00000000-0000-0000-0000-000000000010  (Əli)
00000000-0000-0000-0000-000000000020  (Murad)
```

Bunlar `isUUID()` ilə **rədd edilir** (versiya/variant biti yoxdur).

**HƏMİŞƏ istifadə et:**
```javascript
import { isUUIDParam } from '../middleware/validate.js';
// və ya
param('id').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
```

## Şifrə əməliyyatları

```bash
# Demo şifrələri yenilə (UNUTMA: schema.sql-də hash-lar mockdur)
npm run db:reseed-passwords

# İstənilən istifadəçinin şifrəsini dəyiş
npm run change-password admin@luxdrive.az NewSecurePass123!

# Yeni JWT secret yarat
npm run gen:secret
```

## Sosket.io Pattern

```javascript
// İstifadəçi qoşulur → socket.join(`user:${userId}`)
// Mesaj göndərmə üçün:
io.to(`user:${receiverId}`).emit('chat:message', payload);

// Model-dən real-time push:
emitToUser(userId, 'notification:new', notif);
```

## Migrations Pattern

`database/migrations/00X_*.sql` — inkremental, idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

`schema.sql` — DROP TABLE ilə tam yenidən qurma (yalnız ilk setup üçün).

Yeni dəyişiklik:
1. Yeni fayl: `migrations/003_xxx.sql`
2. İdempotent yaz
3. Lokal + Neon-da tətbiq et
4. `schema.sql`-i də yenilə (gələcək freşh setup üçün)
