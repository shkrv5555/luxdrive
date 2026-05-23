-- ════════════════════════════════════════════════════════════
-- Migration 001: site_pages cədvəli
-- ════════════════════════════════════════════════════════════
-- Mövcud datanı silmir — yalnız yeni cədvəl əlavə edir
--
-- Tətbiq: psql və ya node-pg ilə icra edin
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_pages (
    slug          VARCHAR(50)  PRIMARY KEY,         -- 'about', 'contact', 'privacy'
    title         VARCHAR(200) NOT NULL,
    content       TEXT         NOT NULL,            -- HTML/Markdown məzmun
    meta          JSONB        DEFAULT '{}',        -- Strukturlaşdırılmış əlavə data
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by    UUID         REFERENCES users(id) ON DELETE SET NULL
);

-- Trigger: updated_at avtomatik yenilənməsi
CREATE OR REPLACE FUNCTION update_site_pages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_site_pages_updated ON site_pages;
CREATE TRIGGER trg_site_pages_updated
    BEFORE UPDATE ON site_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_site_pages_timestamp();

-- ── İLKİN MƏZMUN ────────────────────────────────────────
-- ON CONFLICT DO NOTHING: yenidən icra edilərsə mövcud datanı silmir

INSERT INTO site_pages (slug, title, content, meta) VALUES
(
  'about',
  'LuxDrive Haqqında',
  '<p><strong>LuxDrive</strong> — Azərbaycanın ən premium avtomobil icarə platformasıdır. 2024-cü ildə yaradılmış platformamız, lüks və komfort axtaranlar üçün etibarlı seçim olmağı hədəfləyir.</p>

<h3>Misyonumuz</h3>
<p>Avtomobil icarəsi prosesini sadələşdirmək, müştərilərimizə premium təcrübə təqdim etmək və hər bir səfərinizi unudulmaz etmək.</p>

<h3>Niyə LuxDrive?</h3>
<ul>
  <li>✅ <strong>500+</strong> seçilmiş premium avtomobil</li>
  <li>✅ Tam sığortalı və yoxlanmış sürücülük</li>
  <li>✅ 24/7 dəstək xidməti</li>
  <li>✅ Saniyələr içində rezervasiya</li>
  <li>✅ Şəffaf qiymət — gizli xərclər yox</li>
</ul>

<h3>Komandamız</h3>
<p>Avtomobil sənayesində 10+ illik təcrübəyə malik mütəxəssislər komandası 24/7 sizinlə işləyir.</p>',
  '{"established": 2024, "cars_count": 500, "happy_clients": 5000}'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO site_pages (slug, title, content, meta) VALUES
(
  'contact',
  'Bizimlə Əlaqə',
  '<p>Sualınız və ya təklifiniz var? Bizimlə əlaqə saxlayın — 24 saat ərzində cavab verəcəyik.</p>

<h3>Ofis ünvanımız</h3>
<p>Bakı şəhəri, Azərbaycan</p>

<h3>İş saatları</h3>
<p>Hər gün: <strong>09:00 – 22:00</strong></p>
<p>Onlayn dəstək: <strong>24/7</strong></p>',
  '{"phone": "+994 50 000 00 00", "email": "info@luxdrive.az", "whatsapp": "+994500000000", "instagram": "luxdrive.az", "facebook": "luxdrive.az", "address": "Bakı şəhəri, Azərbaycan", "working_hours": "Hər gün 09:00 – 22:00", "map_embed": ""}'
)
ON CONFLICT (slug) DO NOTHING;
