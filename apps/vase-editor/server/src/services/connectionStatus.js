import crypto from 'crypto';
import { buildTenantIntegrationManifest } from './integrationManifest.js';
import { ensureProductSyncToken, findBusinessTenantByExternalId } from './productSyncCredentials.js';

// Mi negocio (app.vase.ar) muestra la conexión con el sistema de gestión del cliente: la dirección y
// la clave que usa su sistema y cuántos productos llegaron. Todo eso vive en Business; app lo pide acá.

const PUBLIC_BASE_URL = () =>
  String(process.env.INTEGRATIONS_PUBLIC_BASE_URL || process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || 'https://business.vase.ar').replace(/\/+$/, '');

async function syncStats(db, businessTenantId) {
  try {
    const result = await db.query(
      'select count(*)::int as total, max(last_sync_at) as last_sync_at from product_sync_metadata where tenant_id = $1',
      [businessTenantId]
    );
    const row = result.rows[0] || {};
    return { products: Number(row.total || 0), lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null };
  } catch {
    // la tabla se crea con el primer envío del sistema: sin ella todavía no llegó nada
    return { products: 0, lastSyncAt: null };
  }
}

function payload(manifest, stats) {
  return {
    syncUrl: manifest.endpoints?.sync_products_url || null,
    pingUrl: manifest.endpoints?.ping_url || null,
    token: manifest.auth?.token || null,
    compatibility: {
      domain: manifest.compatibility?.domain || null,
      consumerKey: manifest.compatibility?.consumer_key || null,
      consumerSecret: manifest.compatibility?.consumer_secret || null,
    },
    stats,
  };
}

export async function readConnectionStatus(db, externalTenantId) {
  const tenant = await findBusinessTenantByExternalId(db, externalTenantId);
  if (!tenant) return null;
  const { tokenRecord } = await ensureProductSyncToken(db, tenant.id);
  const manifest = buildTenantIntegrationManifest({ baseUrl: PUBLIC_BASE_URL(), tenantId: tenant.id, tokenRecord });
  return payload(manifest, await syncStats(db, tenant.id));
}

/** Clave nueva para el sistema de gestión: la anterior deja de andar al instante. */
export async function rotateConnectionToken(db, externalTenantId) {
  const tenant = await findBusinessTenantByExternalId(db, externalTenantId);
  if (!tenant) return null;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("delete from api_tokens where tenant_id = $1 and scope = 'products:sync'", [tenant.id]);
    const inserted = await client.query(
      'insert into api_tokens (tenant_id, name, token_hash, scope) values ($1, $2, $3, $4) returning id, name, token_hash, scope, created_at',
      [tenant.id, 'ERP Sync', `vase_${crypto.randomBytes(24).toString('hex')}`, 'products:sync']
    );
    await client.query('COMMIT');
    const manifest = buildTenantIntegrationManifest({ baseUrl: PUBLIC_BASE_URL(), tenantId: tenant.id, tokenRecord: inserted.rows[0] });
    return payload(manifest, await syncStats(db, tenant.id));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
