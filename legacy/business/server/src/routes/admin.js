import express from 'express';
import { pool } from '../db.js';
import { requireRole } from '../middleware/auth.js';

export const adminRouter = express.Router();

const disableAuth = process.env.DISABLE_AUTH === 'true';
if (!disableAuth) {
  adminRouter.use(requireRole('master_admin'));
}

adminRouter.get('/tenants', async (req, res, next) => {
  try {
    const result = await pool.query(
      'select id, name, status, created_at from tenants order by created_at desc'
    );
    return res.json({ items: result.rows });
  } catch (err) {
    return next(err);
  }
});

adminRouter.post('/tenants', async (req, res, next) => {
  try {
    const { name, domain, branding, theme, commerce } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name_required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tenantRes = await client.query(
        'insert into tenants (name, status) values ($1, $2) returning id, name, status',
        [name, 'active']
      );
      const tenant = tenantRes.rows[0];

      const settingsBranding = branding || { name };
      const settingsTheme = theme || { primary: '#f97316', font_family: 'Inter' };
      const settingsCommerce = commerce || { mode: 'hybrid', currency: 'ARS', whatsapp_number: '' };

      await client.query(
        'insert into tenant_settings (tenant_id, branding, theme, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb)',
        [tenant.id, settingsBranding, settingsTheme, settingsCommerce]
      );

      if (domain) {
        await client.query(
          'insert into tenant_domains (tenant_id, domain, is_primary) values ($1, $2, $3)',
          [tenant.id, domain, true]
        );
      }

      await client.query('COMMIT');
      return res.status(201).json({ tenant });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
});

adminRouter.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenantRes = await pool.query(
      'select id, name, status, created_at from tenants where id = $1',
      [req.params.id]
    );
    if (!tenantRes.rowCount) {
      return res.status(404).json({ error: 'tenant_not_found' });
    }

    const settingsRes = await pool.query(
      'select branding, theme, commerce from tenant_settings where tenant_id = $1',
      [req.params.id]
    );

    return res.json({ tenant: tenantRes.rows[0], settings: settingsRes.rows[0] || {} });
  } catch (err) {
    return next(err);
  }
});

adminRouter.put('/tenants/:id/settings', async (req, res, next) => {
  try {
    const branding = req.body.branding || {};
    const theme = req.body.theme || {};
    const commerce = req.body.commerce || {};

    const existing = await pool.query(
      'select tenant_id from tenant_settings where tenant_id = $1',
      [req.params.id]
    );

    if (!existing.rowCount) {
      const insertRes = await pool.query(
        'insert into tenant_settings (tenant_id, branding, theme, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb) returning branding, theme, commerce',
        [req.params.id, branding, theme, commerce]
      );
      return res.json({ tenant_id: req.params.id, settings: insertRes.rows[0] });
    }

    const updateRes = await pool.query(
      [
        'update tenant_settings',
        'set branding = branding || $2::jsonb,',
        'theme = theme || $3::jsonb,',
        'commerce = commerce || $4::jsonb,',
        'updated_at = now()',
        'where tenant_id = $1',
        'returning branding, theme, commerce',
      ].join(' '),
      [req.params.id, branding, theme, commerce]
    );

    return res.json({ tenant_id: req.params.id, settings: updateRes.rows[0] });
  } catch (err) {
    return next(err);
  }
});

adminRouter.post('/tenants/:id/domains', async (req, res, next) => {
  try {
    const { domain, is_primary } = req.body;
    if (!domain) {
      return res.status(400).json({ error: 'domain_required' });
    }

    await pool.query(
      'insert into tenant_domains (tenant_id, domain, is_primary) values ($1, $2, $3)',
      [req.params.id, domain, is_primary !== false]
    );

    return res.status(201).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

adminRouter.post('/tenants/:id/provision', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query(
      'select id from tenants where id = $1',
      [req.params.id]
    );
    if (!tenantRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'tenant_not_found' });
    }

    const pageRes = await client.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [req.params.id, 'home']
    );

    let pageId;
    if (pageRes.rowCount) {
      pageId = pageRes.rows[0].id;
    } else {
      const insertRes = await client.query(
        'insert into pages (tenant_id, slug) values ($1, $2) returning id',
        [req.params.id, 'home']
      );
      pageId = insertRes.rows[0].id;
    }

    const sections = [
      { type: 'HeroSlider', sort_order: 1 },
      { type: 'BrandMarquee', sort_order: 2 },
      { type: 'FeaturedProducts', sort_order: 3 },
      { type: 'Services', sort_order: 4 },
    ];

    for (const state of ['published', 'draft']) {
      await client.query(
        'delete from page_sections where page_id = $1 and state = $2',
        [pageId, state]
      );

      for (const section of sections) {
        await client.query(
          [
            'insert into page_sections (page_id, state, type, enabled, sort_order, props)',
            'values ($1, $2, $3, $4, $5, $6::jsonb)',
          ].join(' '),
          [pageId, state, section.type, true, section.sort_order, {}]
        );
      }
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
