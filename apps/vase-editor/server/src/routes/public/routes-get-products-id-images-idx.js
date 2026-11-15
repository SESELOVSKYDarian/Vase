// Rutas de public.js: get-products-id-images-idx, get-pages-slug-media-sectionid.
import { pool } from '../../db.js';
import { getValueByPath, hashBuffer, normalizeImageWidth, optimizeMedia, parseDataUri, sendMedia } from '../../services/publicMedia.js';
import { PUBLIC_PRODUCT_VISIBILITY_SQL, UUID_REGEX, mediaRouter, publicMediaCache } from './build-pricing-context.js';

mediaRouter.get('/products/:id/images/:idx', async (req, res, next) => {
  try {
    const index = Number(req.params.idx);
    if (!UUID_REGEX.test(req.params.id) || !Number.isInteger(index) || index < 0 || index > 99) {
      return res.sendStatus(404);
    }

    const result = await pool.query(
      [
        "select p.data->'images'->($2::int) as image, floor(extract(epoch from p.updated_at))::bigint as version",
        'from product_cache p',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where p.id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
      ].join(' '),
      [req.params.id, index]
    );
    const row = result.rows[0];
    const image = row?.image;
    const source = typeof image === 'string' ? image : image?.url || image?.src;
    if (!source) return res.sendStatus(404);
    if (!source.startsWith('data:')) {
      // Solo URLs normales: nunca un esquema raro (javascript:, file:) ni un destino de protocolo relativo.
      const isSafeUrl = /^https?:\/\//i.test(source) || (source.startsWith('/') && !source.startsWith('//'));
      return isSafeUrl ? res.redirect(302, source) : res.sendStatus(404);
    }

    const width = normalizeImageWidth(req.query.w);
    const media = await publicMediaCache.get(`product:${req.params.id}:${index}:${row.version}:${width}`, async () => {
      const parsed = parseDataUri(source);
      if (!parsed) return null;
      const optimized = await optimizeMedia(parsed, width);
      return { ...optimized, etag: hashBuffer(optimized.buffer) };
    });
    if (!media) return res.sendStatus(404);
    return sendMedia(req, res, media);
  } catch (err) {
    return next(err);
  }
});

mediaRouter.get('/pages/:slug/media/:sectionId', async (req, res, next) => {
  try {
    const path = String(req.query.path || '');
    if (!UUID_REGEX.test(req.params.sectionId) || !path) return res.sendStatus(404);

    const result = await pool.query(
      [
        'select s.props, floor(extract(epoch from s.updated_at))::bigint as version',
        'from page_sections s',
        'join pages pg on pg.id = s.page_id',
        "where s.id = $1 and pg.slug = $2 and s.state = 'published' and s.enabled = true",
      ].join(' '),
      [req.params.sectionId, req.params.slug]
    );
    const row = result.rows[0];
    if (!row) return res.sendStatus(404);

    const width = normalizeImageWidth(req.query.w, 1600);
    const media = await publicMediaCache.get(`page:${req.params.sectionId}:${path}:${row.version}:${width}`, async () => {
      const value = getValueByPath(row.props, path);
      const parsed = typeof value === 'string' ? parseDataUri(value) : null;
      if (!parsed) return null;
      const optimized = await optimizeMedia(parsed, width);
      return { ...optimized, etag: hashBuffer(optimized.buffer) };
    });
    if (!media) return res.sendStatus(404);
    return sendMedia(req, res, media);
  } catch (err) {
    return next(err);
  }
});
