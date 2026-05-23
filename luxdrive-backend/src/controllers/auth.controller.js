/**
 * ════════════════════════════════════════════════════════════
 * Auth Controller — Qeydiyyat, giriş, çıxış, token yeniləmə
 * ════════════════════════════════════════════════════════════
 */
import * as User from '../models/User.js';
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../utils/jwt.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * Yaş hesablaması — DB-də constraint var, lakin əvvəlcə burda yoxlamaq
 * daha yaxşı UX təmin edir (DB-yə getməyə ehtiyac yox).
 */
function calculateAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * POST /api/auth/register
 *
 * Body: { email, password, name, phone, dateOfBirth, role }
 * Returns: { user, accessToken, refreshToken }
 */
export async function register(req, res) {
  const { email, password, name, phone, dateOfBirth, role } = req.body;

  // Yaş yoxlaması
  if (calculateAge(dateOfBirth) < 18) {
    throw new HttpError(400, 'AGE_RESTRICTION',
      'Qeydiyyat üçün ən azı 18 yaşında olmalısınız');
  }

  // Email artıq mövcuddurmu?
  const existing = await User.findByEmail(email);
  if (existing) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Bu e-mail artıq qeydiyyatdan keçib');
  }

  // İcazə verilən rollar (admin yox — admin yalnız seed-də yaradılır)
  if (role && !['customer', 'renter'].includes(role)) {
    throw new HttpError(400, 'INVALID_ROLE', 'Yanlış rol');
  }

  // İstifadəçi yarat
  const user = await User.create({
    email, password, name, phone, dateOfBirth,
    role: role || 'customer',
  });

  // Token cütü yarat
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  res.status(201).json({
    message: 'Qeydiyyat uğurlu',
    user,
    accessToken,
    refreshToken,
  });
}

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 * Returns: { user, accessToken, refreshToken }
 */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);

  // İstifadəçi tapılmayan / şifrə yanlış — eyni mesajla qaytar
  // (təhlükəsizlik: enumeration attack qarşısı)
  if (!user || !(await User.verifyPassword(password, user.password_hash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail və ya şifrə yanlışdır');
  }

  if (user.is_blocked) {
    throw new HttpError(403, 'USER_BLOCKED',
      'Hesabınız bloklanmışdır. Dəstək ilə əlaqə saxlayın.');
  }

  // Son login zamanını yenilə
  await User.updateLastLogin(user.id);

  // Token cütü
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  // Cavabdan password_hash sahəsini çıxar
  const { password_hash, ...safeUser } = user;

  res.json({
    message: 'Giriş uğurlu',
    user: safeUser,
    accessToken,
    refreshToken,
  });
}

/**
 * POST /api/auth/refresh
 *
 * Body: { refreshToken }
 * Returns: { accessToken, refreshToken }   (rotation - yeni cüt qaytarılır)
 */
export async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new HttpError(400, 'MISSING_TOKEN', 'Refresh token tələb olunur');
  }

  try {
    const result = await rotateRefreshToken(refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    throw new HttpError(401, 'INVALID_REFRESH_TOKEN', err.message);
  }
}

/**
 * POST /api/auth/logout
 *
 * Body: { refreshToken }
 */
export async function logout(req, res) {
  const { refreshToken } = req.body;
  await revokeRefreshToken(refreshToken);
  res.json({ message: 'Çıxış uğurlu' });
}

/**
 * GET /api/auth/me
 *
 * Headers: Authorization: Bearer <accessToken>
 * Returns: cari istifadəçi məlumatları
 */
export async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'İstifadəçi tapılmadı');
  }
  res.json({ user });
}

/**
 * POST /api/auth/admin-login
 *
 * Adi login-dən fərqli: yalnız role='admin' olan istifadəçilərə icazə verir.
 * Brute-force qoruması üçün authLimiter ilə qorunmalıdır.
 */
export async function adminLogin(req, res) {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);
  if (!user || !(await User.verifyPassword(password, user.password_hash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Kimlik məlumatları yanlışdır');
  }
  if (user.role !== 'admin') {
    // Eyni mesajla qaytar ki, admin email-i izah olunmasın
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Kimlik məlumatları yanlışdır');
  }
  if (user.is_blocked) {
    throw new HttpError(403, 'USER_BLOCKED', 'Hesabınız bloklanmışdır');
  }

  await User.updateLastLogin(user.id);
  const accessToken = signAccessToken(user);
  const refreshToken = await createRefreshToken(user, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  const { password_hash, ...safeUser } = user;
  res.json({ message: 'Admin girişi uğurlu', user: safeUser, accessToken, refreshToken });
}
