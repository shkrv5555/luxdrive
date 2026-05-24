-- ════════════════════════════════════════════════════════════
-- Migration 002: Sayt ümumi tənzimləmələri
-- ════════════════════════════════════════════════════════════
-- 'settings' slug-ı ilə site_pages-də xüsusi sətr yaradır.
-- Admin paneldə "Tənzimləmələr" bölməsindən redaktə edilir.

INSERT INTO site_pages (slug, title, content, meta) VALUES
(
  'settings',
  'Sayt Tənzimləmələri',
  '<!-- Bu səhifə birbaşa public olaraq açılmır, sadəcə tənzimləmələr saxlayır -->',
  '{
    "site_name": "LuxDrive",
    "site_name_accent": "Drive",
    "tagline": "Premium Avtomobil İcarəsi",
    "location_city": "Bakı",
    "location_country": "Azərbaycan",
    "location_address": "Bakı şəhəri, Nəsimi rayonu",
    "location_district": "Nəsimi",
    "support_phone": "+994 50 000 00 00",
    "support_email": "info@luxdrive.az",
    "working_hours": "Hər gün 09:00 — 22:00",
    "primary_color": "gold",
    "currency": "₼",
    "language": "az"
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
