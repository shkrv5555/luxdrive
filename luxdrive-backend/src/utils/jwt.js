/**
 * ════════════════════════════════════════════════════════════
 * JWT Helper — Access + Refresh Token məntiqi
 * ════════════════════════════════════════════════════════════
 *
 * 2-token strategiyası:
 * • access token — qısa müddətli (24s), hər API sorğusunda göndərilir
 * • refresh token — uzun müddətli (7g), DB-də hash şəklində saxlanılır
 *
 * Access token compromise olarsa, sadəcə 24 saat zərər verir.
 * Refresh token DB-də saxlandığı üçün admin onu istənilən vaxt
 * ləğv edə (`DELETE FROM refresh_tokens`) bilər.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../config/database.js';

const JWT_SECRET         = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES     = process.env.JWT_EXPIRES_IN         || '24h';
const REFRESH_EXPIRES    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Konfiqurasiya yoxlaması — JWT_SECRET olmadan server başlamamalıdır
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('❌ JWT_SECRET və JWT_REFRESH_SECRET .env-də təyin edilməlidir!');
  process.exit(1);
}

/**
 * Access token yarat — payload-da yalnız vacib sahələr
 * Heç vaxt password, email_verified, və s. həssas data əlavə etmə!
 */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub:  user.id,
      role: user.role,
      // İsteğe bağlı: rate limiting üçün istifadəçi nüsxəsi
      v: user.token_version || 0,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES, issuer: 'luxdrive-api' }
  );
}

/**
 * Refresh token yarat və DB-də saxla
 *
 * @param {object} user - {id, role}
 * @param {object} meta - {userAgent, ipAddress}
 * @returns {string} raw refresh token (yalnız client-ə qaytarılır)
 */
export async function createRefreshToken(user, meta = {}) {
  // Random 64-byte token (jwt deyil, sadə kriptoqrafik təsadüfi simvol)
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);

  // 7 gün sonrası tarix
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // DB-də saxla — hash şəklində (kompromis olarsa raw token görünməsin)
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash, meta.userAgent || null, meta.ipAddress || null, expiresAt]
  );

  return rawToken;
}

/**
 * Access token-i yoxla
 * @throws JWT xətaları (TokenExpiredError, JsonWebTokenError)
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Refresh token-i yoxla və yeni access token qaytar
 * Köhnə refresh token DB-dən silinir, yenisi yaradılır (rotation)
 */
export async function rotateRefreshToken(rawToken, meta = {}) {
  if (!rawToken) throw new Error('Refresh token yoxdur');

  // DB-də saxlanılan bütün refresh token-ları al və hash müqayisəsi et
  const { rows } = await query(
    `SELECT rt.*, u.id, u.role, u.is_blocked
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.expires_at > NOW()`
  );

  // Hash müqayisəsi (bcrypt.compare const-time-dır → timing attack qoruması)
  let matched = null;
  for (const row of rows) {
    if (await bcrypt.compare(rawToken, row.token_hash)) {
      matched = row;
      break;
    }
  }

  if (!matched) throw new Error('Yanlış və ya istifadədən çıxmış refresh token');
  if (matched.is_blocked) throw new Error('İstifadəçi bloklanmışdır');

  // Köhnə refresh token-i sil (rotation)
  await query('DELETE FROM refresh_tokens WHERE id = $1', [matched.id]);

  // Yeni cüt yarat
  const accessToken = signAccessToken(matched);
  const newRefreshToken = await createRefreshToken(matched, meta);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: { id: matched.id, role: matched.role },
  };
}

/**
 * Logout — refresh token-i DB-dən sil
 */
export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const { rows } = await query('SELECT id, token_hash FROM refresh_tokens');
  for (const row of rows) {
    if (await bcrypt.compare(rawToken, row.token_hash)) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
      return;
    }
  }
}

/**
 * İstifadəçinin BÜTÜN refresh token-larını ləğv et
 * (məsələn şifrə dəyişəndə və ya admin blok edəndə)
 */
export async function revokeAllUserTokens(userId) {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}
