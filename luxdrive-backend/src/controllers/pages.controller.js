/**
 * ════════════════════════════════════════════════════════════
 * Pages Controller — Sayt səhifələri (About, Contact, ...)
 * ════════════════════════════════════════════════════════════
 */
import * as Page from '../models/Page.js';
import { HttpError } from '../middleware/errorHandler.js';

// İcazə verilən slug-lar (öncədən təyin olunmuş səhifələr)
const ALLOWED_SLUGS = ['about', 'contact', 'privacy', 'terms'];

/**
 * GET /api/pages/:slug
 * Public — istənilən səhifənin məzmununu qaytarır
 */
export async function getPage(req, res) {
  const { slug } = req.params;
  if (!ALLOWED_SLUGS.includes(slug)) {
    throw new HttpError(404, 'INVALID_PAGE', 'Belə səhifə mövcud deyil');
  }

  const page = await Page.findBySlug(slug);
  if (!page) {
    throw new HttpError(404, 'PAGE_NOT_FOUND', 'Səhifə tapılmadı');
  }
  res.json({ page });
}

/**
 * GET /api/admin/pages
 * Admin — bütün səhifələrin siyahısı
 */
export async function listPagesAdmin(req, res) {
  const pages = await Page.findAll();
  res.json({ pages });
}

/**
 * PUT /api/admin/pages/:slug
 * Admin — səhifə məzmununu yenilə (və ya yarat)
 */
export async function updatePageAdmin(req, res) {
  const { slug } = req.params;
  if (!ALLOWED_SLUGS.includes(slug)) {
    throw new HttpError(400, 'INVALID_SLUG', `Slug yalnız bunlar ola bilər: ${ALLOWED_SLUGS.join(', ')}`);
  }

  const { title, content, meta } = req.body;
  const updated = await Page.upsert({
    slug,
    title,
    content,
    meta: meta || {},
    updatedBy: req.user.id,
  });
  res.json({ message: 'Səhifə yeniləndi', page: updated });
}
