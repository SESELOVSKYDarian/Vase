// Aprobar un cliente o cambiarle el tipo (minorista, mayorista). Lo usan el panel de Business y
// Clientes de app.vase.ar (ruta interna), así los dos hacen exactamente lo mismo.
import { pool } from '../../db.js';
import { ensurePricingSchema } from '../../services/userPricing.js';
import { isUuid } from './helpers-common.js';

const VALID_ROLES = new Set(['retail', 'wholesale', 'tenant_admin']);
const VALID_STATUSES = new Set(['active', 'pending', 'inactive']);

/** Devuelve { status, body } para responder tal cual. allowAdmin: solo el panel puede dar acceso de administrador. */
export async function changeTenantUser({ tenantId, userId, body = {}, allowAdmin = true }) {
  if (!isUuid(userId)) {
    return { status: 400, body: { error: 'invalid_user_id' } };
  }

  const role = body?.role != null ? String(body.role).trim().toLowerCase() : null;
  const status = body?.status != null ? String(body.status).trim().toLowerCase() : null;

  if (role && (!VALID_ROLES.has(role) || (!allowAdmin && role === 'tenant_admin'))) {
    return { status: 400, body: { error: 'invalid_role' } };
  }
  if (status && !VALID_STATUSES.has(status)) {
    return { status: 400, body: { error: 'invalid_status' } };
  }
  if (!role && !status) {
    return { status: 400, body: { error: 'role_or_status_required' } };
  }

  const client = await pool.connect();
  try {
    await ensurePricingSchema();
    await client.query('BEGIN');
    const currentRes = await client.query(
      'select role, status from user_tenants where tenant_id = $1 and user_id = $2',
      [tenantId, userId]
    );
    if (!currentRes.rowCount) {
      await client.query('ROLLBACK');
      return { status: 404, body: { error: 'user_not_found' } };
    }

    const current = currentRes.rows[0];
    // Desde app no se toca a quien administra la tienda.
    if (!allowAdmin && current.role === 'tenant_admin') {
      await client.query('ROLLBACK');
      return { status: 403, body: { error: 'cannot_change_admin' } };
    }
    const nextRole = role || current.role;
    let nextStatus = status || current.status || 'active';
    if (nextRole !== 'wholesale' && nextStatus === 'pending') {
      nextStatus = 'active';
    }

    await client.query(
      'update user_tenants set role = $3, status = $4 where tenant_id = $1 and user_id = $2',
      [tenantId, userId, nextRole, nextStatus]
    );

    if (nextRole !== 'master_admin') {
      await client.query(
        "update users set role = $2 where id = $1 and role <> 'master_admin'",
        [userId, nextRole]
      );
    }

    const userRes = await client.query(
      [
        'select u.id, u.email, u.role as global_role, u.status as user_status,',
        'ut.role as role, ut.status as status, u.created_at,',
        'upl.price_list_id, pl.name as price_list_name, pl.type as price_list_type',
        'from user_tenants ut',
        'join users u on u.id = ut.user_id',
        'left join user_price_list upl on upl.tenant_id = ut.tenant_id and upl.user_id = ut.user_id',
        'left join price_lists pl on pl.id = upl.price_list_id',
        'where ut.tenant_id = $1 and ut.user_id = $2',
      ].join(' '),
      [tenantId, userId]
    );

    await client.query('COMMIT');
    return { status: 200, body: { ok: true, user: userRes.rows[0] || null } };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
