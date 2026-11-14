// Cambio de precios en cantidad (por rubro, marca o selección).
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import crypto from 'crypto';
import { resolveEffectiveProductPrice, resolvePricingProfile } from '../../services/userPricing.js';
import { ensureSpecialPricesSchema, pickSpecialPrices, upsertSpecialPrices } from '../../services/specialPrices.js';
import { normalizePriceAdjustments } from '../../services/pricing.js';
import { computeBulkPrice } from '../../services/bulkPrice.js';
import { getTenantId, isUuid, parseUuidArray } from './helpers-common.js';

tenantRouter.post('/products/bulk-price', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const body = req.body || {};
  const mode = ['raise', 'lower', 'set'].includes(body.mode) ? body.mode : null;
  const unit = body.unit === 'amount' ? 'amount' : 'percent';
  const amount = Number(body.amount);
  const field = ['price', 'price_wholesale', 'both'].includes(body.field) ? body.field : 'price';
  const categoryId = body.category_id ? String(body.category_id) : null;
  const brand = body.brand ? String(body.brand).trim() : null;
  const apply = body.apply === true;
  // Para quién: todos (cambia el precio del producto) o una lista / clientes puntuales (precio especial fijo).
  const target = ['lists', 'users'].includes(body.target) ? body.target : 'all';
  const listsParsed = parseUuidArray(body.price_list_ids);
  const usersParsed = parseUuidArray(body.user_ids);
  // Productos del sistema de gestión: si lock, quedan con "No pisar mis cambios" y la sincronización no los toca.
  const lock = body.lock === true;

  if (!mode) return res.status(400).json({ error: 'invalid_mode' });
  if (!Number.isFinite(amount) || amount < 0 || (mode !== 'set' && amount === 0)) {
    return res.status(400).json({ error: 'invalid_amount' });
  }
  if (mode === 'set' && unit === 'percent') return res.status(400).json({ error: 'invalid_unit' });
  if (unit === 'percent' && mode === 'lower' && amount >= 100) return res.status(400).json({ error: 'invalid_amount' });
  if (categoryId && !isUuid(categoryId)) return res.status(400).json({ error: 'invalid_category_id' });
  if (target !== 'all') {
    if (!listsParsed.ok || !usersParsed.ok) return res.status(400).json({ error: 'invalid_target' });
    if (target === 'lists' && !listsParsed.items.length) return res.status(400).json({ error: 'target_required' });
    if (target === 'users' && !usersParsed.items.length) return res.status(400).json({ error: 'target_required' });
  }

  const params = [tenantId];
  const where = ['p.tenant_id = $1', 'p.deleted_at is null'];
  let categoryTree = [];
  if (categoryId) {
    // El rubro o la categoría elegida con todas sus subcategorías (la madre se guarda en data.parent_id).
    categoryTree = (await pool.query(
      [
        'with recursive tree as (select id from categories where tenant_id = $1 and id = $2',
        "union all select c.id from categories c join tree t on nullif(c.data->>'parent_id', '') = t.id::text where c.tenant_id = $1)",
        'select id from tree',
      ].join(' '),
      [tenantId, categoryId]
    )).rows.map((row) => row.id);
    params.push(categoryTree.length ? categoryTree : [categoryId]);
    where.push(`p.id in (select pc.product_id from product_categories pc where pc.category_id = any($${params.length}::uuid[]))`);
  }
  if (brand) {
    params.push(brand.toLowerCase());
    where.push(`lower(coalesce(p.brand, '')) = $${params.length}`);
  }

  const client = await pool.connect();
  try {
    const rows = (await client.query(
      [
        'select p.id, p.name, p.price, p.price_wholesale, p.external_id, coalesce(p.admin_locked, false) as admin_locked',
        'from product_cache p',
        `where ${where.join(' and ')}`,
        'order by p.name asc',
      ].join(' '),
      params
    )).rows;

    if (target !== 'all') {
      await ensureSpecialPricesSchema();
      const commerce = (await client.query('select commerce from tenant_settings where tenant_id = $1', [tenantId])).rows[0]?.commerce || {};
      const adjustments = normalizePriceAdjustments(commerce);

      // Cada destino (una lista o un cliente) con el precio que paga hoy.
      let targets = [];
      if (target === 'lists') {
        const lists = (await client.query(
          'select id, name, type, rules_json from price_lists where tenant_id = $1 and id = any($2::uuid[]) order by name',
          [tenantId, listsParsed.items]
        )).rows;
        targets = lists.map((list) => ({
          key: list.id,
          label: list.name,
          price_list_id: list.id,
          user_id: null,
          profile: { segment: list.type === 'wholesale' ? 'wholesale' : 'retail', allowWholesale: true, pendingWholesale: false, priceList: list, priceListSource: 'manual' },
        }));
      } else {
        const users = (await client.query(
          [
            'select u.id, u.email, ut.role, ut.status from user_tenants ut join users u on u.id = ut.user_id',
            'where ut.tenant_id = $1 and ut.user_id = any($2::uuid[]) order by u.email',
          ].join(' '),
          [tenantId, usersParsed.items]
        )).rows;
        for (const user of users) {
          targets.push({
            key: user.id,
            label: user.email,
            price_list_id: null,
            user_id: user.id,
            profile: await resolvePricingProfile({ tenantId, user }),
          });
        }
      }
      if (!targets.length) return res.status(400).json({ error: 'target_required' });

      const productIds = rows.map((row) => row.id);
      const listIds = [...new Set(targets.map((item) => item.profile?.priceList?.id).filter(Boolean))];
      const existing = productIds.length ? (await client.query(
        [
          'select product_id, price_list_id, user_id, price from tenant_special_prices',
          'where tenant_id = $1 and product_id = any($2::uuid[]) and (user_id = any($3::uuid[]) or (user_id is null and price_list_id = any($4::uuid[])))',
        ].join(' '),
        [tenantId, productIds, targets.map((item) => item.user_id).filter(Boolean), listIds]
      )).rows : [];

      const pairs = [];
      targets.forEach((item) => {
        const current = pickSpecialPrices(existing, { userId: item.user_id, priceListId: item.profile?.priceList?.id || null });
        rows.forEach((row) => {
          const before = resolveEffectiveProductPrice({
            priceRetail: Number(row.price || 0),
            priceWholesale: Number(row.price_wholesale || 0),
            adjustments,
            profile: item.profile,
            specialPrice: current.get(row.id) ?? null,
          }).effective;
          if (!before && mode !== 'set') return;
          const after = computeBulkPrice(before, { mode, amount, unit });
          if (after === before) return;
          pairs.push({ row, item, before, after });
        });
      });
      const changedProducts = new Set(pairs.map((pair) => pair.row.id)).size;

      let batch = null;
      if (apply && pairs.length) {
        const categoryName = categoryId
          ? (await client.query('select name from categories where tenant_id = $1 and id = $2', [tenantId, categoryId])).rows[0]?.name
          : null;
        const scopeName = categoryId ? (categoryName || 'categoría elegida') : brand ? `marca ${brand}` : 'todo el catálogo';
        const who = target === 'lists'
          ? `lista ${targets.map((item) => item.label).join(', ')}`
          : targets.length === 1 ? targets[0].label : `${targets.length} clientes`;
        const verb = mode === 'raise' ? 'Subir' : mode === 'lower' ? 'Bajar' : 'Precio fijo';
        const howMuch = mode === 'set' ? `$${amount}` : unit === 'percent' ? `${amount}%` : `$${amount}`;
        batch = { id: crypto.randomUUID(), name: `${verb} ${howMuch} · ${scopeName} · ${who}`.slice(0, 160) };
        await client.query('begin');
        await upsertSpecialPrices(client, {
          tenantId,
          batchId: batch.id,
          batchName: batch.name,
          rows: pairs.map(({ row, item, after }) => ({ product_id: row.id, price_list_id: item.price_list_id, user_id: item.user_id, price: after })),
        });
        await client.query('commit');
      }

      return res.json({
        applied: Boolean(batch),
        target,
        matched: rows.length,
        changed: changedProducts,
        special_prices: pairs.length,
        synced_unlocked: 0,
        batch,
        sample: pairs.slice(0, 8).map(({ row, item, before, after }) => ({
          id: `${row.id}:${item.key}`,
          name: row.name,
          who: item.label,
          before: { price: before },
          after: { price: after },
        })),
      });
    }

    const changes = rows.map((row) => {
      const price = field === 'price_wholesale' ? Number(row.price || 0) : computeBulkPrice(row.price, { mode, amount, unit });
      const wholesale = field === 'price' ? Number(row.price_wholesale || 0) : computeBulkPrice(row.price_wholesale, { mode, amount, unit });
      return { row, price, wholesale };
    }).filter(({ row, price, wholesale }) => price !== Number(row.price || 0) || wholesale !== Number(row.price_wholesale || 0));

    // Los que vienen del sistema y no están bloqueados vuelven a su precio en la próxima sincronización.
    const syncedUnlocked = changes.filter(({ row }) => row.external_id && !row.admin_locked).length;

    if (apply && changes.length) {
      await client.query('begin');
      await client.query(
        [
          'update product_cache p set price = v.price, price_wholesale = v.wholesale, updated_at = now(),',
          'admin_locked = coalesce(p.admin_locked, false) or ($5 and p.external_id is not null)',
          'from unnest($2::uuid[], $3::numeric[], $4::numeric[]) as v(id, price, wholesale)',
          'where p.tenant_id = $1 and p.id = v.id',
        ].join(' '),
        [tenantId, changes.map((c) => c.row.id), changes.map((c) => c.price), changes.map((c) => c.wholesale), lock]
      );
      await client.query('commit');
    }

    return res.json({
      applied: apply,
      matched: rows.length,
      changed: changes.length,
      synced_unlocked: syncedUnlocked,
      locked: apply && lock ? syncedUnlocked : 0,
      target,
      sample: changes.slice(0, 8).map(({ row, price, wholesale }) => ({
        id: row.id,
        name: row.name,
        before: { price: Number(row.price || 0), price_wholesale: Number(row.price_wholesale || 0) },
        after: { price, price_wholesale: wholesale },
      })),
    });
  } catch (err) {
    if (apply) await client.query('rollback').catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

// Precios especiales agrupados por cambio (cada vez que se tocó Aplicar).
