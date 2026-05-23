/**
 * ════════════════════════════════════════════════════════════
 * Favorites Controller
 * ════════════════════════════════════════════════════════════
 */
import * as Favorite from '../models/Favorite.js';
import * as Car from '../models/Car.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * GET /api/favorites
 * Cari istifadəçinin bütün favorit avtomobilləri
 */
export async function list(req, res) {
  const favorites = await Favorite.findByUser(req.user.id);
  res.json({ favorites });
}

/**
 * GET /api/favorites/ids
 * Yalnız car ID-lər (kartlarda heart düyməsinin vəziyyəti üçün)
 */
export async function listIds(req, res) {
  const ids = await Favorite.getIdsByUser(req.user.id);
  res.json({ ids, count: ids.length });
}

/**
 * POST /api/favorites/:carId
 */
export async function add(req, res) {
  // Avtomobil mövcuddurmu?
  const car = await Car.findById(req.params.carId);
  if (!car) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }
  await Favorite.add(req.user.id, req.params.carId);
  res.json({ message: 'Favoritlərə əlavə edildi', favorited: true });
}

/**
 * DELETE /api/favorites/:carId
 */
export async function remove(req, res) {
  const removed = await Favorite.remove(req.user.id, req.params.carId);
  if (!removed) {
    throw new HttpError(404, 'NOT_FAVORITED', 'Bu avtomobil favoritlərinizdə deyil');
  }
  res.json({ message: 'Favoritlərdən çıxarıldı', favorited: false });
}

/**
 * POST /api/favorites/:carId/toggle
 * Yoxdursa əlavə et, varsa çıxar (frontend üçün rahatlıq)
 */
export async function toggle(req, res) {
  const car = await Car.findById(req.params.carId);
  if (!car) {
    throw new HttpError(404, 'CAR_NOT_FOUND', 'Avtomobil tapılmadı');
  }

  const isFav = await Favorite.exists(req.user.id, req.params.carId);
  if (isFav) {
    await Favorite.remove(req.user.id, req.params.carId);
    return res.json({ favorited: false, message: 'Favoritlərdən çıxarıldı' });
  } else {
    await Favorite.add(req.user.id, req.params.carId);
    return res.json({ favorited: true, message: 'Favoritlərə əlavə edildi' });
  }
}
