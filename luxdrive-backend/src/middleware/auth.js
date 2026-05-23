/**
 * ════════════════════════════════════════════════════════════
 * Authentication Middleware
 * ════════════════════════════════════════════════════════════
 *
 * • authenticate — Bearer JWT-ni yoxlayır, req.user təyin edir
 * • requireRole(...roles) — yalnız müəyyən rola icazə verir
 * • optionalAuth — token olsa istifadəçini qoyur, olmasa keçir
 */
import { verifyAccessToken } from '../utils/jwt.js';
import { query } from '../config/database.js';

/**
 * Tələb olunan autentifikasiya.
 * Authorization: Bearer <token> başlığını yoxlayır.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Avtorizasiya tələb olunur',
      });
    }

    const token = authHeader.slice(7); // "Bearer " ardından
    const payload = verifyAccessToken(token);

    // DB-dən aktual istifadəçi məlumatını çək — `is_blocked` real-vaxt yoxlamaq üçün
    const { rows } = await query(
      `SELECT id, email, name, role, is_blocked, avatar_url, phone
       FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'USER_NOT_FOUND', message: 'İstifadəçi tapılmadı' });
    }
    if (rows[0].is_blocked) {
      return res.status(403).json({ error: 'USER_BLOCKED', message: 'Hesabınız bloklanmışdır' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TOKEN_EXPIRED', message: 'Token müddəti bitmişdir' });
    }
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Yanlış token' });
  }
}

/**
 * Rol yoxlaması — authenticate-dən sonra istifadə edilir
 *
 * Misal: router.delete('/cars/:id', authenticate, requireRole('renter', 'admin'), handler)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Bu əməliyyat üçün icazəniz yoxdur (tələb olunan: ${allowedRoles.join(', ')})`,
      });
    }
    next();
  };
}

/**
 * Resurs sahibi yoxlaması — istifadəçi yalnız öz datasını dəyişə bilər
 *
 * @param {function} resourceLoader - async (req) => {ownerId} qaytaran funksiya
 */
export function requireOwnership(resourceLoader) {
  return async (req, res, next) => {
    try {
      const resource = await resourceLoader(req);
      if (!resource) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Resurs tapılmadı' });
      }
      // Admin hər şeyə icazə verilir
      if (req.user.role === 'admin') return next();
      // Sahibi yoxla
      if (resource.ownerId !== req.user.id) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Yalnız öz resurslarınızı idarə edə bilərsiniz',
        });
      }
      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Opsional autentifikasiya — token olsa istifadəçini təyin edir,
 * olmasa keçir. Public + auth nüsxəsi olan endpoint-lər üçün.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    const { rows } = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1 AND is_blocked = FALSE',
      [payload.sub]
    );
    if (rows[0]) req.user = rows[0];
  } catch {
    // Yanlış token sessə — sadəcə davam et
  }
  next();
}
