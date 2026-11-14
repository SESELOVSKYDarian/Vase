// Páginas de la tienda: leer, guardar el borrador y publicar.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { getTenantId } from './helpers-common.js';

tenantRouter.get('/pages/:slug', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const pageRes = await pool.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [tenantId, req.params.slug]
    );
    if (!pageRes.rowCount) {
      return res.status(404).json({ error: 'page_not_found' });
    }

    const pageId = pageRes.rows[0].id;
    const draftRes = await pool.query(
      'select id, type, enabled, sort_order, props from page_sections where page_id = $1 and state = $2 order by sort_order asc',
      [pageId, 'draft']
    );

    const source = draftRes.rowCount ? draftRes.rows : (await pool.query(
      'select id, type, enabled, sort_order, props from page_sections where page_id = $1 and state = $2 order by sort_order asc',
      [pageId, 'published']
    )).rows;

    const sections = source.map((row) => ({
      id: row.id,
      type: row.type,
      enabled: row.enabled,
      sort_order: row.sort_order,
      props: row.props || {},
    }));

    return res.json({ slug: req.params.slug, sections });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/pages/:slug', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const sections = Array.isArray(req.body.sections) ? req.body.sections : null;
  if (!sections) {
    return res.status(400).json({ error: 'sections_required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let pageId;
    const pageRes = await client.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [tenantId, req.params.slug]
    );

    if (pageRes.rowCount) {
      pageId = pageRes.rows[0].id;
    } else {
      const insertRes = await client.query(
        'insert into pages (tenant_id, slug) values ($1, $2) returning id',
        [tenantId, req.params.slug]
      );
      pageId = insertRes.rows[0].id;
    }

    await client.query(
      'delete from page_sections where page_id = $1 and state = $2',
      [pageId, 'draft']
    );

    let sortOrder = 0;
    console.log(`Saving ${sections.length} sections for slug: ${req.params.slug}`);
    for (const section of sections) {
      sortOrder += 1;
      // Solo el tipo: las props pueden traer imagenes y videos en base64 de varios MB.
      console.log(` - Section: ${section.type}`);
      await client.query(
        [
          'insert into page_sections (page_id, state, type, enabled, sort_order, props)',
          'values ($1, $2, $3, $4, $5, $6::jsonb)',
        ].join(' '),
        [
          pageId,
          'draft',
          section.type,
          section.enabled !== false,
          section.sort_order || sortOrder,
          section.props || {},
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.post('/pages/:slug/publish', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pageRes = await client.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [tenantId, req.params.slug]
    );
    if (!pageRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'page_not_found' });
    }

    const pageId = pageRes.rows[0].id;
    await client.query(
      'delete from page_sections where page_id = $1 and state = $2',
      [pageId, 'published']
    );

    await client.query(
      [
        'insert into page_sections (page_id, state, type, enabled, sort_order, props)',
        'select page_id, $2, type, enabled, sort_order, props',
        'from page_sections where page_id = $1 and state = $3',
      ].join(' '),
      [pageId, 'published', 'draft']
    );

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Category Management
