// Clientes de la tienda: listar, aprobar, editar, borrar y asignar lista de precios.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { ensurePricingSchema } from '../../services/userPricing.js';
import { getTenantId, isUuid } from './helpers-common.js';
import { changeTenantUser } from './user-access.js';

tenantRouter.get('/users', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const offset = (page - 1) * limit;

  try {
    await ensurePricingSchema();
    const countRes = await pool.query(
      'select count(*) from user_tenants where tenant_id = $1',
      [tenantId]
    );
    const total = Number(countRes.rows[0]?.count || 0);

    const usersRes = await pool.query(
      [
        'select u.id, u.email, u.role as global_role, u.status as user_status,',
        'u.display_name as name, u.phone, u.address, u.address_extra,',
        'u.country_code, u.country_label, u.province, u.city, u.postal_code,',
        'u.photo_url,',
        'ut.role as role, ut.status as status, u.created_at,',
        'upl.price_list_id, pl.name as price_list_name, pl.type as price_list_type',
        'from user_tenants ut',
        'join users u on u.id = ut.user_id',
        'left join user_price_list upl on upl.tenant_id = ut.tenant_id and upl.user_id = ut.user_id',
        'left join price_lists pl on pl.id = upl.price_list_id',
        'where ut.tenant_id = $1',
        'order by u.created_at desc',
        'limit $2 offset $3',
      ].join(' '),
      [tenantId, limit, offset]
    );

    return res.json({ page, limit, total, items: usersRes.rows });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.patch('/users/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    const result = await changeTenantUser({ tenantId, userId: req.params.id, body: req.body });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/users/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const userId = req.params.id;
  if (!isUuid(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }
  if (req.user?.id === userId) {
    return res.status(400).json({ error: 'cannot_delete_current_user' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetRes = await client.query(
      'select id, role from users where id = $1',
      [userId]
    );
    if (!targetRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'user_not_found' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role === 'master_admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'cannot_delete_master_admin' });
    }

    const membershipDeleteRes = await client.query(
      'delete from user_tenants where tenant_id = $1 and user_id = $2 returning user_id',
      [tenantId, userId]
    );
    if (!membershipDeleteRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'user_not_found' });
    }

    await client.query(
      'delete from user_price_list where tenant_id = $1 and user_id = $2',
      [tenantId, userId]
    );

    const membershipsRes = await client.query(
      'select count(*)::int as total from user_tenants where user_id = $1',
      [userId]
    );
    const remainingMemberships = Number(membershipsRes.rows[0]?.total || 0);

    let deletedUser = false;
    if (remainingMemberships === 0) {
      await client.query(
        "delete from users where id = $1 and role <> 'master_admin'",
        [userId]
      );
      deletedUser = true;
    }

    await client.query('COMMIT');
    return res.json({ ok: true, id: userId, deleted_user: deletedUser });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.put('/users/:id/price-list', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const userId = req.params.id;
  if (!isUuid(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  const rawPriceListId = req.body?.price_list_id;
  const clearAssignment =
    rawPriceListId == null ||
    String(rawPriceListId).trim() === '' ||
    String(rawPriceListId).trim().toLowerCase() === 'auto';

  try {
    await ensurePricingSchema();
    const membershipRes = await pool.query(
      'select user_id from user_tenants where tenant_id = $1 and user_id = $2',
      [tenantId, userId]
    );
    if (!membershipRes.rowCount) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    if (clearAssignment) {
      await pool.query(
        'delete from user_price_list where tenant_id = $1 and user_id = $2',
        [tenantId, userId]
      );
      return res.json({ ok: true, price_list: null });
    }

    const priceListId = String(rawPriceListId).trim();
    if (!isUuid(priceListId)) {
      return res.status(400).json({ error: 'invalid_price_list_id' });
    }

    const priceListRes = await pool.query(
      'select id, name, type, rules_json from price_lists where tenant_id = $1 and id = $2',
      [tenantId, priceListId]
    );
    if (!priceListRes.rowCount) {
      return res.status(404).json({ error: 'price_list_not_found' });
    }

    await pool.query(
      [
        'insert into user_price_list (tenant_id, user_id, price_list_id, assigned_at)',
        'values ($1, $2, $3, now())',
        'on conflict (tenant_id, user_id)',
        'do update set price_list_id = excluded.price_list_id, assigned_at = now()',
      ].join(' '),
      [tenantId, userId, priceListId]
    );

    return res.json({ ok: true, price_list: priceListRes.rows[0] });
  } catch (err) {
    return next(err);
  }
});
