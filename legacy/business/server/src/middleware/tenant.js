import { pool } from '../db.js';

export async function resolveTenant(req, res, next) {
  try {
    const headerTenant = req.get('x-tenant-id');
    let tenant;

    if (headerTenant) {
      // Validate UUID to prevent DB crash
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(headerTenant)) {
        const result = await pool.query(
          'select id, name from tenants where id = $1 and status = $2',
          [headerTenant, 'active']
        );
        tenant = result.rows[0];
      }
    }

    if (!tenant) {
      const host = (req.hostname || '').toLowerCase();
      if (host) {
        const result = await pool.query(
          'select t.id, t.name from tenant_domains d join tenants t on t.id = d.tenant_id where d.domain = $1 and t.status = $2',
          [host, 'active']
        );
        tenant = result.rows[0];
      }
    }

    if (!tenant) {
      console.warn(`Tenant not found for header: ${headerTenant} and host: ${req.hostname}`);
      return res.status(404).json({ error: 'tenant_not_found' });
    }

    console.log(`Resolved tenant: ${tenant.name} (${tenant.id})`);
    req.tenant = tenant;
    return next();
  } catch (err) {
    return next(err);
  }
}
