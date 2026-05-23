/**
 * ════════════════════════════════════════════════════════════
 * Database Migration Runner
 * ════════════════════════════════════════════════════════════
 *
 * `psql` CLI olmadan schema.sql faylını tətbiq edir.
 * `pg` modulu ilə birbaşa Node.js-dən işləyir.
 *
 * İstifadə: npm run db:migrate
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Connection — DATABASE_URL üstünlük verilir (Neon/cloud üçün)
const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Neon SSL tələb edir
    }
  : {
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'luxdrive',
      user:     process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

async function migrate() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  📦 LuxDrive DB Migration');
  console.log('══════════════════════════════════════════════════\n');

  const client = new Client(config);

  try {
    console.log('🔌 Verilənlər bazasına qoşulur...');
    await client.connect();
    console.log('✅ Qoşuldu\n');

    // Schema-nı oxu
    const schemaPath = join(__dirname, 'schema.sql');
    console.log(`📄 Schema oxunur: ${schemaPath}`);
    const schema = readFileSync(schemaPath, 'utf-8');
    console.log(`   Ölçü: ${(schema.length / 1024).toFixed(1)} KB\n`);

    console.log('⚙️  Schema tətbiq edilir...');
    await client.query(schema);
    console.log('✅ Schema uğurla tətbiq edildi\n');

    // Yaradılmış cədvəlləri yoxla
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Yaradılmış cədvəllər (${rows.length}):`);
    rows.forEach((r) => console.log(`   • ${r.table_name}`));

    // Nümunəvi məlumatları yoxla
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) AS n FROM users'),
      client.query('SELECT COUNT(*) AS n FROM cars'),
      client.query('SELECT COUNT(*) AS n FROM promo_codes'),
    ]);

    console.log('\n📈 Nümunəvi məlumatlar:');
    console.log(`   • İstifadəçilər: ${counts[0].rows[0].n}`);
    console.log(`   • Avtomobillər:  ${counts[1].rows[0].n}`);
    console.log(`   • Promo kodlar:  ${counts[2].rows[0].n}`);

    console.log('\n══════════════════════════════════════════════════');
    console.log('  🎉 Migration TAMAMLANDI!');
    console.log('══════════════════════════════════════════════════\n');
    console.log('İndi serveri işə sala bilərsiniz: npm run dev\n');
  } catch (err) {
    console.error('\n❌ Migration xətası:');
    console.error(`   ${err.message}\n`);
    if (err.code === 'ECONNREFUSED') {
      console.error('   💡 PostgreSQL serveri işləmir və ya yanlış host/port.');
    } else if (err.code === '28P01') {
      console.error('   💡 İstifadəçi adı və ya şifrə yanlışdır (.env yoxlayın).');
    } else if (err.code === '3D000') {
      console.error('   💡 Verilənlər bazası mövcud deyil. Əvvəlcə yaradın.');
    } else if (err.message?.includes('SSL')) {
      console.error('   💡 SSL problemi. DATABASE_URL-də sslmode=require var?');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
