/**
 * ════════════════════════════════════════════════════════════
 * PostgreSQL Connection Pool
 * ════════════════════════════════════════════════════════════
 * pg modulu connection pool-u idarə edir — hər sorğu üçün
 * yeni bağlantı açmaq əvəzinə hazır bağlantı götürür.
 *
 * `query()` helper-i ilə həm normal sorğu, həm də tranzaksiya
 * (atomik əməliyyatlar) etmək olar.
 */
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

// Connection konfiqurasiyası
const poolConfig = process.env.DATABASE_URL
  ? {
      // Tək URL formatı (Neon, Heroku, Railway, Supabase üçün)
      connectionString: process.env.DATABASE_URL,
      // Cloud Postgres provayderləri SSL tələb edir (development-də belə)
      // URL-də `sslmode=disable` varsa SSL söndürülür
      ssl: process.env.DATABASE_URL.includes('sslmode=disable')
        ? false
        : { rejectUnauthorized: false },
    }
  : {
      // Lokal PostgreSQL üçün ayrıca dəyişənlər
      host: process.env.DB_HOST     || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'luxdrive',
      user: process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD,
    };

// Pool ümumi parametrləri
const pool = new Pool({
  ...poolConfig,
  max: 20,                          // maksimum 20 paralel bağlantı
  idleTimeoutMillis: 30_000,        // 30 san istifadəsiz qalan bağlantı bağlanır
  connectionTimeoutMillis: 5_000,   // 5 san timeout
});

// İlk bağlantını yoxla
pool.on('connect', () => {
  // Hər yeni bağlantı zamanı zaman zonasını UTC-yə qur
  // (bu, datetime məsələlərini önləyir)
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool xətası:', err);
  // process.exit(-1) çağırılmır — pool özü təkrar bağlantı qurmağa cəhd edir
});

/**
 * Sadə sorğu üçün wrapper.
 * Tranzaksiya lazım deyilsə bunu istifadə et.
 *
 * @param {string} text - SQL sorğu mətni (parametrlər $1, $2... ilə)
 * @param {array}  params - Parametr dəyərləri
 * @returns {Promise<{rows, rowCount}>}
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Tranzaksiya helper-i.
 * Race condition önləmək üçün rezervasiya yaradanda istifadə olunur.
 *
 * İstifadə:
 *   await transaction(async (client) => {
 *     await client.query('UPDATE cars SET ...');
 *     await client.query('INSERT INTO bookings ...');
 *   });
 */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Server start-up zamanı bağlantı sağlamlığını yoxla
 */
export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() as time, version() as version');
    console.log(`✅ PostgreSQL qoşuldu @ ${res.rows[0].time}`);
    console.log(`   Versiya: ${res.rows[0].version.split(',')[0]}`);
    return true;
  } catch (err) {
    console.error('❌ DB bağlantı xətası:', err.message);
    return false;
  }
}

export default pool;
