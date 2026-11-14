// Lista de productos para el panel.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { PRODUCT_DATA_WITH_IMAGE_ROUTES_SQL } from '../../services/publicMedia.js';
import { getTenantId } from './helpers-common.js';
import { PUBLIC_IMAGE_ROUTE_VISIBLE_SQL, loadTenantPriceTierLabels, mapTenantProductRecord } from './helpers-products.js';

tenantRouter.get('/products', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const [priceTierLabels, result] = await Promise.all([
      loadTenantPriceTierLabels(pool, tenantId),
      pool.query(
      [
        [
          'select p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.description, p.price, p.price_wholesale, p.stock, p.brand,',
          // Las fotos guardadas en base64 viajan como rutas cortas: con todas las fotos adentro el panel
          // descargaba cientos de MB al abrir y se quedaba en "Cargando datos".
          `case when ${PUBLIC_IMAGE_ROUTE_VISIBLE_SQL} then ${PRODUCT_DATA_WITH_IMAGE_ROUTES_SQL} else p.data end as data,`,
          "(o.featured = true) as is_featured,",
          "case when o.hidden = true then false else coalesce(p.is_visible_web, true) end as is_visible_web,",
          'coalesce(p.admin_locked, false) as admin_locked,',
          'coalesce(p.is_active_source, true) as is_active_source,',
          'p.deleted_at, p.last_sync_at,',
          "case when p.external_id is null then 'manual' when p.deleted_at is not null then 'deleted' when coalesce(p.is_active_source, true) = false then 'source_inactive' else 'synced' end as sync_status,",
          "coalesce((select array_agg(pc.category_id) from product_categories pc where pc.product_id = p.id), '{}'::uuid[]) as category_ids",
        ].join(' '),
        'from product_cache p',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        "where p.tenant_id = $1 and p.status = 'active'",
        'order by p.name asc'
      ].join(' '),
      [tenantId]
    )]);
    return res.json({ items: result.rows.map((row) => mapTenantProductRecord(row, priceTierLabels)) });
  } catch (err) {
    return next(err);
  }
});
