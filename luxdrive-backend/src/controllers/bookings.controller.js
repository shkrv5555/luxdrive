/**
 * ════════════════════════════════════════════════════════════
 * Bookings Controller
 * ════════════════════════════════════════════════════════════
 *
 * Booking yaratma axını:
 * 1. Tarix yoxlanışı (start < end, gələcəkdə)
 * 2. Avtomobil tapılır, qiymət oxunur
 * 3. Promo kodu varsa endirim hesablanır
 * 4. Booking.create() çağırılır — DB tranzaksiyası
 * 5. Race condition → 409 (DATE_CONFLICT) avtomatik
 * 6. Uğurda bildiriş icarəçiyə gedir
 */
import * as Booking from '../models/Booking.js';
import * as Car from '../models/Car.js';
import * as Notification from '../models/Notification.js';
import { query } from '../config/database.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * Promo kodunu DB-də yoxla və endirim faizini qaytar
 * Faydası bittiisə yaxud max_uses aşıbsa null qaytarır
 */
async function validatePromoCode(code) {
  if (!code) return null;
  const { rows } = await query(`
    SELECT * FROM promo_codes
    WHERE code = $1
      AND is_active = TRUE
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      AND (valid_from  IS NULL OR valid_from  <= CURRENT_DATE)
      AND (max_uses    IS NULL OR uses_count < max_uses)
  `, [code.toUpperCase()]);
  return rows[0] || null;
}

/**
 * POST /api/bookings
 *
 * Body: { carId, startDate, endDate, promoCode? }
 */
export async function create(req, res) {
  const { carId, startDate, endDate, promoCode } = req.body;
  const customerId = req.user.id;

  // İcarəçilər/Admin başqasına aid avtomobili rezerv edə bilər,
  // amma rolu 'renter' olanlar etməsin (öz avtomobilləri ola bilər)
  if (req.user.role === 'renter') {
    throw new HttpError(403, 'RENTER_CANNOT_BOOK',
      'İcarəçilər rezervasiya edə bilməz. Müştəri hesabı ilə daxil olun.');
  }

  // Tarix yoxlanışları
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpError(400, 'INVALID_DATE', 'Düzgün tarix daxil edin');
  }
  if (start < today) {
    throw new HttpError(400, 'PAST_DATE', 'Keçmiş tarix seçilə bilməz');
  }
  if (end <= start) {
    throw new HttpError(400, 'INVALID_RANGE', 'Bitmə tarixi başlama tarixindən sonra olmalıdır');
  }

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Avtomobili tap
  const car = await Car.findById(carId);
  if (!car) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }
  // Öz avtomobilini rezerv etmək olmaz
  if (car.renter_id === customerId) {
    throw new HttpError(400, 'OWN_CAR', 'Öz avtomobilinizi rezerv edə bilməzsiniz');
  }

  // Promo kodunu yoxla
  let discountPct = 0;
  let appliedPromo = null;
  if (promoCode) {
    appliedPromo = await validatePromoCode(promoCode);
    if (!appliedPromo) {
      throw new HttpError(400, 'INVALID_PROMO', 'Promo kodu yanlış və ya istifadədən çıxmışdır');
    }
    discountPct = appliedPromo.discount_pct;
  }

  // Qiymət hesabla
  const pricePerDay = parseFloat(car.price_per_day);
  const subtotal = pricePerDay * days;
  const discountAmt = subtotal * discountPct / 100;
  const totalPrice = +(subtotal - discountAmt).toFixed(2);

  try {
    const booking = await Booking.create({
      carId,
      customerId,
      renterId: car.renter_id,
      startDate,
      endDate,
      days,
      pricePerDay,
      discountPct,
      promoCode: appliedPromo?.code || null,
      totalPrice,
    });

    // Promo istifadə sayğacını artır
    if (appliedPromo) {
      await query(
        `UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = $1`,
        [appliedPromo.id]
      );
    }

    // İcarəçiyə bildiriş — Notification model real-time push əlavə edir
    await Notification.create({
      userId: car.renter_id,
      type: 'booking',
      title: 'Yeni rezervasiya!',
      message: `${req.user.name} ${car.brand} ${car.model} avtomobilinizi ${days} günlüyünə rezerv etdi.`,
      link: `/dashboard/bookings/${booking.id}`,
    });
    // Müştəriyə təsdiq bildirişi
    await Notification.create({
      userId: customerId,
      type: 'booking',
      title: 'Rezervasiya təsdiqləndi',
      message: `${car.brand} ${car.model} ${startDate} – ${endDate} tarixləri üçün rezerv edildi. Cəmi: ₼${totalPrice}`,
      link: `/dashboard/bookings/${booking.id}`,
    });

    res.status(201).json({
      message: 'Rezervasiya yaradıldı',
      booking,
      breakdown: {
        days,
        pricePerDay,
        subtotal,
        discountPct,
        discountAmt: +discountAmt.toFixed(2),
        totalPrice,
      },
    });
  } catch (err) {
    // DB exclusion constraint xətası → 409 (errorHandler-də)
    throw err;
  }
}

/**
 * GET /api/bookings/my
 * Müştəri öz rezervasiyalarını görür
 */
export async function myBookings(req, res) {
  const { status } = req.query;
  const bookings = await Booking.findByCustomer(req.user.id, status);
  res.json({ bookings });
}

/**
 * GET /api/bookings/renter/incoming
 * İcarəçi öz avtomobillərinə gələn rezervasiyalar
 */
export async function incomingBookings(req, res) {
  const { status } = req.query;
  const bookings = await Booking.findByRenter(req.user.id, status);
  res.json({ bookings });
}

/**
 * GET /api/bookings/:id
 */
export async function get(req, res) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw new HttpError(404, 'BOOKING_NOT_FOUND', 'Rezervasiya tapılmadı');
  }
  // Yalnız müştəri, icarəçi və admin görə bilər
  const allowed = [booking.customer_id, booking.renter_id].includes(req.user.id)
                  || req.user.role === 'admin';
  if (!allowed) {
    throw new HttpError(403, 'FORBIDDEN', 'İcazəniz yoxdur');
  }
  res.json({ booking });
}

/**
 * PATCH /api/bookings/:id/cancel
 */
export async function cancel(req, res) {
  try {
    const booking = await Booking.cancel(req.params.id, req.user.id);

    // İcarəçiyə bildiriş — sahibi xəbər almalıdır
    await Notification.create({
      userId: booking.renter_id,
      type: 'booking',
      title: 'Rezervasiya ləğv edildi',
      message: `${req.user.name} rezervasiyanı ləğv etdi. Avtomobil yenidən boşdur.`,
      link: `/dashboard/bookings/${booking.id}`,
    });

    res.json({ message: 'Rezervasiya ləğv edildi', booking });
  } catch (err) {
    if (err.code === 'BOOKING_NOT_FOUND') throw new HttpError(404, err.code, err.message);
    if (err.code === 'FORBIDDEN')          throw new HttpError(403, err.code, err.message);
    if (err.code === 'NOT_CANCELLABLE')    throw new HttpError(400, err.code, err.message);
    throw err;
  }
}

/**
 * GET /api/bookings/admin/all (admin)
 */
export async function adminListAll(req, res) {
  const limit  = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const result = await Booking.findAll({
    status: req.query.status, limit, offset,
  });
  res.json(result);
}
