/**
 * ════════════════════════════════════════════════════════════
 * Neon → Lokal PostgreSQL Migration
 * ════════════════════════════════════════════════════════════
 *
 * Bu skript:
 *   1. Neon-dakı DB-yə qoşulur
 *   2. Bütün cədvəllərdən məlumatları oxuyur
 *   3. Lokal PostgreSQL-ə yazır
 *
 * İstifadə:
 *   node database/migrate-from-neon.js
 *
 * Tələblər:
 *   • Lokal PostgreSQL işləməlidir (port 5432)
 *   • `luxdrive` adında lokal DB yaradılmış olmalıdır
 *   • Schema artıq tətbiq edilməlidir (npm run db:migrate ilə)
 *   • .env-də həm DATABASE_URL (Neon), həm də DB_* (lokal) olmalıdır
 */
import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

// Köçürüləcək cədvəllər — sıra mühümdür (foreign key əlaqəsi)
const TABLES = [
  'users',
  'promo_codes',
  'cars',
  'bookings',
  'reviews',
  'favorites',
  'chat_messages',
  'notifications',
  'refresh_tokens',
];

async function migrate() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  📦 Neon → Lokal PostgreSQL Migration');
  console.log('══════════════════════════════════════════════════\n');

  // ── 1. Neon-a qoşul (mənbə) ─────────────────────────────
  console.log('🌍 Neon-a qoşulur...');
  const neon = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await neon.connect();
  console.log('✅ Neon qoşuldu\n');

  // ── 2. Lokal DB-yə qoşul (hədəf) ────────────────────────
  console.log('💻 Lokal PostgreSQL-ə qoşulur...');
  const local = new Client({
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT) || 5432,
    database: process.env.LOCAL_DB_NAME || 'luxdrive',
    user: process.env.LOCAL_DB_USER || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD,
  });
  await local.connect();
  console.log('✅ Lokal DB qoşuldu\n');

  console.log('🔄 Köçürmə başlayır...\n');

  // ── 3. Hər cədvəli köçür ────────────────────────────────
  for (const table of TABLES) {
    process.stdout.write(`  📋 ${table.padEnd(20)}... `);

    // Neon-dan oxu
    const { rows } = await neon.query(`SELECT * FROM ${table}`);
    if (rows.length === 0) {
      console.log('boş ⚪');
      continue;
    }

    // Köhnə məlumatları lokal-da sil (təmiz başlamaq üçün)
    // CASCADE deyil, çünki sıra ilə tabloları doldururuq
    await local.query(`DELETE FROM ${table}`);

    // Sütun adlarını al
    const columns = Object.keys(rows[0]);
    const colNames = columns.map((c) => `"${c}"`).join(', ');

    // Hər sətr üçün INSERT
    let inserted = 0;
    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})`;
      try {
        await local.query(sql, values);
        inserted++;
      } catch (err) {
        console.log(`\n     ⚠️  Sətir köçürülə bilmədi: ${err.message.slice(0, 80)}`);
      }
    }
    console.log(`${inserted}/${rows.length} sətr köçürüldü ✅`);
  }

  // ── 4. Sequence-ləri yenilə ─────────────────────────────
  // UUID istifadə etdiyimiz üçün sequence yoxdur, amma əmin olaq
  console.log('\n🔧 Cədvəl statistikası yenilənir...');
  await local.query('ANALYZE');

  // ── 5. Hesabat ──────────────────────────────────────────
  console.log('\n📊 Yekun məlumatlar (lokal DB):');
  for (const table of TABLES) {
    const { rows } = await local.query(`SELECT COUNT(*) AS n FROM ${table}`);
    console.log(`   • ${table.padEnd(20)} ${rows[0].n} sətr`);
  }

  await neon.end();
  await local.end();

  console.log('\n══════════════════════════════════════════════════');
  console.log('  🎉 Migration TAMAMLANDI!');
  console.log('══════════════════════════════════════════════════\n');
  console.log('İndi backend-i lokal DB ilə işə salmaq üçün .env-də');
  console.log('DATABASE_URL-i şərhə alın və DB_* dəyişənlərini aktivləşdirin.\n');
}

migrate().catch((err) => {
  console.error('❌ Migration xətası:', err.message);
  process.exit(1);
});
