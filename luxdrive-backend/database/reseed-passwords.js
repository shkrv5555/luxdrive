/**
 * ════════════════════════════════════════════════════════════
 * Seed Password Fixer
 * ════════════════════════════════════════════════════════════
 *
 * schema.sql-də mock bcrypt hash-lar vardı — bu skript onları
 * real bcrypt hash-lər ilə əvəz edir ki, demo istifadəçilər
 * əslində giriş edə bilsin.
 *
 * İstifadə: node database/reseed-passwords.js
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Client } = pkg;

// Demo istifadəçi şifrələri (oxunaqlı format)
const USERS = [
  { email: 'admin@luxdrive.az', password: 'Admin2024!' },
  { email: 'ali@gmail.com',     password: 'Renter123!' },
  { email: 'nigar@gmail.com',   password: 'Renter123!' },
  { email: 'murad@gmail.com',   password: 'Customer123!' },
  { email: 'leyla@gmail.com',   password: 'Customer123!' },
];

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=disable')
        ? false
        : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'luxdrive',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🔐 Demo şifrələri real bcrypt hash-lərlə yenilənir');
  console.log('══════════════════════════════════════════════════\n');

  const client = new Client(config);
  await client.connect();

  for (const { email, password } of USERS) {
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await client.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, email]
    );
    console.log(`  ${rowCount > 0 ? '✅' : '⚠️ '} ${email.padEnd(25)} → ${password}`);
  }

  await client.end();

  console.log('\n══════════════════════════════════════════════════');
  console.log('  🎉 Tamamlandı! İndi cəhd edin:');
  console.log('══════════════════════════════════════════════════');
  console.log('  Admin:    admin@luxdrive.az / Admin2024!');
  console.log('  Renter:   ali@gmail.com / Renter123!');
  console.log('  Customer: murad@gmail.com / Customer123!');
  console.log('══════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('❌ Xəta:', err.message);
  process.exit(1);
});
