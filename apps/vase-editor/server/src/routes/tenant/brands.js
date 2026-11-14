// Marcas del catálogo: listar, crear y borrar.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { getTenantId, normalizeBrandName } from './helpers-common.js';
import { upsertTenantCommerce } from './helpers-products.js';

tenantRouter.get('/brands', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const [settingsRes, productRes] = await Promise.all([
      pool.query(
        'select commerce from tenant_settings where tenant_id = $1',
        [tenantId]
      ),
      pool.query(
        'select distinct brand from product_cache where tenant_id = $1 and brand is not null and trim(brand) <> \'\'',
        [tenantId]
      ),
    ]);

    const commerce = settingsRes.rows[0]?.commerce || {};
    const settingsBrands = Array.isArray(commerce.brands) ? commerce.brands : [];
    const productBrands = productRes.rows.map((row) => normalizeBrandName(row.brand)).filter(Boolean);

    const mergedMap = new Map();
    [...settingsBrands, ...productBrands].forEach((item) => {
      const clean = normalizeBrandName(item);
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, clean);
      }
    });

    const brands = [...mergedMap.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return res.json(brands);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/brands', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const name = normalizeBrandName(req.body?.name);
  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }

  try {
    const settingsRes = await pool.query(
      'select commerce from tenant_settings where tenant_id = $1',
      [tenantId]
    );
    const commerce = settingsRes.rows[0]?.commerce || {};
    const currentBrands = Array.isArray(commerce.brands) ? commerce.brands : [];

    const existingMap = new Map();
    currentBrands.forEach((item) => {
      const clean = normalizeBrandName(item);
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!existingMap.has(key)) {
        existingMap.set(key, clean);
      }
    });
    existingMap.set(name.toLowerCase(), name);

    const nextBrands = [...existingMap.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    const nextCommerce = {
      ...commerce,
      brands: nextBrands,
    };

    await upsertTenantCommerce(tenantId, nextCommerce);
    return res.status(201).json({ ok: true, items: nextBrands });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/brands/:name', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const target = normalizeBrandName(decodeURIComponent(req.params.name || ''));
  if (!target) {
    return res.status(400).json({ error: 'name_required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const settingsRes = await client.query(
      'select commerce from tenant_settings where tenant_id = $1',
      [tenantId]
    );
    const commerce = settingsRes.rows[0]?.commerce || {};
    const currentBrands = Array.isArray(commerce.brands) ? commerce.brands : [];

    const targetKey = target.toLowerCase();
    const nextBrands = currentBrands
      .map((item) => normalizeBrandName(item))
      .filter((item) => item && item.toLowerCase() !== targetKey);

    const nextCommerce = {
      ...commerce,
      brands: nextBrands,
    };

    if (!settingsRes.rowCount) {
      await client.query(
        'insert into tenant_settings (tenant_id, branding, theme, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb)',
        [tenantId, {}, {}, nextCommerce]
      );
    } else {
      await client.query(
        [
          'update tenant_settings',
          'set commerce = $2::jsonb,',
          'updated_at = now()',
          'where tenant_id = $1',
        ].join(' '),
        [tenantId, nextCommerce]
      );
    }

    await client.query(
      [
        'update product_cache',
        'set brand = null, updated_at = now()',
        "where tenant_id = $1 and lower(trim(coalesce(brand, ''))) = $2",
      ].join(' '),
      [tenantId, targetKey]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, items: nextBrands });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Product Management
