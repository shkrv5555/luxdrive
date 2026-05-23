/**
 * ════════════════════════════════════════════════════════════
 * Universal Şifrə Dəyişmə Skripti
 * ════════════════════════════════════════════════════════════
 *
 * İstənilən istifadəçinin (admin, müştəri, icarəçi) şifrəsini
 * birbaşa verilənlər bazasında bcrypt hash ilə dəyişir.
 *
 * İstifadə:
 *   node database/change-password.js <email> <yeni-şifrə>
 *
 * Misal:
 *   node database/change-password.js admin@luxdrive.az MeniumSifrem2024!
 *   node database/change-password.js ali@gmail.com BasqaSifrem123
 *
 * Qeyd:
 *   - Şifrə ən azı 8 simvol olmalıdır
 *   - 1 böyük hərf, 1 rəqəm tövsiyə olunur
 *   - Dəyişdikdən sonra istifadəçi bütün cihazlardan çıxarılır
 *     (refresh tokenlər silinir — yenidən daxil olmaq lazımdır)
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Client } = pkg;

// ─── Komand satırı arqumentləri ────────────────────────
const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error('\n❌ İstifadə qaydası:');
  console.error('   node database/change-password.js <email> <yeni-şifrə>\n');
  console.error('   Misal:');
  console.error('   node database/change-password.js admin@luxdrive.az YeniSifrem2024!\n');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error('❌ Şifrə ən azı 8 simvol olmalıdır');
  process.exit(1);
}

// ─── DB konfiqurasiyası ─────────────────────────────────
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

async function changePassword() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🔐 Şifrə dəyişmə alət');
  console.log('══════════════════════════════════════════════════\n');

  const client = new Client(config);
  await client.connect();

  // İstifadəçini tap
  const { rows } = await client.query(
    'SELECT id, name, role FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    console.error(`❌ ${email} ünvanı ilə istifadəçi tapılmadı\n`);
    await client.end();
    process.exit(1);
  }

  const user = rows[0];
  console.log(`📋 İstifadəçi:  ${user.name}`);
  console.log(`📧 Email:       ${email}`);
  console.log(`🎭 Rol:         ${user.role}\n`);

  // Şifrəni hash et və yenilə
  console.log('⚙️  Yeni şifrə bcrypt ilə hash edilir...');
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await client.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [passwordHash, user.id]
  );
  console.log('✅ Şifrə yeniləndi\n');

  // Bütün aktiv sessiyaları ləğv et (təhlükəsizlik)
  const { rowCount } = await client.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1',
    [user.id]
  );
  console.log(`🔒 ${rowCount} aktiv sessiya ləğv edildi (digər cihazlardan çıxış)`);

  await client.end();

  console.log('\n══════════════════════════════════════════════════');
  console.log('  ✅ Tamamlandı!');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Email:  ${email}`);
  console.log(`  Şifrə:  ${newPassword}`);
  console.log('══════════════════════════════════════════════════\n');
  console.log('İndi yeni şifrə ilə daxil ola bilərsiniz.\n');
}

changePassword().catch((err) => {
  console.error('❌ Xəta:', err.message);
  process.exit(1);
});
