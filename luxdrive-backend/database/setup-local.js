/**
 * ════════════════════════════════════════════════════════════
 * Lokal PostgreSQL Setup Avtomatlaşdırılması
 * ════════════════════════════════════════════════════════════
 *
 * Bu skript bütün setup addımlarını avtomatik icra edir:
 *   1. Lokal PostgreSQL-ə qoşulma yoxlanışı
 *   2. `luxdrive` adında DB yaratma (yoxdursa)
 *   3. Schema-nı tətbiq etmə (cədvəllər, indekslər, view-lər)
 *   4. Neon-dan data oxuyub lokal-a yazma
 *   5. Hesabat
 *
 * İstifadə: node database/setup-local.js
 *
 * Tələblər:
 *   • PostgreSQL 17 lokal qurulmuş olmalıdır
 *   • postgres istifadəçisinin şifrəsi LOCAL_DB_PASSWORD-də olmalıdır
 *   • DATABASE_URL Neon-a göstərməlidir (mənbə üçün)
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));

const LOCAL_CONFIG = {
  host:     process.env.LOCAL_DB_HOST     || 'localhost',
  port:     parseInt(process.env.LOCAL_DB_PORT) || 5432,
  user:     process.env.LOCAL_DB_USER     || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || 'postgres',
};

const TABLES = [
  'users', 'promo_codes', 'cars', 'bookings',
  'reviews', 'favorites', 'chat_messages',
  'notifications', 'refresh_tokens',
];

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🚀 LuxDrive: Lokal DB Setup + Neon Migration');
  console.log('══════════════════════════════════════════════════\n');

  // ── 1. PostgreSQL-ə qoşulma yoxlanışı ───────────────────
  console.log('1️⃣  Lokal PostgreSQL-ə qoşulma yoxlanır...');
  let admin;
  try {
    admin = new Client({ ...LOCAL_CONFIG, database: 'postgres' });
    await admin.connect();
    console.log('   ✅ Qoşuldu (postgres DB)\n');
  } catch (err) {
    console.error('   ❌ Qoşulma alınmadı:', err.message);
    console.error('   💡 PostgreSQL service işləyir? `services.msc` → postgresql-x64-17 → Running');
    process.exit(1);
  }

  // ── 2. luxdrive DB yarat (yoxdursa) ─────────────────────
  console.log('2️⃣  `luxdrive` adında DB yaradılır...');
  const { rows } = await admin.query(
    `SELECT 1 FROM pg_database WHERE datname = 'luxdrive'`
  );
  if (rows.length === 0) {
    await admin.query('CREATE DATABASE luxdrive');
    console.log('   ✅ DB yaradıldı\n');
  } else {
    console.log('   ℹ️  DB artıq mövcuddur\n');
  }
  await admin.end();

  // ── 3. luxdrive DB-yə qoşul və schema tətbiq et ─────────
  console.log('3️⃣  Schema tətbiq edilir...');
  const local = new Client({ ...LOCAL_CONFIG, database: 'luxdrive' });
  await local.connect();

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  await local.query(schema);
  console.log('   ✅ Schema tətbiq edildi (10 cədvəl, indekslər, view-lər)\n');

  // ── 4. Neon-dan data köçür ──────────────────────────────
  console.log('4️⃣  Neon-dan məlumatlar köçürülür...');

  if (!process.env.DATABASE_URL) {
    console.log('   ⚠️  DATABASE_URL təyin olunmayıb — köçürmə atlandı');
    console.log('   ℹ️  Schema seed-i istifadə olunacaq');
  } else {
    const neon = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await neon.connect();
    console.log('   ✅ Neon qoşuldu\n');

    for (const table of TABLES) {
      process.stdout.write(`   📋 ${table.padEnd(20)} `);
      const { rows: neonRows } = await neon.query(`SELECT * FROM ${table}`);

      if (neonRows.length === 0) {
        console.log('boş (seed istifadə olunur)');
        continue;
      }

      // Köhnə seed məlumatlarını sil
      await local.query(`DELETE FROM ${table}`);

      const columns = Object.keys(neonRows[0]);
      const colNames = columns.map((c) => `"${c}"`).join(', ');
      let ok = 0;

      for (const row of neonRows) {
        const vals = columns.map((c) => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        try {
          await local.query(
            `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})`,
            vals
          );
          ok++;
        } catch {}
      }
      console.log(`${ok}/${neonRows.length} köçürüldü ✅`);
    }
    await neon.end();
  }

  // ── 5. Hesabat ───────────────────────────────────────────
  console.log('\n5️⃣  Yekun hesabat:');
  for (const table of TABLES) {
    const { rows: cnt } = await local.query(`SELECT COUNT(*) AS n FROM ${table}`);
    console.log(`   • ${table.padEnd(20)} ${cnt[0].n} sətr`);
  }

  await local.end();

  console.log('\n══════════════════════════════════════════════════');
  console.log('  🎉 LOKAL DB HAZIRDIR!');
  console.log('══════════════════════════════════════════════════');
  console.log('  Host:     localhost');
  console.log('  Port:     5432');
  console.log('  Database: luxdrive');
  console.log('  User:     postgres');
  console.log('══════════════════════════════════════════════════\n');
  console.log('Backend-i lokal DB ilə işə salmaq üçün .env-də:');
  console.log('  1. DATABASE_URL sətrini şərhə alın (#)');
  console.log('  2. DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD aktivləşdirin');
  console.log('  3. npm run dev\n');
}

run().catch((err) => {
  console.error('\n❌ Xəta:', err.message);
  process.exit(1);
});
