/**
 * Tək məqsədli skript: Neon DB-də demo istifadəçi şifrələrini yenilə
 * (Lokal .env DB-yə baxırsa belə, bu skript birbaşa Neon-a qoşulur)
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Client } = pkg;

// Neon production URL — birbaşa burada (test üçün)
const NEON_URL = 'postgresql://neondb_owner:npg_agbnit1UNRL5@ep-round-night-altaflny-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const USERS = [
  { email: 'admin@luxdrive.az', password: 'Admin2024!' },
  { email: 'ali@gmail.com',     password: 'Renter123!' },
  { email: 'nigar@gmail.com',   password: 'Renter123!' },
  { email: 'murad@gmail.com',   password: 'Customer123!' },
  { email: 'leyla@gmail.com',   password: 'Customer123!' },
];

(async () => {
  const c = new Client({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log('🌍 Neon-a qoşuldu\n');

  for (const { email, password } of USERS) {
    const hash = await bcrypt.hash(password, 10);
    const { rowCount } = await c.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, email]
    );
    console.log(`  ${rowCount ? '✅' : '⚠️ '} ${email.padEnd(25)} → ${password}`);
  }
  await c.end();
  console.log('\n🎉 Neon production istifadəçi şifrələri yeniləndi!');
})();
