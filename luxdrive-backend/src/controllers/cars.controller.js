/**
 * ════════════════════════════════════════════════════════════
 * Cars Controller
 * ════════════════════════════════════════════════════════════
 *
 * Avtomobillərin idarəetmə məntiqi:
 * • list   — public (filter, pagination)
 * • get    — public
 * • create — yalnız renter/admin
 * • update — sahibi və ya admin
 * • delete — sahibi və ya admin
 */
import * as Car from '../models/Car.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * GET /api/cars
 *
 * Query params (hamısı opsional):
 *   ?search=bmw
 *   ?category=luxury
 *   ?transmission=auto
 *   ?fuel=electric
 *   ?status=available
 *   ?priceMin=100&priceMax=300
 *   ?sortBy=price_asc
 *   ?page=1&limit=12
 *   ?renterId=<uuid>  (icarəçinin öz avtomobilləri)
 */
export async function list(req, res) {
  // Pagination — sahə tələbləri yoxla
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const offset = (page - 1) * limit;

  // Enum dəyərlərini whitelist ilə yoxla
  const allowedCategories = ['economy', 'business', 'luxury', 'suv', 'sport'];
  const allowedTrans = ['auto', 'manual'];
  const allowedFuels = ['petrol', 'diesel', 'hybrid', 'electric'];
  const allowedStatus = ['available', 'rented'];

  const filter = {
    search: req.query.search?.trim() || undefined,
    category: allowedCategories.includes(req.query.category) ? req.query.category : undefined,
    transmission: allowedTrans.includes(req.query.transmission) ? req.query.transmission : undefined,
    fuel: allowedFuels.includes(req.query.fuel) ? req.query.fuel : undefined,
    status: allowedStatus.includes(req.query.status) ? req.query.status : undefined,
    priceMin: req.query.priceMin ? parseFloat(req.query.priceMin) : undefined,
    priceMax: req.query.priceMax ? parseFloat(req.query.priceMax) : undefined,
    renterId: req.query.renterId || undefined,
    sortBy: req.query.sortBy || 'newest',
    limit, offset,
  };

  const { items, total } = await Car.findAll(filter);

  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    },
  });
}

/**
 * GET /api/cars/:id
 */
export async function get(req, res) {
  const car = await Car.findById(req.params.id);
  if (!car) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }
  res.json({ car });
}

/**
 * POST /api/cars
 * Yalnız renter və admin tərəfindən
 */
export async function create(req, res) {
  // Admin başqasının adından da yarada bilər (renterId verirsə)
  const renterId = req.user.role === 'admin' && req.body.renterId
    ? req.body.renterId
    : req.user.id;

  const car = await Car.create({ ...req.body, renterId });
  res.status(201).json({ message: 'Avtomobil əlavə edildi', car });
}

/**
 * PUT /api/cars/:id
 * Yalnız sahibi və ya admin
 */
export async function update(req, res) {
  const car = await Car.update(req.params.id, req.body);
  if (!car) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }
  res.json({ message: 'Yeniləndi', car });
}

/**
 * PATCH /api/cars/:id/availability
 * { isAvailable: true|false }
 */
export async function setAvailability(req, res) {
  const { isAvailable } = req.body;
  const car = await Car.setAvailability(req.params.id, isAvailable);
  if (!car) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }
  res.json({ message: 'Status dəyişdirildi', car });
}

/**
 * DELETE /api/cars/:id
 */
export async function remove(req, res) {
  const deleted = await Car.deleteById(req.params.id);
  if (!deleted) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }
  res.json({ message: 'Avtomobil silindi' });
}

/**
 * GET /api/cars/:id/availability?startDate=...&endDate=...
 * Frontend booking modalında müraciət edir
 */
export async function checkAvailability(req, res) {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    throw new HttpError(400, 'MISSING_DATES', 'startDate və endDate parametrləri tələb olunur');
  }
  const available = await Car.isAvailableForDates(req.params.id, startDate, endDate);
  res.json({ available });
}
