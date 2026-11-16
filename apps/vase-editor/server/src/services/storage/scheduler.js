// Tareas de fondo del espacio: copia semanal de cada tienda y aviso a Vase de cuánto ocupa.
// Vase es quien conoce el plan: responde si la tienda llegó al tope y él mismo notifica al cliente.
import { pool } from '../../db.js';
import { createTenantBackup, ensureBackupTables } from './backups.js';
import { measureTenantUsage } from './usage.js';

const TICK_MS = 30 * 60 * 1000;
const REPORT_EVERY_MS = 6 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BACKUPS_PER_TICK = 3;

const lastReport = new Map();
const blocked = new Set();
let running = false;

/** true si la tienda llegó al tope del plan y no puede subir más. */
export const isStorageBlocked = (tenantId) => blocked.has(String(tenantId));

// La copia automática corre de madrugada (hora de Argentina), cuando la tienda casi no se usa.
function isNightInArgentina(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false }).format(now));
  return hour >= 2 && hour < 6;
}

const appUrl = () => String(process.env.VASE_APP_INTERNAL_URL || process.env.VASE_APP_URL || 'http://vase-app:3001').replace(/\/+$/, '');

/** Le cuenta a Vase cuánto ocupa la tienda y anota si quedó bloqueada por el tope. */
export async function reportTenantUsage(tenant, { fresh = false } = {}) {
  const token = String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim();
  if (!token || !tenant.external_tenant_id) return null;
  const usage = await measureTenantUsage(tenant.id, { fresh });
  const backup = await pool.query(
    "select size_bytes, created_at from tenant_backups where tenant_id = $1 and status = 'ready' and kind in ('weekly', 'manual') order by created_at desc limit 1",
    [tenant.id]
  );
  const response = await fetch(`${appUrl()}/api/internal/business/storage-usage`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      tenantId: tenant.external_tenant_id,
      imageCount: usage.imageCount,
      totalBytes: usage.totalBytes,
      breakdown: usage.breakdown,
      lastBackupAt: backup.rows[0]?.created_at || null,
      lastBackupBytes: Number(backup.rows[0]?.size_bytes || 0),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`storage_report_${response.status}`);
  const payload = await response.json().catch(() => ({}));
  if (payload?.blocked) blocked.add(String(tenant.id));
  else blocked.delete(String(tenant.id));
  lastReport.set(String(tenant.id), Date.now());
  return payload;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await ensureBackupTables();
    const tenants = await pool.query(
      [
        'select t.id, t.external_tenant_id,',
        "(select max(b.created_at) from tenant_backups b where b.tenant_id = t.id and b.status = 'ready' and b.kind in ('weekly', 'manual')) as last_backup",
        "from tenants t where t.status = 'active'",
      ].join(' ')
    );
    let backupsLeft = isNightInArgentina() ? MAX_BACKUPS_PER_TICK : 0;
    for (const tenant of tenants.rows) {
      try {
        const due = !tenant.last_backup || Date.now() - new Date(tenant.last_backup).getTime() >= WEEK_MS;
        if (due && backupsLeft > 0) {
          backupsLeft -= 1;
          await createTenantBackup(tenant.id, 'weekly');
        }
        if (Date.now() - (lastReport.get(String(tenant.id)) || 0) >= REPORT_EVERY_MS) {
          await reportTenantUsage(tenant);
        }
      } catch (error) {
        console.error('storage_job_failed', tenant.id, error?.message || error);
      }
    }
  } catch (error) {
    console.error('storage_tick_failed', error?.message || error);
  } finally {
    running = false;
  }
}

export function startStorageJobs() {
  const timer = setInterval(() => void tick(), TICK_MS);
  timer.unref();
  // Primera pasada a los dos minutos de arrancar, para no competir con el inicio del servidor.
  setTimeout(() => void tick(), 2 * 60 * 1000).unref();
}
