// Tarea de fondo: cada 10 minutos, en las tiendas con "Quitar fondo automático" prendido, revisa las
// fotos nuevas del catálogo y les quita el fondo. Va de a poco (unos productos por vuelta) para no
// cargar el servidor; las tiendas con mucho catálogo se completan en varias vueltas.
import { pool } from '../../db.js';
import { countPendingProducts, ensureCutoutsSchema, processTenantCatalog } from './catalogCutouts.js';

const TICK_MS = 10 * 60 * 1000;
const PRODUCTS_PER_TICK = 150;
let running = false;
/** Tiendas con el automático prendido de entrada (se completa al arrancar). */
let defaultIds = [];

/** Tiendas que tienen el quitado automático prendido de entrada. */
export function getDefaultAutoTenantIds() {
  return defaultIds;
}

/** true si la tienda tiene el quitado automático prendido (o es una de las tiendas que lo traen de entrada). */
export function isAutoRemoveEnabled(commerce, tenantId, defaultTenantIds = []) {
  const value = commerce?.auto_remove_backgrounds;
  if (value === true) return true;
  if (value === false) return false;
  return defaultTenantIds.includes(String(tenantId));
}

/** Tiendas que tienen el quitado automático prendido. */
async function tenantsWithAutoRemove(defaultTenantIds) {
  const rows = (await pool.query('select tenant_id, commerce from tenant_settings')).rows;
  return rows.filter((row) => isAutoRemoveEnabled(row.commerce, row.tenant_id, defaultTenantIds)).map((row) => String(row.tenant_id));
}

/** Una vuelta: procesa un poco de cada tienda con la opción prendida. */
async function tick(defaultTenantIds) {
  if (running) return;
  running = true;
  try {
    await ensureCutoutsSchema();
    for (const tenantId of await tenantsWithAutoRemove(defaultTenantIds)) {
      if ((await countPendingProducts(tenantId)) === 0) continue;
      const status = await processTenantCatalog(tenantId, { limit: PRODUCTS_PER_TICK });
      if (status.products || status.failed) {
        console.info(`[bg-removal] tienda=${tenantId} productos=${status.products} fotos=${status.images} errores=${status.failed} faltan=${status.remaining ?? '?'}`);
      }
    }
  } catch (error) {
    console.error('[bg-removal] tarea automática', error instanceof Error ? error.message : error);
  } finally {
    running = false;
  }
}

/**
 * Prende la tarea. defaultTenantIds: tiendas que tienen el quitado automático prendido de entrada
 * aunque no lo hayan configurado (por ejemplo Sanitarios El Teflón).
 */
export function startBackgroundRemovalJobs(defaultTenantIds = []) {
  if (process.env.DISABLE_BG_REMOVAL === 'true') return;
  const ids = defaultTenantIds.filter(Boolean).map(String);
  defaultIds = ids;
  setTimeout(() => void tick(ids), 2 * 60 * 1000).unref?.();
  setInterval(() => void tick(ids), TICK_MS).unref?.();
}
