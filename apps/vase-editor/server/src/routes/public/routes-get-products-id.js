// Rutas de public.js: use-middleware, use-middleware, get-tenant, get-categories, get-brands, get-pages-slug, get-products, get-products-names.
import { resolveTenant } from '../../middleware/tenant.js';
import { normalizePriceTierLabels } from '../../services/priceTierLabels.js';
import { pool } from '../../db.js';
import { ensureTenantSettingsSeoColumn, queryTenantSettingsWithSeo } from '../../services/tenantSettings.js';
import { applyVaseBusinessProfile, vaseProfileForTenant } from '../../services/vaseBusinessProfile.js';
import { PUBLIC_PRODUCT_DATA_SQL, externalizePageProps } from '../../services/publicMedia.js';
import { applyTenantSeoDefaults } from '../../services/tenantSeo.js';
import { PUBLIC_PRODUCT_CATEGORY_SELECT_SQL, PUBLIC_PRODUCT_VISIBILITY_SQL, UUID_REGEX, buildListingCacheKey, buildPricingContext, mediaRouter, publicListingCache, publicNamesCache, publicRouter } from './build-pricing-context.js';
import { mapProductRow } from './map-product-row.js';
import { buildProductsListing, groupProductsByVariation } from './build-products-listing.js';

publicRouter.use(mediaRouter);
publicRouter.use(resolveTenant);


publicRouter.get('/tenant', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, max-age=0');
    await ensureTenantSettingsSeoColumn();
    const result = await queryTenantSettingsWithSeo(req.tenant.id);
    const rawSettings = result.rows[0] || { branding: {}, theme: {}, commerce: {} };
    const commerce = rawSettings.commerce && typeof rawSettings.commerce === 'object' ? rawSettings.commerce : {};
    const settings = {
      ...rawSettings,
      branding: rawSettings.branding || {},
      theme: rawSettings.theme || {},
      // Titulo, descripcion y favicon por defecto de la tienda cuando el panel admin los deja vacios.
      seo: applyTenantSeoDefaults(rawSettings.seo || {}, req.tenant, rawSettings.branding),
      commerce: {
        ...commerce,
        price_tier_labels: normalizePriceTierLabels(commerce.price_tier_labels),
      },
    };
    const settingsWithProfile = applyVaseBusinessProfile(settings, await vaseProfileForTenant(req.tenant.id));
    return res.json({ tenant: req.tenant, settings: settingsWithProfile });
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query(
      [
        'select c.id, c.name, c.slug,',
        "nullif(c.data->>'parent_id', '') as parent_id,",
        'parent.name as parent_name',
        'from categories c',
        "left join categories parent on parent.tenant_id = c.tenant_id and parent.id::text = nullif(c.data->>'parent_id', '')",
        'where c.tenant_id = $1',
        [
          "order by coalesce(parent.name, c.name) asc,",
          "case when nullif(c.data->>'parent_id', '') is null then 0 else 1 end asc,",
          'c.name asc',
        ].join(' '),
      ].join(' '),
      [req.tenant.id]
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/brands', async (req, res, next) => {
  try {
    const [settingsRes, result] = await Promise.all([
      pool.query(
        'select commerce from tenant_settings where tenant_id = $1',
        [req.tenant.id]
      ),
      pool.query(
        [
          'select distinct p.brand',
          'from product_cache p',
          'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
          'where p.tenant_id = $1',
          "and p.brand is not null and trim(p.brand) <> ''",
          `and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
        ].join(' '),
        [req.tenant.id]
      ),
    ]);

    const commerce = settingsRes.rows[0]?.commerce || {};
    const settingsBrands = Array.isArray(commerce.brands)
      ? commerce.brands.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const productBrands = result.rows.map((r) => String(r.brand || '').trim()).filter(Boolean);

    const merged = new Map();
    [...settingsBrands, ...productBrands].forEach((item) => {
      const key = item.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, item);
      }
    });

    const brands = [...merged.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return res.json(brands);
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/pages/:slug', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, max-age=0');
    const pageRes = await pool.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [req.tenant.id, req.params.slug]
    );
    if (!pageRes.rowCount) {
      return res.status(404).json({ error: 'page_not_found' });
    }

    const sectionsRes = await pool.query(
      'select id, type, enabled, sort_order, props, updated_at from page_sections where page_id = $1 and state = $2 order by sort_order asc',
      [pageRes.rows[0].id, 'published']
    );

    const sections = sectionsRes.rows
      .filter((row) => row.enabled)
      .map((row) => ({
        id: row.id,
        type: row.type,
        enabled: row.enabled,
        sort_order: row.sort_order,
        // Imagenes y videos en base64 se sirven aparte, con cache largo (ver mediaRouter).
        props: externalizePageProps(row.props || {}, {
          slug: req.params.slug,
          sectionId: row.id,
          version: Math.floor(new Date(row.updated_at || 0).getTime() / 1000),
        }),
      }));

    return res.json({ slug: req.params.slug, sections });
  } catch (err) {
    return next(err);
  }
});


publicRouter.get('/products', async (req, res, next) => {
  try {
    res.set('Vary', 'Authorization');
    // El precio depende del usuario: solo se cachea la vista anonima.
    if (req.user) {
      return res.json(await buildProductsListing(req));
    }
    // La renovacion en segundo plano no debe retener la peticion: usa una copia minima de lo que necesita.
    const snapshot = { tenant: req.tenant, query: { ...req.query }, user: undefined };
    const body = await publicListingCache.get(buildListingCacheKey(req), async () =>
      JSON.stringify(await buildProductsListing(snapshot))
    );
    return res.type('application/json').send(body);
  } catch (err) {
    return next(err);
  }
});

// Solo los nombres (sin imagenes ni variaciones): lo usa el buscador del header.
publicRouter.get('/products/names', async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const body = await publicNamesCache.get(tenantId, async () => {
      const result = await pool.query(
        [
          'select distinct p.name',
          'from product_cache p',
          'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
          `where p.tenant_id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
          'order by p.name asc',
        ].join(' '),
        [tenantId]
      );
      const names = result.rows.map((row) => String(row.name || '').trim()).filter(Boolean);
      return JSON.stringify({ names });
    });
    return res.type('application/json').send(body);
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/products/:id', async (req, res, next) => {
  try {
    const pricingContext = await buildPricingContext(req);
    const id = req.params.id;

    if (!UUID_REGEX.test(id)) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const result = await pool.query(
      [
        'select p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand,',
        `${PUBLIC_PRODUCT_DATA_SQL},`,
        PUBLIC_PRODUCT_CATEGORY_SELECT_SQL,
        'from product_cache p',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        `where p.tenant_id = $1 and p.id = $2 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
      ].join(' '),
      [req.tenant.id, id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'product_not_found' });
    }

    const row = result.rows[0];
    const product = mapProductRow(row, pricingContext);
    const variationGroup = String(product.variation_group || '').trim();

    if (variationGroup) {
      const variationsRes = await pool.query(
        [
          'select p.id, p.erp_id, p.sku, p.name, p.description, p.price, p.price_wholesale, p.currency, p.stock, p.brand,',
        `${PUBLIC_PRODUCT_DATA_SQL},`,
          PUBLIC_PRODUCT_CATEGORY_SELECT_SQL,
          'from product_cache p',
          'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
          `where p.tenant_id = $1 and ${PUBLIC_PRODUCT_VISIBILITY_SQL}`,
          "and (p.data->>'variant_group' = $2 or p.data->>'variantGroup' = $2 or p.data->>'collection' = $2)",
          'order by p.name asc',
        ].join(' '),
        [req.tenant.id, variationGroup]
      );

      const variationItems = variationsRes.rows.map((item) => mapProductRow(item, pricingContext));
      if (variationItems.length > 1) {
        const groupedProduct = groupProductsByVariation(variationItems, 'name-asc')[0];
        product.grouped = Boolean(groupedProduct?.grouped);
        product.variation_group_label = groupedProduct?.variation_group_label || product.variation_group_label;
        product.variation_count = groupedProduct?.variation_count || variationItems.length;
        product.price_range = groupedProduct?.price_range || null;
        product.variations = Array.isArray(groupedProduct?.variations)
          ? groupedProduct.variations
          : variationItems;
      }
    }

    return res.json(product);
  } catch (err) {
    return next(err);
  }
});
