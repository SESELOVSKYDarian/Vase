// Catálogo, Clientes y Pedidos compartidos: app.vase.ar los muestra cuando la cuenta tiene más de un producto.
// Solo lectura y solo con el token entre servicios. Las fotos no viajan (pesan mucho): solo si tiene o no.
import { timingSafeEqual } from 'node:crypto';
import { pool } from '../db.js';
import { resolveBusinessCatalogTenant } from '../services/businessCatalogSnapshot.js';
import { changeOrderStatus } from './orders/order-status.js';
import { changeTenantUser } from './tenant/user-access.js';
import { collectStoreImages } from '../services/storeImages.js';
import { queryTenantSettingsWithSeo } from '../services/tenantSettings.js';

const LIMIT = 200;

function serviceTokenMatches(req) {
  const expected = Buffer.from(String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim());
  const supplied = Buffer.from(String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim());
  return expected.length > 0 && expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function cleanSearch(value) {
  return String(value || '').trim().slice(0, 80);
}

// Resuelve la tienda de Business de la cuenta de Vase; responde 403/404 si no corresponde.
async function withTenant(req, res, run) {
  if (!serviceTokenMatches(req)) return res.status(403).json({ error: 'forbidden' });
  const tenant = await resolveBusinessCatalogTenant(pool, String(req.params.tenantId || '').trim());
  if (!tenant) return res.status(404).json({ error: 'BUSINESS_NOT_CONNECTED' });
  res.set('Cache-Control', 'no-store');
  return run(tenant.businessTenantId);
}

const HAS_IMAGE_SQL = "(coalesce(p.data->>'image_url', p.data->>'imageUrl', p.data->>'image', '') <> '' or jsonb_array_length(case when jsonb_typeof(p.data->'images') = 'array' then p.data->'images' else '[]'::jsonb end) > 0)";

export function registerSharedRoutes(router) {
  router.get('/internal/tenant/:tenantId/shared/catalog', async (req, res, next) => {
    try {
      return await withTenant(req, res, async (tenantId) => {
        const search = cleanSearch(req.query.q);
        const params = [tenantId];
        let where = "p.tenant_id = $1 and p.status = 'active' and p.deleted_at is null";
        if (search) {
          params.push(`%${search}%`);
          where += ` and (p.name ilike $${params.length} or p.sku ilike $${params.length} or p.brand ilike $${params.length})`;
        }
        const [summary, rows] = await Promise.all([
          pool.query(
            [
              'select count(*)::int as total,',
              'count(*) filter (where coalesce(p.stock, 0) <= 0)::int as out_of_stock,',
              `count(*) filter (where not ${HAS_IMAGE_SQL})::int as without_image,`,
              'count(*) filter (where p.external_id is not null)::int as from_system,',
              'max(p.last_sync_at) as last_sync_at',
              "from product_cache p where p.tenant_id = $1 and p.status = 'active' and p.deleted_at is null",
            ].join(' '),
            [tenantId]
          ),
          pool.query(
            [
              'select p.id, p.sku, p.name, p.brand, p.price, p.stock,',
              `${HAS_IMAGE_SQL} as has_image,`,
              '(p.external_id is not null) as from_system',
              'from product_cache p',
              `where ${where}`,
              'order by p.name asc',
              `limit ${LIMIT}`,
            ].join(' '),
            params
          ),
        ]);
        const head = summary.rows[0] || {};
        return res.json({
          total: Number(head.total || 0),
          outOfStock: Number(head.out_of_stock || 0),
          withoutImage: Number(head.without_image || 0),
          fromSystem: Number(head.from_system || 0),
          lastSyncAt: head.last_sync_at || null,
          items: rows.rows.map((row) => ({
            id: String(row.id),
            sku: row.sku || null,
            name: row.name || 'Sin nombre',
            brand: row.brand || null,
            price: row.price == null ? null : Number(row.price),
            stock: row.stock == null ? null : Number(row.stock),
            hasImage: Boolean(row.has_image),
            fromSystem: Boolean(row.from_system),
          })),
        });
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/internal/tenant/:tenantId/shared/customers', async (req, res, next) => {
    try {
      return await withTenant(req, res, async (tenantId) => {
        const search = cleanSearch(req.query.q);
        const params = [tenantId];
        let where = 'ut.tenant_id = $1';
        if (search) {
          params.push(`%${search}%`);
          where += ` and (u.display_name ilike $${params.length} or u.email ilike $${params.length} or u.phone ilike $${params.length})`;
        }
        const [count, rows] = await Promise.all([
          pool.query('select count(*)::int as total from user_tenants where tenant_id = $1', [tenantId]),
          pool.query(
            [
              'select u.id, u.display_name as name, u.email, u.phone, u.city, u.province, ut.role, ut.status, u.created_at,',
              '(select count(*)::int from orders o where o.tenant_id = ut.tenant_id and o.user_id = u.id) as orders,',
              '(select max(o.created_at) from orders o where o.tenant_id = ut.tenant_id and o.user_id = u.id) as last_order_at',
              'from user_tenants ut join users u on u.id = ut.user_id',
              `where ${where}`,
              'order by u.created_at desc',
              `limit ${LIMIT}`,
            ].join(' '),
            params
          ),
        ]);
        return res.json({
          total: Number(count.rows[0]?.total || 0),
          items: rows.rows.map((row) => ({
            id: String(row.id),
            name: row.name || null,
            email: row.email || null,
            phone: row.phone || null,
            city: [row.city, row.province].filter(Boolean).join(', ') || null,
            wholesale: row.role === 'wholesale',
            pending: row.status === 'pending',
            orders: Number(row.orders || 0),
            lastOrderAt: row.last_order_at || null,
            createdAt: row.created_at,
          })),
        });
      });
    } catch (err) {
      return next(err);
    }
  });

  router.get('/internal/tenant/:tenantId/shared/orders', async (req, res, next) => {
    try {
      return await withTenant(req, res, async (tenantId) => {
        const [count, rows] = await Promise.all([
          pool.query(
            "select count(*)::int as total, count(*) filter (where status in ('submitted', 'pending_payment', 'unpaid', 'paid', 'processing'))::int as open from orders where tenant_id = $1",
            [tenantId]
          ),
          pool.query(
            [
              'select o.id, o.status, o.checkout_mode, o.currency, o.subtotal, o.shipping, o.total, o.customer, o.created_at',
              'from orders o where o.tenant_id = $1',
              'order by o.created_at desc',
              `limit ${LIMIT}`,
            ].join(' '),
            [tenantId]
          ),
        ]);
        const ids = rows.rows.map((row) => row.id);
        const items = ids.length
          ? await pool.query('select order_id, sku, name, qty, unit_price, total from order_items where order_id = ANY($1::uuid[]) order by name asc', [ids])
          : { rows: [] };
        const byOrder = items.rows.reduce((acc, item) => {
          (acc[item.order_id] ||= []).push({
            sku: item.sku || null,
            name: item.name || 'Producto',
            qty: Number(item.qty || 0),
            unitPrice: item.unit_price == null ? null : Number(item.unit_price),
            total: item.total == null ? null : Number(item.total),
          });
          return acc;
        }, {});
        return res.json({
          total: Number(count.rows[0]?.total || 0),
          open: Number(count.rows[0]?.open || 0),
          items: rows.rows.map((row) => {
            const customer = row.customer && typeof row.customer === 'object' ? row.customer : {};
            const name = [customer.full_name || customer.fullName || customer.name || customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
            const lines = byOrder[row.id] || [];
            return {
              id: String(row.id),
              status: row.status || 'submitted',
              whatsapp: String(row.checkout_mode || '').toLowerCase().includes('whatsapp'),
              currency: row.currency || 'ARS',
              subtotal: row.subtotal == null ? null : Number(row.subtotal),
              shipping: row.shipping == null ? null : Number(row.shipping),
              total: row.total == null ? 0 : Number(row.total),
              customerName: name || customer.email || null,
              customerEmail: customer.email || null,
              customerPhone: customer.phone || customer.whatsapp || null,
              address: [customer.address, customer.city, customer.province].filter(Boolean).join(', ') || null,
              units: lines.reduce((sum, line) => sum + line.qty, 0),
              lines,
              createdAt: row.created_at,
            };
          }),
        });
      });
    } catch (err) {
      return next(err);
    }
  });

  // Imágenes: todas las fotos que usa la tienda (productos, páginas, logo y colores). Solo direcciones.
  router.get('/internal/tenant/:tenantId/shared/images', async (req, res, next) => {
    try {
      return await withTenant(req, res, async (tenantId) => {
        const [settings, sections, categories, products] = await Promise.all([
          queryTenantSettingsWithSeo(tenantId),
          pool.query(
            [
              'select pg.slug as page, s.props',
              'from page_sections s join pages pg on pg.id = s.page_id',
              "where pg.tenant_id = $1 and s.state in ('published', 'draft') and s.enabled = true",
            ].join(' '),
            [tenantId]
          ),
          pool.query('select name, data from categories where tenant_id = $1', [tenantId]),
          pool.query(
            [
              // Solo cuántas fotos tiene (pueden venir incrustadas y pesar mucho) y la foto suelta si la hay.
              "select p.id, p.name, case when jsonb_typeof(p.data->'images') = 'array' then jsonb_array_length(p.data->'images') else 0 end as image_count,",
              "jsonb_build_object('image_url', p.data->>'image_url', 'imageUrl', p.data->>'imageUrl', 'image', left(p.data->>'image', 2048)) as data",
              "from product_cache p where p.tenant_id = $1 and p.status = 'active' and p.deleted_at is null",
              'order by p.name asc',
            ].join(' '),
            [tenantId]
          ),
        ]);
        const stored = settings.rows[0] || {};
        const images = collectStoreImages({
          settings: { branding: stored.branding, theme: stored.theme, seo: stored.seo, commerce: stored.commerce },
          sections: sections.rows,
          categories: categories.rows,
          products: products.rows,
        });
        return res.json({ total: images.length, items: images });
      });
    } catch (err) {
      return next(err);
    }
  });

  // Cambiar el estado de un pedido desde app: misma lógica que el panel de Business (stock, pago y aviso).
  router.post('/internal/tenant/:tenantId/shared/orders/:orderId/status', async (req, res, next) => {
    try {
      return await withTenant(req, res, async (tenantId) => {
        const name = await pool.query('select name from tenants where id = $1', [tenantId]);
        const result = await changeOrderStatus({
          tenant: { id: tenantId, name: name.rows[0]?.name || '' },
          orderId: String(req.params.orderId || ''),
          body: req.body || {},
          actor: 'vase_app',
        });
        return res.status(result.status).json(result.body);
      });
    } catch (err) {
      return next(err);
    }
  });

  // Aprobar un cliente o pasarlo a mayorista/minorista desde app. No da acceso de administrador.
  router.post('/internal/tenant/:tenantId/shared/customers/:userId', async (req, res, next) => {
    try {
      return await withTenant(req, res, async (tenantId) => {
        const result = await changeTenantUser({
          tenantId,
          userId: String(req.params.userId || ''),
          body: req.body || {},
          allowAdmin: false,
        });
        return res.status(result.status).json(result.body);
      });
    } catch (err) {
      return next(err);
    }
  });
}