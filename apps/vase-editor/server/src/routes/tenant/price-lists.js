// Listas de precios y precios especiales.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { ensureDefaultPriceLists, ensurePricingSchema } from '../../services/userPricing.js';
import { ensureSpecialPricesSchema } from '../../services/specialPrices.js';
import { getTenantId, isUuid } from './helpers-common.js';

tenantRouter.get('/price-lists', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    await ensurePricingSchema();
    await ensureDefaultPriceLists(tenantId);
    const result = await pool.query(
      [
        'select id, name, type, rules_json, created_at',
        'from price_lists',
        'where tenant_id = $1',
        'order by',
        "case type when 'retail' then 1 when 'wholesale' then 2 else 3 end,",
        'created_at asc',
      ].join(' '),
      [tenantId]
    );
    return res.json({ items: result.rows });
  } catch (err) {
    return next(err);
  }
});

// Nueva lista de precios (tipo especial: se asigna a mano a cada cliente).
tenantRouter.post('/price-lists', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }
  const percent = body.percent === undefined || body.percent === '' ? 0 : Number(body.percent);
  if (!Number.isFinite(percent) || percent < -90 || percent > 500) {
    return res.status(400).json({ error: 'invalid_percent' });
  }
  const rules = { percent: Math.round(percent * 100) / 100 };
  if (body.force_segment === 'retail' || body.force_segment === 'wholesale') rules.force_segment = body.force_segment;

  try {
    await ensurePricingSchema();
    await ensureDefaultPriceLists(tenantId);
    const result = await pool.query(
      [
        "insert into price_lists (tenant_id, name, type, rules_json) values ($1, $2, 'special', $3::jsonb)",
        'returning id, name, type, rules_json, created_at',
      ].join(' '),
      [tenantId, name, JSON.stringify(rules)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'price_list_name_taken' });
    }
    return next(err);
  }
});

tenantRouter.put('/price-lists/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const listId = req.params.id;
  if (!isUuid(listId)) {
    return res.status(400).json({ error: 'invalid_price_list_id' });
  }
  const body = req.body || {};
  const name = body.name === undefined ? null : String(body.name || '').trim();
  if (name !== null && !name) {
    return res.status(400).json({ error: 'name_required' });
  }
  const hasPercent = body.percent !== undefined;
  const percent = Number(body.percent);
  if (hasPercent && (!Number.isFinite(percent) || percent < -90 || percent > 500)) {
    return res.status(400).json({ error: 'invalid_percent' });
  }
  const hasSegment = body.force_segment !== undefined;
  const segment = body.force_segment === 'retail' || body.force_segment === 'wholesale' ? body.force_segment : null;

  try {
    await ensurePricingSchema();
    const existing = await pool.query(
      'select id, name, type, rules_json from price_lists where tenant_id = $1 and id = $2',
      [tenantId, listId]
    );
    if (!existing.rowCount) {
      return res.status(404).json({ error: 'price_list_not_found' });
    }
    const current = existing.rows[0];
    const rules = { ...(current.rules_json && typeof current.rules_json === 'object' ? current.rules_json : {}) };
    if (hasPercent) rules.percent = Math.round(percent * 100) / 100;
    if (hasSegment) {
      if (segment) rules.force_segment = segment;
      else delete rules.force_segment;
    }
    const result = await pool.query(
      [
        'update price_lists set name = $3, rules_json = $4::jsonb',
        'where tenant_id = $1 and id = $2',
        'returning id, name, type, rules_json, created_at',
      ].join(' '),
      [tenantId, listId, name ?? current.name, JSON.stringify(rules)]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});


tenantRouter.get('/special-prices', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    await ensureSpecialPricesSchema();
    const result = await pool.query(
      [
        'select batch_id as id, batch_name as name, max(created_at) as created_at,',
        'count(*)::int as prices, count(distinct product_id)::int as products',
        'from tenant_special_prices where tenant_id = $1',
        'group by batch_id, batch_name order by max(created_at) desc limit 200',
      ].join(' '),
      [tenantId]
    );
    return res.json({ items: result.rows });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/special-prices/:batchId', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!isUuid(req.params.batchId)) return res.status(400).json({ error: 'invalid_id' });
  try {
    await ensureSpecialPricesSchema();
    const result = await pool.query('delete from tenant_special_prices where tenant_id = $1 and batch_id = $2', [tenantId, req.params.batchId]);
    return res.json({ ok: true, removed: result.rowCount });
  } catch (err) {
    return next(err);
  }
});
