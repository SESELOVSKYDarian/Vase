// Ofertas: listar, crear, editar y borrar.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { OFFER_KINDS, ensureOfferColumns, getTenantOffers, isClassicOffer } from '../../services/offers.js';
import { getTenantId, isUuid, parseUuidArray } from './helpers-common.js';

const OFFER_COLUMNS = 'id, tenant_id, name, label, percent, enabled, user_ids, category_ids, kind, value, product_ids, price_list_ids, starts_at, ends_at, created_at, updated_at';

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, value: date.toISOString() };
}

// Acepta el formato de siempre ({ percent }) y el del panel nuevo ({ kind, value, product_ids, starts_at, ends_at }).
function parseOfferBody(body = {}) {
  const name = String(body.name || '').trim();
  const label = String(body.label || 'Oferta').trim() || 'Oferta';
  const kind = OFFER_KINDS.includes(body.kind) ? body.kind : 'percent';
  const value = Number(body.value ?? body.percent ?? 0);
  const enabled = body.enabled !== false;
  const usersParsed = parseUuidArray(body.user_ids);
  const categoriesParsed = parseUuidArray(body.category_ids);
  const productsParsed = parseUuidArray(body.product_ids);
  // Si no llega, queda undefined: al editar se conserva la lista que ya tenía la oferta.
  const hasLists = Object.prototype.hasOwnProperty.call(body, 'price_list_ids');
  const listsParsed = hasLists ? parseUuidArray(body.price_list_ids) : { ok: true, items: undefined };
  const startsAt = parseOptionalDate(body.starts_at);
  const endsAt = parseOptionalDate(body.ends_at);

  if (!name) return { error: 'name_required' };
  if (!Number.isFinite(value) || value <= 0 || (kind === 'percent' && value > 100)) {
    return { error: kind === 'percent' ? 'invalid_percent' : 'invalid_value' };
  }
  if (!usersParsed.ok) return { error: 'invalid_user_ids' };
  if (!categoriesParsed.ok) return { error: 'invalid_category_ids' };
  if (!productsParsed.ok) return { error: 'invalid_product_ids' };
  if (!listsParsed.ok) return { error: 'invalid_price_list_ids' };
  if (!startsAt.ok || !endsAt.ok) return { error: 'invalid_dates' };
  if (startsAt.value && endsAt.value && startsAt.value > endsAt.value) return { error: 'invalid_dates' };

  const offer = {
    name,
    label,
    kind,
    value,
    enabled,
    user_ids: usersParsed.items,
    category_ids: categoriesParsed.items,
    product_ids: productsParsed.items,
    price_list_ids: listsParsed.items,
    starts_at: startsAt.value,
    ends_at: endsAt.value,
  };
  // Solo las clásicas llevan el porcentaje en `percent`: las demás quedan en 0 para versiones anteriores.
  offer.percent = isClassicOffer(offer) ? value : 0;
  return { offer };
}

tenantRouter.get('/offers', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const onlyEnabled = String(req.query.enabled || '').toLowerCase() === 'true';
    const items = await getTenantOffers(tenantId, { onlyEnabled });
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/offers', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const { offer, error } = parseOfferBody(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    await ensureOfferColumns();
    const result = await pool.query(
      [
        'insert into tenant_offers (tenant_id, name, label, percent, enabled, user_ids, category_ids, kind, value, product_ids, starts_at, ends_at, price_list_ids)',
        'values ($1, $2, $3, $4, $5, $6::uuid[], $7::uuid[], $8, $9, $10::uuid[], $11, $12, $13::uuid[])',
        `returning ${OFFER_COLUMNS}`,
      ].join(' '),
      [
        tenantId,
        offer.name,
        offer.label,
        offer.percent,
        offer.enabled,
        offer.user_ids,
        offer.category_ids,
        offer.kind,
        offer.value,
        offer.product_ids,
        offer.starts_at,
        offer.ends_at,
        offer.price_list_ids || [],
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/offers/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const offerId = req.params.id;
  if (!isUuid(offerId)) {
    return res.status(400).json({ error: 'invalid_offer_id' });
  }

  const { offer, error } = parseOfferBody(req.body || {});
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    await ensureOfferColumns();
    if (offer.price_list_ids === undefined) {
      const existingLists = await pool.query('select price_list_ids from tenant_offers where tenant_id = $1 and id = $2', [tenantId, offerId]);
      offer.price_list_ids = existingLists.rows[0]?.price_list_ids || [];
      offer.percent = isClassicOffer(offer) ? offer.value : 0;
    }
    const result = await pool.query(
      [
        'update tenant_offers',
        'set name = $3,',
        'label = $4,',
        'percent = $5,',
        'enabled = $6,',
        'user_ids = $7::uuid[],',
        'category_ids = $8::uuid[],',
        'kind = $9,',
        'value = $10,',
        'product_ids = $11::uuid[],',
        'starts_at = $12,',
        'ends_at = $13,',
        'price_list_ids = $14::uuid[],',
        'updated_at = now()',
        'where tenant_id = $1 and id = $2',
        `returning ${OFFER_COLUMNS}`,
      ].join(' '),
      [
        tenantId,
        offerId,
        offer.name,
        offer.label,
        offer.percent,
        offer.enabled,
        offer.user_ids,
        offer.category_ids,
        offer.kind,
        offer.value,
        offer.product_ids,
        offer.starts_at,
        offer.ends_at,
        offer.price_list_ids,
      ]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'offer_not_found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/offers/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const offerId = req.params.id;
  if (!isUuid(offerId)) {
    return res.status(400).json({ error: 'invalid_offer_id' });
  }

  try {
    const result = await pool.query(
      'delete from tenant_offers where tenant_id = $1 and id = $2 returning id',
      [tenantId, offerId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'offer_not_found' });
    }
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    return next(err);
  }
});
