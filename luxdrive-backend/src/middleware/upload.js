/**
 * ════════════════════════════════════════════════════════════
 * Upload Middleware — Multer + Sharp
 * ════════════════════════════════════════════════════════════
 *
 * • multer — multipart/form-data parse edir
 * • sharp — şəkilləri resize/optimize edir (avatar üçün 256x256)
 *
 * Təhlükəsizlik:
 * • Yalnız image/* MIME tipləri qəbul edilir
 * • Magic bytes ilə fayl tipini sharp özü yoxlayır
 *   (kompromis: fayl uzantısına etibar etmirik)
 * • Maks fayl ölçüsü: .env-də MAX_FILE_SIZE_MB
 */
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Upload qovluğunun mövcud olduğunu təmin et
async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(path.join(UPLOAD_DIR, 'avatars'), { recursive: true });
  await fs.mkdir(path.join(UPLOAD_DIR, 'cars'),    { recursive: true });
}
ensureDir().catch(console.error);

// Multer storage — yaddaşda saxla (sharp-a ötürmək üçün)
const storage = multer.memoryStorage();

const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

/**
 * Yalnız şəkil tiplərini qəbul et
 * (real yoxlamanı sharp özü magic bytes ilə edir)
 */
function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Yalnız şəkil fayllarına icazə verilir'), false);
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('avatar');

export const uploadCarImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('image');

/**
 * Avatar emalı — sharp ilə kvadrat 256x256, JPEG 80%
 * Multer-dən sonra çağırılır, req.file.buffer mövcuddur.
 */
export async function processAvatar(req, res, next) {
  if (!req.file) return next();
  try {
    const filename = `${uuidv4()}.webp`;
    const filepath = path.join(UPLOAD_DIR, 'avatars', filename);
    await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);
    // İstifadəçi köhnə avatarını yenidən yükləməsi üçün URL:
    req.uploadedUrl = `/uploads/avatars/${filename}`;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Avtomobil şəkli emalı — geniş kart üçün 1200x800, WebP
 */
export async function processCarImage(req, res, next) {
  if (!req.file) return next();
  try {
    const filename = `${uuidv4()}.webp`;
    const filepath = path.join(UPLOAD_DIR, 'cars', filename);
    await sharp(req.file.buffer)
      .resize(1200, 800, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);
    req.uploadedUrl = `/uploads/cars/${filename}`;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Köhnə fayl silmə — şifrə dəyişəndə və ya avatar yenilənəndə
 */
export async function deleteUpload(urlPath) {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  try {
    const fullPath = path.join(UPLOAD_DIR, urlPath.replace('/uploads/', ''));
    await fs.unlink(fullPath);
  } catch {
    // Fayl yoxdursa, sakit ol
  }
}

export { UPLOAD_DIR };
