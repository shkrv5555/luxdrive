/**
 * ════════════════════════════════════════════════════════════
 * Users Controller — Profil idarəetməsi
 * ════════════════════════════════════════════════════════════
 *
 * Burada yalnız öz profili ilə bağlı əməliyyatlar var.
 * Admin tərəfindən idarə → admin.controller.js
 */
import * as User from '../models/User.js';
import { HttpError } from '../middleware/errorHandler.js';
import { revokeAllUserTokens } from '../utils/jwt.js';
import { deleteUpload } from '../middleware/upload.js';

/**
 * GET /api/users/profile
 * Cari istifadəçinin tam profili
 */
export async function getProfile(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'İstifadəçi tapılmadı');
  }
  res.json({ user });
}

/**
 * PUT /api/users/profile
 *
 * Body: { name, phone, avatarUrl }
 * Email və dateOfBirth dəyişdirilə bilməz (təhlükəsizlik səbəbi ilə)
 */
export async function updateProfile(req, res) {
  const { name, phone, avatarUrl } = req.body;
  const updated = await User.updateProfile(req.user.id, { name, phone, avatarUrl });
  res.json({ message: 'Profil yeniləndi', user: updated });
}

/**
 * PUT /api/users/password
 *
 * Body: { oldPassword, newPassword }
 *
 * Təhlükəsizlik:
 * • Köhnə şifrə yoxlanılır (rebra qoruyur)
 * • Yeni şifrə hash edilir
 * • Bütün refresh token-lar silinir (digər cihazlar çıxış olur)
 */
export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body;

  if (oldPassword === newPassword) {
    throw new HttpError(400, 'SAME_PASSWORD', 'Yeni şifrə köhnədən fərqli olmalıdır');
  }

  // DB-dən şifrə hash-i ilə birgə istifadəçi
  const user = await User.findByEmail(req.user.email);
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'İstifadəçi tapılmadı');
  }

  // Köhnə şifrə yoxla
  const ok = await User.verifyPassword(oldPassword, user.password_hash);
  if (!ok) {
    throw new HttpError(401, 'INVALID_OLD_PASSWORD', 'Köhnə şifrə yanlışdır');
  }

  // Yeni şifrəni təyin et
  await User.updatePassword(req.user.id, newPassword);

  // Bütün refresh token-ları ləğv et — istifadəçi bütün cihazlardan çıxır
  // (təhlükəsizlik: ola bilsin ki, kompromis var idi)
  await revokeAllUserTokens(req.user.id);

  res.json({
    message: 'Şifrə dəyişdirildi. Digər cihazlardan çıxış edildi.',
  });
}

/**
 * POST /api/users/avatar
 *
 * multipart/form-data: avatar=@file
 * Multer + sharp middleware-i `req.uploadedUrl` təyin edir.
 */
export async function uploadAvatar(req, res) {
  if (!req.uploadedUrl) {
    throw new HttpError(400, 'NO_FILE', 'Şəkil yüklənmədi');
  }

  // Köhnə avatarı sil (yaddaş təmizliyi)
  const current = await User.findById(req.user.id);
  if (current?.avatar_url) {
    await deleteUpload(current.avatar_url);
  }

  // Yeni URL-i yenilə
  const updated = await User.updateProfile(req.user.id, {
    avatarUrl: req.uploadedUrl,
  });

  res.json({ message: 'Avatar yeniləndi', user: updated });
}

/**
 * DELETE /api/users/profile
 * Öz hesabını sil (məlumat qoruması — GDPR right to be forgotten)
 */
export async function deleteOwnAccount(req, res) {
  // Admin öz hesabını sil bilməz (təhlükəsizlik üçün)
  if (req.user.role === 'admin') {
    throw new HttpError(403, 'ADMIN_DELETE_FORBIDDEN',
      'Admin öz hesabını silə bilməz. Başqa admin etməlidir.');
  }

  await User.deleteUser(req.user.id);
  res.json({ message: 'Hesabınız silindi' });
}
