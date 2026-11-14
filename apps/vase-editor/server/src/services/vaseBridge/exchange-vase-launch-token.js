// Parte de vaseBridge.js: exchangeVaseLaunchToken.
import { pool } from '../../db.js';
import { signToken } from '../../middleware/auth.js';
import { ensureTenantPlatformDomain } from '../tenantDomains.js';
import { EXTERNAL_SOURCE, ensureVaseBridgeSchema, verifyVaseLaunchToken } from './normalize-launch-payload.js';
import { ensureMembership, ensureTenantSettings, upsertTenant, upsertUser } from './upsert-user.js';

export async function exchangeVaseLaunchToken(rawToken) {
  await ensureVaseBridgeSchema();
  const payload = verifyVaseLaunchToken(rawToken);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tenant = await upsertTenant(client, payload);
    await ensureTenantSettings(client, tenant.id, tenant.name, payload.designPreset, payload.staticSiteUrl);
    await ensureTenantPlatformDomain(client, tenant.id, {
      preferredSubdomain: payload.externalTenantSlug || '',
      preferredLabels: [payload.displayName || '', payload.tenantName || ''],
      email: payload.email || '',
      onlyWhenMissing: false,
    });

    const user = await upsertUser(client, payload);
    await ensureMembership(client, user.id, tenant.id);

    await client.query('COMMIT');

    const token = signToken({
      sub: user.id,
      role: user.role,
      status: user.status,
      tenant_id: tenant.id,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        tenant_id: tenant.id,
        // El mismo nombre que la persona tiene en Vase: el panel lo muestra debajo de la tienda.
        display_name: payload.displayName || null,
        name: payload.displayName || null,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        external_tenant_id: payload.externalTenantId,
        external_tenant_slug: payload.externalTenantSlug || null,
      },
      external: {
        source: EXTERNAL_SOURCE,
        user_id: payload.externalUserId,
        tenant_id: payload.externalTenantId,
        tenant_role: payload.externalTenantRole,
        platform_role: payload.platformRole || null,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
