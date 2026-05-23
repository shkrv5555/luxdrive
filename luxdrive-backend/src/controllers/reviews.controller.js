/**
 * ════════════════════════════════════════════════════════════
 * Reviews Controller
 * ════════════════════════════════════════════════════════════
 */
import * as Review from '../models/Review.js';
import * as Car from '../models/Car.js';
import * as Notification from '../models/Notification.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * GET /api/reviews/car/:carId
 * Public — hər kəs görə bilər
 */
export async function listByCar(req, res) {
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const result = await Review.findByCar(req.params.carId, { limit, offset });
  res.json(result);
}

/**
 * GET /api/reviews/my
 * Müştəri öz rəylərini görür
 */
export async function myReviews(req, res) {
  const reviews = await Review.findByCustomer(req.user.id);
  res.json({ reviews });
}

/**
 * POST /api/reviews
 *
 * Body: { carId, rating, comment, bookingId? }
 *
 * Qaydalar:
 * • Yalnız müştəri rəy yaza bilər
 * • Avtomobil üçün ən azı 1 tamamlanmış rezervasiya olmalıdır
 * • Eyni avtomobilə təkrar rəy ola bilməz (DB UNIQUE qoruyur)
 */
export async function create(req, res) {
  const { carId, rating, comment } = req.body;
  const customerId = req.user.id;

  if (req.user.role !== 'customer') {
    throw new HttpError(403, 'CUSTOMER_ONLY', 'Yalnız müştərilər rəy yaza bilər');
  }

  // Avtomobil mövcud olmalıdır
  const car = await Car.findById(carId);
  if (!car) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }

  // Tamamlanmış rezervasiya yoxla
  const completed = await Review.hasCompletedBooking(carId, customerId);
  if (!completed) {
    throw new HttpError(403, 'NO_COMPLETED_BOOKING',
      'Rəy yazmaq üçün əvvəlcə bu avtomobili icarəyə götürüb rezervasiyanı tamamlamalısınız');
  }

  // Təkrar rəy yoxla
  const exists = await Review.existsForCar(carId, customerId);
  if (exists) {
    throw new HttpError(409, 'REVIEW_EXISTS', 'Bu avtomobil üçün artıq rəy yazmısınız');
  }

  const review = await Review.create({
    carId, customerId, bookingId: completed.id, rating, comment,
  });

  // İcarəçiyə bildiriş — Notification model real-time push edir
  await Notification.create({
    userId: car.renter_id,
    type: 'review',
    title: `Yeni ${rating}★ rəy`,
    message: `${req.user.name} ${car.brand} ${car.model} avtomobilinizə rəy yazdı: "${comment.slice(0, 100)}..."`,
    link: `/cars/${carId}`,
  });

  res.status(201).json({ message: 'Rəy əlavə edildi', review });
}

/**
 * DELETE /api/reviews/:id
 * Sahibi və ya admin
 */
export async function remove(req, res) {
  const deleted = await Review.deleteById(req.params.id);
  if (!deleted) {
    throw new HttpError(404, 'REVIEW_NOT_FOUND', 'Rəy tapılmadı');
  }
  res.json({ message: 'Rəy silindi' });
}

/**
 * GET /api/reviews/admin/all (admin)
 */
export async function adminListAll(req, res) {
  const limit  = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const result = await Review.findAll({ limit, offset });
  res.json(result);
}
