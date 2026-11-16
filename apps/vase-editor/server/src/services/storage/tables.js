// Qué tablas forman una tienda: sirve para medir cuánto ocupa y para la copia de seguridad.
// El orden es de "padre" a "hijo": así se restaura; para borrar se recorre al revés.
// No entran usuarios, dominios ni credenciales: una copia vieja no debe pisar accesos ni contraseñas.
import { pool } from '../../db.js';

const OWN = 't.tenant_id = $1';

export const STORE_TABLES = [
  { name: 'tenant_settings', where: OWN, group: 'design' },
  { name: 'pages', where: OWN, group: 'design' },
  { name: 'page_sections', where: 't.page_id in (select id from pages where tenant_id = $1)', group: 'design' },
  { name: 'assets', where: OWN, group: 'design' },
  { name: 'categories', where: OWN, group: 'catalog' },
  { name: 'product_cache', where: OWN, group: 'catalog' },
  { name: 'product_categories', where: 't.product_id in (select id from product_cache where tenant_id = $1)', group: 'catalog' },
  { name: 'product_collections', where: OWN, group: 'catalog' },
  { name: 'collection_items', where: 't.collection_id in (select id from product_collections where tenant_id = $1)', group: 'catalog' },
  { name: 'product_overrides', where: OWN, group: 'catalog' },
  // Si el cliente que opinó o compró ya no existe, la fila vuelve sin dueño en vez de frenar todo.
  { name: 'product_reviews', where: OWN, group: 'catalog', nullIfUserMissing: true },
  { name: 'price_lists', where: OWN, group: 'catalog' },
  { name: 'user_price_list', where: OWN, group: 'catalog', skipIfUserMissing: true },
  { name: 'tenant_offers', where: OWN, group: 'catalog' },
  { name: 'orders', where: OWN, group: 'orders', nullIfUserMissing: true },
  { name: 'order_items', where: 't.order_id in (select id from orders where tenant_id = $1)', group: 'orders' },
  { name: 'payments', where: OWN, group: 'orders' },
];

let existing = null;

/** Algunas tablas se crean recién cuando se usan por primera vez: solo se trabaja con las que existen. */
export async function listExistingStoreTables(db = pool) {
  if (existing) return existing;
  const result = await db.query('select name from unnest($1::text[]) as name where to_regclass(name) is not null', [
    STORE_TABLES.map((table) => table.name),
  ]);
  const found = new Set(result.rows.map((row) => row.name));
  existing = STORE_TABLES.filter((table) => found.has(table.name));
  return existing;
}

/** Busca la tienda de Business que corresponde a una cuenta de Vase. */
export async function findTenantByVaseId(vaseTenantId, db = pool) {
  const result = await db.query(
    "select id, name from tenants where external_source = 'vase' and external_tenant_id = $1 limit 1",
    [String(vaseTenantId || '')]
  );
  return result.rows[0] || null;
}
