/**
 * ════════════════════════════════════════════════════════════
 * Page Model — Sayt səhifələrinin məzmunu
 * ════════════════════════════════════════════════════════════
 *
 * Public səhifələr (About, Contact, və s.) məzmunu DB-də saxlanır
 * ki, admin paneldən redaktə oluna bilsin.
 */
import { query } from '../config/database.js';

/**
 * Slug-a görə səhifə tap (public istifadə üçün)
 */
export async function findBySlug(slug) {
  const { rows } = await query(
    `SELECT slug, title, content, meta, updated_at FROM site_pages WHERE slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

/**
 * Bütün səhifələrin siyahısı (admin üçün)
 */
export async function findAll() {
  const { rows } = await query(`
    SELECT
      sp.slug, sp.title, sp.content, sp.meta, sp.updated_at,
      u.name AS updated_by_name
    FROM site_pages sp
    LEFT JOIN users u ON u.id = sp.updated_by
    ORDER BY sp.slug
  `);
  return rows;
}

/**
 * Səhifəni yenilə (admin yalnız)
 * Mövcud olmazsa, yaratılır (upsert)
 */
export async function upsert({ slug, title, content, meta, updatedBy }) {
  const { rows } = await query(`
    INSERT INTO site_pages (slug, title, content, meta, updated_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (slug) DO UPDATE
      SET title      = EXCLUDED.title,
          content    = EXCLUDED.content,
          meta       = EXCLUDED.meta,
          updated_by = EXCLUDED.updated_by
    RETURNING *
  `, [slug, title, content, meta || {}, updatedBy]);
  return rows[0];
}
