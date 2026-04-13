import { Router } from 'express';
import { pool } from '../db.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { resolve4, resolveCname } from 'node:dns/promises';
import { fileURLToPath } from 'url';
import { ensureDefaultPriceLists, ensurePricingSchema } from '../services/userPricing.js';
import { getTenantOffers } from '../services/offers.js';
import { buildTenantIntegrationManifest, resolveServerBaseUrl } from '../services/integrationManifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)'));
    }
  }
});

export const tenantRouter = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getTenantId(req, res) {
  const headerTenant = req.get('x-tenant-id');
  const tenantId = (req.user && req.user.tenantId) || headerTenant || null;
  if (!tenantId) {
    res.status(400).json({ error: 'tenant_required' });
    return null;
  }
  if (!UUID_REGEX.test(tenantId)) {
    res.status(400).json({ error: 'invalid_tenant_id' });
    return null;
  }
  return tenantId;
}

function isUuid(value) {
  return UUID_REGEX.test(String(value || ''));
}

function slugify(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeBrandName(value) {
  return String(value || '').trim();
}

function normalizeDomainInput(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

function isValidDomain(value) {
  const normalized = normalizeDomainInput(value);
  if (!normalized) return false;
  if (normalized === 'localhost') return true;
  return /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(normalized);
}

function normalizeSubdomainLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function getPlatformDomainConfig() {
  const platformBaseDomain = String(process.env.PLATFORM_BASE_DOMAIN || '').trim().toLowerCase();
  const platformCnameTarget = String(
    process.env.PLATFORM_CNAME_TARGET ||
    process.env.PUBLIC_STOREFRONT_HOST ||
    'cname.vercel-dns.com'
  ).trim().toLowerCase();
  const platformApexIp = String(process.env.PLATFORM_APEX_IP || '76.76.21.21').trim();

  return {
    platformBaseDomain,
    platformCnameTarget,
    platformApexIp,
  };
}

function inferDomainMode(domain, platformBaseDomain = '') {
  const normalized = normalizeDomainInput(domain);
  if (platformBaseDomain && normalized.endsWith(`.${platformBaseDomain}`)) return 'platform';
  return normalized.split('.').length > 2 ? 'subdomain' : 'apex';
}

function buildDomainDnsPlan(domain, config) {
  const normalizedDomain = normalizeDomainInput(domain);
  const mode = inferDomainMode(normalizedDomain, config.platformBaseDomain);
  const labels = normalizedDomain.split('.');
  const rootDomain = labels.length > 2 ? labels.slice(-2).join('.') : normalizedDomain;
  const hostLabel = labels.length > 2 ? labels.slice(0, -2).join('.') : '@';

  if (mode === 'platform') {
    return {
      connection_type: 'platform',
      mode,
      root_domain: config.platformBaseDomain || normalizedDomain,
      host_label: normalizedDomain.replace(`.${config.platformBaseDomain}`, ''),
      required_records: [],
      dns_hint: 'No requiere configuracion DNS manual. La plataforma publica y protege este subdominio.',
    };
  }

  if (mode === 'subdomain') {
    return {
      connection_type: 'custom',
      mode,
      root_domain: rootDomain,
      host_label: hostLabel,
      required_records: [
        {
          type: 'CNAME',
          host: hostLabel || normalizedDomain,
          value: config.platformCnameTarget,
          ttl: 'Auto',
        },
      ],
      dns_hint: `Configura un CNAME para ${hostLabel || normalizedDomain} apuntando a ${config.platformCnameTarget}.`,
    };
  }

  return {
    connection_type: 'custom',
    mode,
    root_domain: normalizedDomain,
    host_label: '@',
    required_records: [
      {
        type: 'A',
        host: '@',
        value: config.platformApexIp,
        ttl: 'Auto',
      },
      {
        type: 'CNAME',
        host: 'www',
        value: config.platformCnameTarget,
        ttl: 'Auto',
      },
    ],
    dns_hint: `Apunta el dominio raiz a ${config.platformApexIp} y, si quieres usar www, agrega un CNAME hacia ${config.platformCnameTarget}.`,
  };
}

async function resolveDnsWithFallback(resolveFn, domain) {
  try {
    const result = await Promise.race([
      resolveFn(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('dns_timeout')), 2500)),
    ]);
    return Array.isArray(result) ? result.map((item) => normalizeDomainInput(item)) : [];
  } catch (err) {
    return [];
  }
}

async function inspectDomainConnection(domain, config) {
  const normalizedDomain = normalizeDomainInput(domain);
  const plan = buildDomainDnsPlan(normalizedDomain, config);
  const checkedAt = new Date().toISOString();

  if (plan.connection_type === 'platform') {
    return {
      status: 'active',
      label: 'Activo',
      message: 'El subdominio pertenece a la plataforma y queda listo apenas se guarda.',
      last_checked_at: checkedAt,
      observed_records: {
        a: [],
        cname: [],
      },
    };
  }

  const [aRecords, cnameRecords] = await Promise.all([
    resolveDnsWithFallback(resolve4, normalizedDomain),
    resolveDnsWithFallback(resolveCname, normalizedDomain),
  ]);

  const matchesA = aRecords.includes(config.platformApexIp);
  const matchesCname = cnameRecords.includes(config.platformCnameTarget);
  const hasAnyRecord = aRecords.length > 0 || cnameRecords.length > 0;

  if (matchesA || matchesCname) {
    return {
      status: 'active',
      label: 'Activo',
      message: 'El DNS ya apunta a la plataforma. Falta solo que Vercel termine de emitir SSL si todavia no aparece en vivo.',
      last_checked_at: checkedAt,
      observed_records: {
        a: aRecords,
        cname: cnameRecords,
      },
    };
  }

  if (hasAnyRecord) {
    return {
      status: 'attention',
      label: 'Revisar',
      message: 'Detectamos DNS publicados, pero no apuntan a los valores esperados para esta tienda.',
      last_checked_at: checkedAt,
      observed_records: {
        a: aRecords,
        cname: cnameRecords,
      },
    };
  }

  return {
    status: 'dns_pending',
    label: 'DNS pendiente',
    message: plan.dns_hint,
    last_checked_at: checkedAt,
    observed_records: {
      a: aRecords,
      cname: cnameRecords,
    },
  };
}

function parseUuidArray(value) {
  const list = Array.isArray(value) ? value : [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const unique = new Set();
  for (const item of list) {
    const raw = String(item || '').trim();
    if (!raw) continue;
    if (!uuidRegex.test(raw)) {
      return { ok: false, items: [] };
    }
    unique.add(raw);
  }
  return { ok: true, items: [...unique] };
}

function parseBooleanInput(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

async function fetchTenantProductRow(db, tenantId, productId) {
  const result = await db.query(
    [
      [
        'select p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.description, p.price, p.price_wholesale, p.stock, p.brand, p.data,',
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
      'where p.tenant_id = $1 and p.id = $2',
    ].join(' '),
    [tenantId, productId]
  );

  return result.rows[0] || null;
}

async function upsertTenantCommerce(tenantId, commerce) {
  const existing = await pool.query(
    'select tenant_id from tenant_settings where tenant_id = $1',
    [tenantId]
  );

  if (!existing.rowCount) {
    await pool.query(
      'insert into tenant_settings (tenant_id, branding, theme, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb)',
      [tenantId, {}, {}, commerce || {}]
    );
    return;
  }

  await pool.query(
    [
      'update tenant_settings',
      'set commerce = $2::jsonb,',
      'updated_at = now()',
      'where tenant_id = $1',
    ].join(' '),
    [tenantId, commerce || {}]
  );
}

async function findLatestProductSyncToken(db, tenantId) {
  const result = await db.query(
    [
      'select id, name, token_hash, scope, created_at',
      'from api_tokens',
      'where tenant_id = $1',
      "and (scope = 'products:sync' or scope = '*')",
      'order by created_at desc',
      'limit 1',
    ].join(' '),
    [tenantId]
  );

  return result.rows[0] || null;
}

function createProductSyncTokenValue() {
  return `teflon_${crypto.randomBytes(24).toString('hex')}`;
}

async function ensureProductSyncToken(db, tenantId, tokenName = 'ERP Sync') {
  const existing = await findLatestProductSyncToken(db, tenantId);
  if (existing) {
    return { tokenRecord: existing, autoCreated: false };
  }

  const tokenValue = createProductSyncTokenValue();
  const insertRes = await db.query(
    [
      'insert into api_tokens (tenant_id, name, token_hash, scope)',
      'values ($1, $2, $3, $4)',
      'returning id, name, token_hash, scope, created_at',
    ].join(' '),
    [tenantId, tokenName, tokenValue, 'products:sync']
  );

  return {
    tokenRecord: insertRes.rows[0],
    autoCreated: true,
  };
}

async function listTenantDomains(db, tenantId) {
  const result = await db.query(
    [
      'select domain, is_primary, created_at',
      'from tenant_domains',
      'where tenant_id = $1',
      'order by is_primary desc, created_at asc, domain asc',
    ].join(' '),
    [tenantId]
  );

  return result.rows;
}

async function buildTenantDomainsPayload(db, tenantId) {
  const tenantRes = await db.query(
    [
      'select t.name, ts.branding',
      'from tenants t',
      'left join tenant_settings ts on ts.tenant_id = t.id',
      'where t.id = $1',
      'limit 1',
    ].join(' '),
    [tenantId]
  );

  const tenant = tenantRes.rows[0] || {};
  const brandingName = String(tenant?.branding?.name || tenant?.name || 'mi-tienda').trim();
  const suggestedSubdomain = normalizeSubdomainLabel(slugify(brandingName) || 'mi-tienda');
  const domains = await listTenantDomains(db, tenantId);
  const primaryDomain = domains.find((item) => item.is_primary)?.domain || null;
  const platformConfig = getPlatformDomainConfig();
  const enrichedDomains = await Promise.all(
    domains.map(async (item) => {
      const plan = buildDomainDnsPlan(item.domain, platformConfig);
      const verification = await inspectDomainConnection(item.domain, platformConfig);
      return {
        ...item,
        ...plan,
        verification,
      };
    })
  );
  const summary = enrichedDomains.reduce(
    (acc, item) => {
      acc.connected += 1;
      if (item.verification?.status === 'active') acc.active += 1;
      else if (item.verification?.status === 'attention') acc.attention += 1;
      else acc.pending += 1;
      return acc;
    },
    { connected: 0, active: 0, attention: 0, pending: 0 }
  );

  return {
    tenant_id: tenantId,
    primary_domain: primaryDomain,
    domains: enrichedDomains,
    summary,
    platform: {
      enabled: Boolean(platformConfig.platformBaseDomain),
      base_domain: platformConfig.platformBaseDomain || null,
      cname_target: platformConfig.platformCnameTarget || null,
      apex_ip: platformConfig.platformApexIp || null,
      suggested_subdomain: suggestedSubdomain,
      suggested_domain: platformConfig.platformBaseDomain ? `${suggestedSubdomain}.${platformConfig.platformBaseDomain}` : null,
    },
  };
}

async function upsertTenantDomain(db, tenantId, domain, { isPrimary = true } = {}) {
  const normalizedDomain = normalizeDomainInput(domain);
  if (!isValidDomain(normalizedDomain)) {
    const error = new Error('invalid_domain');
    error.status = 400;
    error.code = 'invalid_domain';
    throw error;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existingDomainRes = await client.query(
      'select tenant_id from tenant_domains where domain = $1 limit 1',
      [normalizedDomain]
    );

    if (existingDomainRes.rowCount && existingDomainRes.rows[0].tenant_id !== tenantId) {
      const error = new Error('domain_in_use');
      error.status = 409;
      error.code = 'domain_in_use';
      throw error;
    }

    if (isPrimary) {
      await client.query(
        'update tenant_domains set is_primary = false where tenant_id = $1',
        [tenantId]
      );
    }

    if (existingDomainRes.rowCount) {
      await client.query(
        [
          'update tenant_domains',
          'set is_primary = $3',
          'where tenant_id = $1 and domain = $2',
        ].join(' '),
        [tenantId, normalizedDomain, isPrimary]
      );
    } else {
      await client.query(
        'insert into tenant_domains (tenant_id, domain, is_primary) values ($1, $2, $3)',
        [tenantId, normalizedDomain, isPrimary]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return buildTenantDomainsPayload(db, tenantId);
}

async function removeTenantDomain(db, tenantId, domain) {
  const normalizedDomain = normalizeDomainInput(domain);
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentRes = await client.query(
      'select domain, is_primary from tenant_domains where tenant_id = $1 and domain = $2 limit 1',
      [tenantId, normalizedDomain]
    );

    if (!currentRes.rowCount) {
      const error = new Error('domain_not_found');
      error.status = 404;
      error.code = 'domain_not_found';
      throw error;
    }

    await client.query(
      'delete from tenant_domains where tenant_id = $1 and domain = $2',
      [tenantId, normalizedDomain]
    );

    if (currentRes.rows[0].is_primary) {
      await client.query(
        [
          'with next_domain as (',
          'select domain from tenant_domains where tenant_id = $1 order by created_at asc, domain asc limit 1',
          ')',
          'update tenant_domains set is_primary = true',
          'where tenant_id = $1 and domain = (select domain from next_domain)',
        ].join(' '),
        [tenantId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return buildTenantDomainsPayload(db, tenantId);
}

tenantRouter.get('/settings', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const result = await pool.query(
      'select branding, theme, commerce from tenant_settings where tenant_id = $1',
      [tenantId]
    );
    const settings = result.rows[0] || { branding: {}, theme: {}, commerce: {} };
    return res.json({ tenant_id: tenantId, settings });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.get('/domains', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    return res.json(await buildTenantDomainsPayload(pool, tenantId));
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/domains', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const domain = String(req.body?.domain || '').trim();
    if (!domain) {
      return res.status(400).json({ error: 'domain_required' });
    }

    const payload = await upsertTenantDomain(pool, tenantId, domain, {
      isPrimary: parseBooleanInput(req.body?.is_primary, true),
    });

    return res.status(201).json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.post('/domains/platform', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const platformBaseDomain = String(process.env.PLATFORM_BASE_DOMAIN || '').trim().toLowerCase();
  if (!platformBaseDomain) {
    return res.status(400).json({ error: 'platform_domain_not_configured' });
  }

  try {
    const subdomain = normalizeSubdomainLabel(req.body?.subdomain || '');
    if (!subdomain) {
      return res.status(400).json({ error: 'subdomain_required' });
    }

    const fullDomain = `${subdomain}.${platformBaseDomain}`;
    const payload = await upsertTenantDomain(pool, tenantId, fullDomain, {
      isPrimary: parseBooleanInput(req.body?.is_primary, true),
    });

    return res.status(201).json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.post('/domains/check', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = await buildTenantDomainsPayload(pool, tenantId);
    const requestedDomain = normalizeDomainInput(req.body?.domain || '');
    if (!requestedDomain) {
      return res.json(payload);
    }

    const target = payload.domains.find((item) => item.domain === requestedDomain) || null;
    return res.json({
      ...payload,
      checked_domain: target,
    });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.patch('/domains/:domain/primary', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = await upsertTenantDomain(pool, tenantId, decodeURIComponent(req.params.domain || ''), {
      isPrimary: true,
    });
    return res.json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.delete('/domains/:domain', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = await removeTenantDomain(pool, tenantId, decodeURIComponent(req.params.domain || ''));
    return res.json(payload);
  } catch (err) {
    if (err?.status && err?.code) {
      return res.status(err.status).json({ error: err.code });
    }
    return next(err);
  }
});

tenantRouter.get('/integrations/product-sync', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const { tokenRecord, autoCreated } = await ensureProductSyncToken(pool, tenantId);
    const baseUrl = resolveServerBaseUrl(req);
    return res.json({
      ...buildTenantIntegrationManifest({
        baseUrl,
        tenantId,
        tokenRecord,
      }),
      token_auto_created: autoCreated,
    });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/integrations/product-sync/token/rotate', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const tokenName = String(req.body?.name || 'ERP Sync').trim() || 'ERP Sync';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      "delete from api_tokens where tenant_id = $1 and scope = 'products:sync'",
      [tenantId]
    );

    const tokenValue = createProductSyncTokenValue();
    const insertRes = await client.query(
      [
        'insert into api_tokens (tenant_id, name, token_hash, scope)',
        'values ($1, $2, $3, $4)',
        'returning id, name, token_hash, scope, created_at',
      ].join(' '),
      [tenantId, tokenName, tokenValue, 'products:sync']
    );

    await client.query('COMMIT');
    const baseUrl = resolveServerBaseUrl(req);

    return res.json({
      ...buildTenantIntegrationManifest({
        baseUrl,
        tenantId,
        tokenRecord: insertRes.rows[0],
      }),
      token_auto_created: false,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.put('/settings', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const branding = req.body.branding || {};
    const theme = req.body.theme || {};
    const commerce = req.body.commerce || {};

    const existing = await pool.query(
      'select tenant_id from tenant_settings where tenant_id = $1',
      [tenantId]
    );

    if (!existing.rowCount) {
      const insertRes = await pool.query(
        'insert into tenant_settings (tenant_id, branding, theme, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb) returning branding, theme, commerce',
        [tenantId, branding, theme, commerce]
      );
      return res.json({ tenant_id: tenantId, settings: insertRes.rows[0] });
    }

    const updateRes = await pool.query(
      [
        'update tenant_settings',
        'set branding = branding || $2::jsonb,',
        'theme = theme || $3::jsonb,',
        'commerce = commerce || $4::jsonb,',
        'updated_at = now()',
        'where tenant_id = $1',
        'returning branding, theme, commerce',
      ].join(' '),
      [tenantId, branding, theme, commerce]
    );

    return res.json({ tenant_id: tenantId, settings: updateRes.rows[0] });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.get('/pages/:slug', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const pageRes = await pool.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [tenantId, req.params.slug]
    );
    if (!pageRes.rowCount) {
      return res.status(404).json({ error: 'page_not_found' });
    }

    const pageId = pageRes.rows[0].id;
    const draftRes = await pool.query(
      'select id, type, enabled, sort_order, props from page_sections where page_id = $1 and state = $2 order by sort_order asc',
      [pageId, 'draft']
    );

    const source = draftRes.rowCount ? draftRes.rows : (await pool.query(
      'select id, type, enabled, sort_order, props from page_sections where page_id = $1 and state = $2 order by sort_order asc',
      [pageId, 'published']
    )).rows;

    const sections = source.map((row) => ({
      id: row.id,
      type: row.type,
      enabled: row.enabled,
      sort_order: row.sort_order,
      props: row.props || {},
    }));

    return res.json({ slug: req.params.slug, sections });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/pages/:slug', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const sections = Array.isArray(req.body.sections) ? req.body.sections : null;
  if (!sections) {
    return res.status(400).json({ error: 'sections_required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let pageId;
    const pageRes = await client.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [tenantId, req.params.slug]
    );

    if (pageRes.rowCount) {
      pageId = pageRes.rows[0].id;
    } else {
      const insertRes = await client.query(
        'insert into pages (tenant_id, slug) values ($1, $2) returning id',
        [tenantId, req.params.slug]
      );
      pageId = insertRes.rows[0].id;
    }

    await client.query(
      'delete from page_sections where page_id = $1 and state = $2',
      [pageId, 'draft']
    );

    let sortOrder = 0;
    console.log(`Saving ${sections.length} sections for slug: ${req.params.slug}`);
    for (const section of sections) {
      sortOrder += 1;
      console.log(` - Section: ${section.type}, Props:`, JSON.stringify(section.props));
      await client.query(
        [
          'insert into page_sections (page_id, state, type, enabled, sort_order, props)',
          'values ($1, $2, $3, $4, $5, $6::jsonb)',
        ].join(' '),
        [
          pageId,
          'draft',
          section.type,
          section.enabled !== false,
          section.sort_order || sortOrder,
          section.props || {},
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.post('/pages/:slug/publish', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pageRes = await client.query(
      'select id from pages where tenant_id = $1 and slug = $2',
      [tenantId, req.params.slug]
    );
    if (!pageRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'page_not_found' });
    }

    const pageId = pageRes.rows[0].id;
    await client.query(
      'delete from page_sections where page_id = $1 and state = $2',
      [pageId, 'published']
    );

    await client.query(
      [
        'insert into page_sections (page_id, state, type, enabled, sort_order, props)',
        'select page_id, $2, type, enabled, sort_order, props',
        'from page_sections where page_id = $1 and state = $3',
      ].join(' '),
      [pageId, 'published', 'draft']
    );

    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Category Management
tenantRouter.get('/categories', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

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
      [tenantId]
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/categories', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const name = String(req.body?.name || '').trim();
  const customSlug = String(req.body?.slug || '').trim();
  const parentId = String(req.body?.parent_id || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }
  if (parentId && !isUuid(parentId)) {
    return res.status(400).json({ error: 'invalid_parent_category_id' });
  }

  let baseSlug = slugify(customSlug || name);
  if (!baseSlug) {
    baseSlug = `category-${Date.now()}`;
  }

  const client = await pool.connect();
  try {
    let parentCategory = null;
    if (parentId) {
      const parentRes = await client.query(
        'select id, name, slug from categories where tenant_id = $1 and id = $2',
        [tenantId, parentId]
      );
      if (!parentRes.rowCount) {
        return res.status(404).json({ error: 'parent_category_not_found' });
      }
      parentCategory = parentRes.rows[0];
      if (!customSlug) {
        const candidateFromParent = slugify(`${parentCategory.slug}-${name}`);
        if (candidateFromParent) {
          baseSlug = candidateFromParent;
        }
      }
    }

    const payloadData = parentCategory
      ? { parent_id: parentCategory.id }
      : {};

    let suffix = 1;
    while (true) {
      const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
      const insertRes = await client.query(
        [
          'insert into categories (tenant_id, name, slug, data)',
          'values ($1, $2, $3, $4::jsonb)',
          'on conflict (tenant_id, slug) do nothing',
          'returning id, name, slug',
        ].join(' '),
        [tenantId, name, candidate, payloadData]
      );
      if (insertRes.rowCount) {
        return res.status(201).json({
          ...insertRes.rows[0],
          parent_id: parentCategory?.id || null,
          parent_name: parentCategory?.name || null,
        });
      }
      suffix += 1;
    }
  } catch (err) {
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.delete('/categories/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const categoryId = req.params.id;
  if (!isUuid(categoryId)) {
    return res.status(400).json({ error: 'invalid_category_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryRes = await client.query(
      'select id, name from categories where tenant_id = $1 and id = $2',
      [tenantId, categoryId]
    );
    if (!categoryRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'category_not_found' });
    }

    const childrenRes = await client.query(
      [
        'select id, name',
        'from categories',
        "where tenant_id = $1 and nullif(data->>'parent_id', '') = $2",
        'order by name asc',
      ].join(' '),
      [tenantId, categoryId]
    );
    if (childrenRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'category_has_children',
        message: 'Debes eliminar primero las subcategorias de esta categoria',
        children: childrenRes.rows,
      });
    }

    // Keep advanced offers consistent when a category is removed.
    await client.query(
      [
        'update tenant_offers',
        'set category_ids = array_remove(category_ids, $2::uuid),',
        'updated_at = now()',
        'where tenant_id = $1 and $2::uuid = any(category_ids)',
      ].join(' '),
      [tenantId, categoryId]
    );

    await client.query(
      'delete from categories where tenant_id = $1 and id = $2',
      [tenantId, categoryId]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, id: categoryId });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Brand Management
tenantRouter.get('/brands', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const [settingsRes, productRes] = await Promise.all([
      pool.query(
        'select commerce from tenant_settings where tenant_id = $1',
        [tenantId]
      ),
      pool.query(
        'select distinct brand from product_cache where tenant_id = $1 and brand is not null and trim(brand) <> \'\'',
        [tenantId]
      ),
    ]);

    const commerce = settingsRes.rows[0]?.commerce || {};
    const settingsBrands = Array.isArray(commerce.brands) ? commerce.brands : [];
    const productBrands = productRes.rows.map((row) => normalizeBrandName(row.brand)).filter(Boolean);

    const mergedMap = new Map();
    [...settingsBrands, ...productBrands].forEach((item) => {
      const clean = normalizeBrandName(item);
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, clean);
      }
    });

    const brands = [...mergedMap.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return res.json(brands);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/brands', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const name = normalizeBrandName(req.body?.name);
  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }

  try {
    const settingsRes = await pool.query(
      'select commerce from tenant_settings where tenant_id = $1',
      [tenantId]
    );
    const commerce = settingsRes.rows[0]?.commerce || {};
    const currentBrands = Array.isArray(commerce.brands) ? commerce.brands : [];

    const existingMap = new Map();
    currentBrands.forEach((item) => {
      const clean = normalizeBrandName(item);
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!existingMap.has(key)) {
        existingMap.set(key, clean);
      }
    });
    existingMap.set(name.toLowerCase(), name);

    const nextBrands = [...existingMap.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    const nextCommerce = {
      ...commerce,
      brands: nextBrands,
    };

    await upsertTenantCommerce(tenantId, nextCommerce);
    return res.status(201).json({ ok: true, items: nextBrands });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/brands/:name', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const target = normalizeBrandName(decodeURIComponent(req.params.name || ''));
  if (!target) {
    return res.status(400).json({ error: 'name_required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const settingsRes = await client.query(
      'select commerce from tenant_settings where tenant_id = $1',
      [tenantId]
    );
    const commerce = settingsRes.rows[0]?.commerce || {};
    const currentBrands = Array.isArray(commerce.brands) ? commerce.brands : [];

    const targetKey = target.toLowerCase();
    const nextBrands = currentBrands
      .map((item) => normalizeBrandName(item))
      .filter((item) => item && item.toLowerCase() !== targetKey);

    const nextCommerce = {
      ...commerce,
      brands: nextBrands,
    };

    if (!settingsRes.rowCount) {
      await client.query(
        'insert into tenant_settings (tenant_id, branding, theme, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb)',
        [tenantId, {}, {}, nextCommerce]
      );
    } else {
      await client.query(
        [
          'update tenant_settings',
          'set commerce = $2::jsonb,',
          'updated_at = now()',
          'where tenant_id = $1',
        ].join(' '),
        [tenantId, nextCommerce]
      );
    }

    await client.query(
      [
        'update product_cache',
        'set brand = null, updated_at = now()',
        "where tenant_id = $1 and lower(trim(coalesce(brand, ''))) = $2",
      ].join(' '),
      [tenantId, targetKey]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, items: nextBrands });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Product Management
tenantRouter.get('/products', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const result = await pool.query(
      [
        [
          'select p.id, p.erp_id, p.external_id, p.source_system, p.sku, p.name, p.description, p.price, p.price_wholesale, p.stock, p.brand, p.data,',
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
    );
    return res.json({ items: result.rows });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.get('/price-lists', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    await ensurePricingSchema();
    await ensureDefaultPriceLists(tenantId);
    const result = await pool.query(
      [
        'select id, name, type, rules_json, created_at',
        'from price_lists',
        'where tenant_id = $1',
        'order by',
        "case type when 'retail' then 1 when 'wholesale' then 2 else 3 end,",
        'created_at asc',
      ].join(' '),
      [tenantId]
    );
    return res.json({ items: result.rows });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.get('/offers', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const onlyEnabled = String(req.query.enabled || '').toLowerCase() === 'true';
    const items = await getTenantOffers(tenantId, { onlyEnabled });
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/offers', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const name = String(req.body?.name || '').trim();
  const label = String(req.body?.label || 'Oferta').trim() || 'Oferta';
  const percent = Number(req.body?.percent || 0);
  const enabled = req.body?.enabled !== false;
  const usersParsed = parseUuidArray(req.body?.user_ids);
  const categoriesParsed = parseUuidArray(req.body?.category_ids);

  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return res.status(400).json({ error: 'invalid_percent' });
  }
  if (!usersParsed.ok) {
    return res.status(400).json({ error: 'invalid_user_ids' });
  }
  if (!categoriesParsed.ok) {
    return res.status(400).json({ error: 'invalid_category_ids' });
  }

  try {
    const result = await pool.query(
      [
        'insert into tenant_offers (tenant_id, name, label, percent, enabled, user_ids, category_ids)',
        'values ($1, $2, $3, $4, $5, $6::uuid[], $7::uuid[])',
        'returning id, tenant_id, name, label, percent, enabled, user_ids, category_ids, created_at, updated_at',
      ].join(' '),
      [tenantId, name, label, percent, enabled, usersParsed.items, categoriesParsed.items]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/offers/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const offerId = req.params.id;
  if (!isUuid(offerId)) {
    return res.status(400).json({ error: 'invalid_offer_id' });
  }

  const name = String(req.body?.name || '').trim();
  const label = String(req.body?.label || 'Oferta').trim() || 'Oferta';
  const percent = Number(req.body?.percent || 0);
  const enabled = req.body?.enabled !== false;
  const usersParsed = parseUuidArray(req.body?.user_ids);
  const categoriesParsed = parseUuidArray(req.body?.category_ids);

  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return res.status(400).json({ error: 'invalid_percent' });
  }
  if (!usersParsed.ok) {
    return res.status(400).json({ error: 'invalid_user_ids' });
  }
  if (!categoriesParsed.ok) {
    return res.status(400).json({ error: 'invalid_category_ids' });
  }

  try {
    const result = await pool.query(
      [
        'update tenant_offers',
        'set name = $3,',
        'label = $4,',
        'percent = $5,',
        'enabled = $6,',
        'user_ids = $7::uuid[],',
        'category_ids = $8::uuid[],',
        'updated_at = now()',
        'where tenant_id = $1 and id = $2',
        'returning id, tenant_id, name, label, percent, enabled, user_ids, category_ids, created_at, updated_at',
      ].join(' '),
      [
        tenantId,
        offerId,
        name,
        label,
        percent,
        enabled,
        usersParsed.items,
        categoriesParsed.items,
      ]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'offer_not_found' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/offers/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const offerId = req.params.id;
  if (!isUuid(offerId)) {
    return res.status(400).json({ error: 'invalid_offer_id' });
  }

  try {
    const result = await pool.query(
      'delete from tenant_offers where tenant_id = $1 and id = $2 returning id',
      [tenantId, offerId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'offer_not_found' });
    }
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.get('/users', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const offset = (page - 1) * limit;

  try {
    await ensurePricingSchema();
    const countRes = await pool.query(
      'select count(*) from user_tenants where tenant_id = $1',
      [tenantId]
    );
    const total = Number(countRes.rows[0]?.count || 0);

    const usersRes = await pool.query(
      [
        'select u.id, u.email, u.role as global_role, u.status as user_status,',
        'ut.role as role, ut.status as status, u.created_at,',
        'upl.price_list_id, pl.name as price_list_name, pl.type as price_list_type',
        'from user_tenants ut',
        'join users u on u.id = ut.user_id',
        'left join user_price_list upl on upl.tenant_id = ut.tenant_id and upl.user_id = ut.user_id',
        'left join price_lists pl on pl.id = upl.price_list_id',
        'where ut.tenant_id = $1',
        'order by u.created_at desc',
        'limit $2 offset $3',
      ].join(' '),
      [tenantId, limit, offset]
    );

    return res.json({ page, limit, total, items: usersRes.rows });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.patch('/users/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const userId = req.params.id;
  if (!isUuid(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  const role = req.body?.role != null ? String(req.body.role).trim().toLowerCase() : null;
  const status = req.body?.status != null ? String(req.body.status).trim().toLowerCase() : null;
  const validRoles = new Set(['retail', 'wholesale', 'tenant_admin']);
  const validStatuses = new Set(['active', 'pending', 'inactive']);

  if (role && !validRoles.has(role)) {
    return res.status(400).json({ error: 'invalid_role' });
  }
  if (status && !validStatuses.has(status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }
  if (!role && !status) {
    return res.status(400).json({ error: 'role_or_status_required' });
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
      return res.status(404).json({ error: 'user_not_found' });
    }

    const current = currentRes.rows[0];
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
    return res.json({ ok: true, user: userRes.rows[0] || null });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.delete('/users/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const userId = req.params.id;
  if (!isUuid(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }
  if (req.user?.id === userId) {
    return res.status(400).json({ error: 'cannot_delete_current_user' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetRes = await client.query(
      'select id, role from users where id = $1',
      [userId]
    );
    if (!targetRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'user_not_found' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role === 'master_admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'cannot_delete_master_admin' });
    }

    const membershipDeleteRes = await client.query(
      'delete from user_tenants where tenant_id = $1 and user_id = $2 returning user_id',
      [tenantId, userId]
    );
    if (!membershipDeleteRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'user_not_found' });
    }

    await client.query(
      'delete from user_price_list where tenant_id = $1 and user_id = $2',
      [tenantId, userId]
    );

    const membershipsRes = await client.query(
      'select count(*)::int as total from user_tenants where user_id = $1',
      [userId]
    );
    const remainingMemberships = Number(membershipsRes.rows[0]?.total || 0);

    let deletedUser = false;
    if (remainingMemberships === 0) {
      await client.query(
        "delete from users where id = $1 and role <> 'master_admin'",
        [userId]
      );
      deletedUser = true;
    }

    await client.query('COMMIT');
    return res.json({ ok: true, id: userId, deleted_user: deletedUser });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.put('/users/:id/price-list', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const userId = req.params.id;
  if (!isUuid(userId)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  const rawPriceListId = req.body?.price_list_id;
  const clearAssignment =
    rawPriceListId == null ||
    String(rawPriceListId).trim() === '' ||
    String(rawPriceListId).trim().toLowerCase() === 'auto';

  try {
    await ensurePricingSchema();
    const membershipRes = await pool.query(
      'select user_id from user_tenants where tenant_id = $1 and user_id = $2',
      [tenantId, userId]
    );
    if (!membershipRes.rowCount) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    if (clearAssignment) {
      await pool.query(
        'delete from user_price_list where tenant_id = $1 and user_id = $2',
        [tenantId, userId]
      );
      return res.json({ ok: true, price_list: null });
    }

    const priceListId = String(rawPriceListId).trim();
    if (!isUuid(priceListId)) {
      return res.status(400).json({ error: 'invalid_price_list_id' });
    }

    const priceListRes = await pool.query(
      'select id, name, type, rules_json from price_lists where tenant_id = $1 and id = $2',
      [tenantId, priceListId]
    );
    if (!priceListRes.rowCount) {
      return res.status(404).json({ error: 'price_list_not_found' });
    }

    await pool.query(
      [
        'insert into user_price_list (tenant_id, user_id, price_list_id, assigned_at)',
        'values ($1, $2, $3, now())',
        'on conflict (tenant_id, user_id)',
        'do update set price_list_id = excluded.price_list_id, assigned_at = now()',
      ].join(' '),
      [tenantId, userId, priceListId]
    );

    return res.json({ ok: true, price_list: priceListRes.rows[0] });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/products/:id/stock', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const productId = req.params.id;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  const { stock, delta } = req.body || {};
  const hasDelta = delta !== undefined && delta !== null && delta !== '';
  const hasStock = stock !== undefined && stock !== null && stock !== '';

  if (!hasDelta && !hasStock) {
    return res.status(400).json({ error: 'stock_required' });
  }

  try {
    if (hasDelta) {
      const deltaValue = Number(delta);
      if (Number.isNaN(deltaValue)) {
        return res.status(400).json({ error: 'invalid_delta' });
      }
      const result = await pool.query(
        'update product_cache set stock = greatest(stock + $1, 0), updated_at = now() where tenant_id = $2 and id = $3 returning stock',
        [deltaValue, tenantId, productId]
      );
      if (!result.rowCount) {
        return res.status(404).json({ error: 'product_not_found' });
      }
      return res.json({ ok: true, stock: result.rows[0].stock });
    }

    const stockValue = Number(stock);
    if (Number.isNaN(stockValue)) {
      return res.status(400).json({ error: 'invalid_stock' });
    }
    const result = await pool.query(
      'update product_cache set stock = greatest($1, 0), updated_at = now() where tenant_id = $2 and id = $3 returning stock',
      [stockValue, tenantId, productId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'product_not_found' });
    }
    return res.json({ ok: true, stock: result.rows[0].stock });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/products/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const productId = req.params.id;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      [
        'update product_cache',
        'set status = $3,',
        'is_visible_web = false,',
        'deleted_at = coalesce(deleted_at, now()),',
        'updated_at = now()',
        'where tenant_id = $1 and id = $2',
        'returning id',
      ].join(' '),
      [tenantId, productId, 'archived']
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'product_not_found' });
    }

    await client.query(
      [
        'insert into product_overrides (tenant_id, product_id, hidden)',
        'values ($1, $2, true)',
        'on conflict (tenant_id, product_id) do update set hidden = true',
      ].join(' '),
      [tenantId, productId]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, archived: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.put('/products/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const productId = req.params.id;
  if (!isUuid(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      [
        'select id, sku, name, description, price, price_wholesale, stock, brand, data, external_id, source_system, is_visible_web, admin_locked',
        'from product_cache',
        "where tenant_id = $1 and id = $2 and status = 'active'",
      ].join(' '),
      [tenantId, productId]
    );
    if (!existingRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'product_not_found' });
    }

    const existing = existingRes.rows[0];
    const existingData = existing.data && typeof existing.data === 'object' ? existing.data : {};

    const hasCategoryPayload =
      Object.prototype.hasOwnProperty.call(req.body || {}, 'category_id') ||
      Object.prototype.hasOwnProperty.call(req.body || {}, 'category_ids');
    const hasFeaturedPayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_featured');
    const hasVisiblePayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_visible_web');
    const hasAdminLockedPayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'admin_locked');

    const rawName = req.body?.name ?? existing.name;
    const name = String(rawName || '').trim();
    if (!name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'name_required' });
    }

    const sku = req.body?.sku !== undefined ? String(req.body.sku || '').trim() || null : existing.sku;
    const shortDescription = Object.prototype.hasOwnProperty.call(req.body || {}, 'short_description')
      ? String(req.body?.short_description || '').trim() || null
      : (String(existingData.short_description || existingData.shortDescription || '').trim() || null);
    const longDescriptionSource = Object.prototype.hasOwnProperty.call(req.body || {}, 'long_description')
      ? req.body?.long_description
      : (
          Object.prototype.hasOwnProperty.call(req.body || {}, 'description')
            ? req.body?.description
            : (existingData.long_description || existingData.longDescription || existing.description)
        );
    const description = String(longDescriptionSource || '').trim() || null;
    const brand = req.body?.brand !== undefined
      ? normalizeBrandName(req.body.brand) || null
      : existing.brand;

    const price = req.body?.price !== undefined ? Number(req.body.price) : Number(existing.price || 0);
    const priceWholesale = req.body?.price_wholesale !== undefined
      ? Number(req.body.price_wholesale)
      : Number(existing.price_wholesale || 0);
    const stock = req.body?.stock !== undefined ? Number(req.body.stock) : Number(existing.stock || 0);

    if (!Number.isFinite(price)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_price' });
    }
    if (!Number.isFinite(priceWholesale)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_price_wholesale' });
    }
    if (!Number.isFinite(stock)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'invalid_stock' });
    }

    const rawImages = Object.prototype.hasOwnProperty.call(req.body || {}, 'images')
      ? req.body?.images
      : existingData.images;
    let imageData = [];
    if (Array.isArray(rawImages) && rawImages.length > 0) {
      imageData = rawImages
        .map((img, index) => {
          if (typeof img === 'string') {
            return { url: img, alt: name, primary: index === 0 };
          }
          if (!img || typeof img !== 'object') return null;
          const url = img.url || img.src || '';
          if (!url) return null;
          return {
            url,
            alt: img.alt || name,
            primary: img.primary === true || index === 0,
          };
        })
        .filter(Boolean);
    } else if (typeof rawImages === 'string' && rawImages.trim()) {
      imageData = [{ url: rawImages.trim(), alt: name, primary: true }];
    }

    const features = Object.prototype.hasOwnProperty.call(req.body || {}, 'features')
      ? (Array.isArray(req.body?.features) ? req.body.features : [])
      : (Array.isArray(existingData.features) ? existingData.features : []);
    const specifications = Object.prototype.hasOwnProperty.call(req.body || {}, 'specifications')
      ? (req.body?.specifications && typeof req.body.specifications === 'object' ? req.body.specifications : {})
      : (existingData.specifications && typeof existingData.specifications === 'object' ? existingData.specifications : {});
    const showSpecifications = Object.prototype.hasOwnProperty.call(req.body || {}, 'show_specifications')
      ? parseBooleanInput(req.body?.show_specifications, existingData.show_specifications !== false)
      : (existingData.show_specifications !== false);
    const collection = Object.prototype.hasOwnProperty.call(req.body || {}, 'collection')
      ? (req.body?.collection || null)
      : (existingData.collection || null);
    const variantGroup = Object.prototype.hasOwnProperty.call(req.body || {}, 'variant_group')
      ? String(req.body?.variant_group || '').trim() || null
      : (String(existingData.variant_group || existingData.variantGroup || '').trim() || null);
    const variantGroupLabel = Object.prototype.hasOwnProperty.call(req.body || {}, 'variant_group_label')
      ? String(req.body?.variant_group_label || '').trim() || null
      : (String(existingData.variant_group_label || existingData.variantGroupLabel || '').trim() || null);
    const variantLabel = Object.prototype.hasOwnProperty.call(req.body || {}, 'variant_label')
      ? String(req.body?.variant_label || '').trim() || null
      : (String(existingData.variant_label || existingData.variantLabel || existingData.variant || '').trim() || null);
    const isVariantRoot = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_variant_root')
      ? parseBooleanInput(req.body?.is_variant_root, false)
      : (existingData.is_variant_root === true || existingData.isVariantRoot === true);
    const deliveryTime = Object.prototype.hasOwnProperty.call(req.body || {}, 'delivery_time')
      ? (req.body?.delivery_time || null)
      : (existingData.delivery_time || null);
    const shippingDetails = Object.prototype.hasOwnProperty.call(req.body || {}, 'shipping_details')
      ? (req.body?.shipping_details || null)
      : (existingData.shipping_details || null);
    const warranty = Object.prototype.hasOwnProperty.call(req.body || {}, 'warranty')
      ? (req.body?.warranty || null)
      : (existingData.warranty || null);
    const isVisibleWeb = hasVisiblePayload
      ? parseBooleanInput(req.body?.is_visible_web, existing.is_visible_web !== false)
      : existing.is_visible_web !== false;
    const adminLocked = hasAdminLockedPayload
      ? parseBooleanInput(req.body?.admin_locked, existing.admin_locked === true)
      : existing.admin_locked === true;
    const externalId = Object.prototype.hasOwnProperty.call(req.body || {}, 'external_id')
      ? String(req.body?.external_id || '').trim() || null
      : (existing.external_id || null);
    const sourceSystem = Object.prototype.hasOwnProperty.call(req.body || {}, 'source_system')
      ? String(req.body?.source_system || '').trim() || null
      : (existing.source_system || null);

    const productData = {
      ...existingData,
      images: imageData,
      features,
      short_description: shortDescription,
      long_description: description,
      specifications,
      show_specifications: showSpecifications,
      collection,
      variant_group: variantGroup,
      variant_group_label: variantGroupLabel,
      variant_label: variantLabel,
      is_variant_root: isVariantRoot,
      delivery_time: deliveryTime,
      shipping_details: shippingDetails,
      warranty,
    };

    await client.query(
      [
        'update product_cache',
        'set sku = $3, name = $4, description = $5, price = $6, price_wholesale = $7, stock = greatest($8, 0), brand = $9, data = $10::jsonb,',
        'external_id = $11, source_system = $12, is_visible_web = $13, admin_locked = $14, updated_at = now()',
        'where tenant_id = $1 and id = $2',
      ].join(' '),
      [
        tenantId,
        productId,
        sku,
        name,
        description,
        price,
        priceWholesale,
        stock,
        brand,
        JSON.stringify(productData),
        externalId,
        sourceSystem,
        isVisibleWeb,
        adminLocked,
      ]
    );

    if (hasCategoryPayload) {
      const mergedCategoryIds = [];
      if (req.body?.category_id) mergedCategoryIds.push(req.body.category_id);
      if (Array.isArray(req.body?.category_ids)) mergedCategoryIds.push(...req.body.category_ids);

      const parsedCategories = parseUuidArray(mergedCategoryIds);
      if (!parsedCategories.ok) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid_category_ids' });
      }
      const selectedCategoryIds = parsedCategories.items;

      if (selectedCategoryIds.length) {
        const validCategoriesRes = await client.query(
          'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
          [tenantId, selectedCategoryIds]
        );
        if (validCategoriesRes.rowCount !== selectedCategoryIds.length) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'invalid_category_ids' });
        }
      }

      await client.query('delete from product_categories where product_id = $1', [productId]);
      if (selectedCategoryIds.length) {
        await client.query(
          [
            'insert into product_categories (product_id, category_id)',
            'select $1, unnest($2::uuid[])',
            'on conflict do nothing',
          ].join(' '),
          [productId, selectedCategoryIds]
        );
      }
    }

    if (hasFeaturedPayload) {
      await client.query(
        'insert into product_overrides (tenant_id, product_id, featured) values ($1, $2, $3) on conflict (tenant_id, product_id) do update set featured = $3',
        [tenantId, productId, !!req.body?.is_featured]
      );
    }

    if (hasVisiblePayload) {
      await client.query(
        [
          'insert into product_overrides (tenant_id, product_id, hidden)',
          'values ($1, $2, $3)',
          'on conflict (tenant_id, product_id) do update set hidden = $3',
        ].join(' '),
        [tenantId, productId, !isVisibleWeb]
      );
    }

    await client.query('COMMIT');
    const item = await fetchTenantProductRow(pool, tenantId, productId);
    return res.json({ ok: true, id: productId, item });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.post('/products', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const {
    sku,
    name,
    price,
    price_wholesale,
    stock,
    brand,
    description,
    short_description,
    long_description,
    images,
    is_featured,
    category_id,
    category_ids,
    features,
    specifications,
    show_specifications,
    collection,
    variant_group,
    variant_group_label,
    variant_label,
    is_variant_root,
    delivery_time,
    shipping_details,
    warranty,
    external_id,
    source_system,
    is_visible_web,
    admin_locked,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }

  const mergedCategoryIds = [];
  if (category_id) mergedCategoryIds.push(category_id);
  if (Array.isArray(category_ids)) {
    mergedCategoryIds.push(...category_ids);
  }
  const parsedCategories = parseUuidArray(mergedCategoryIds);
  if (!parsedCategories.ok) {
    return res.status(400).json({ error: 'invalid_category_ids' });
  }
  const selectedCategoryIds = parsedCategories.items;

  // Process images array
  let imageData = [];
  if (Array.isArray(images) && images.length > 0) {
    imageData = images.map((img, index) => ({
      url: img.url || img,
      alt: img.alt || name,
      primary: img.primary === true || index === 0 // First image is primary by default
    }));
  } else if (typeof images === 'string') {
    // Backward compatibility: single URL string
    imageData = [{ url: images, alt: name, primary: true }];
  }

  const shortDescription = String(short_description || '').trim() || null;
  const normalizedLongDescription = String((long_description ?? description) || '').trim() || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const externalId = String(external_id || '').trim() || null;
    const sourceSystem = String(source_system || '').trim() || null;
    const isVisibleWeb = parseBooleanInput(is_visible_web, true);
    const adminLocked = parseBooleanInput(admin_locked, false);

    const productData = {
      images: imageData,
      features: features || [],
      short_description: shortDescription,
      long_description: normalizedLongDescription,
      specifications: specifications || {},
      show_specifications: parseBooleanInput(show_specifications, true),
      collection: collection || null,
      variant_group: String(variant_group || '').trim() || null,
      variant_group_label: String(variant_group_label || '').trim() || null,
      variant_label: String(variant_label || '').trim() || null,
      is_variant_root: parseBooleanInput(is_variant_root, false),
      delivery_time: delivery_time || null,
      shipping_details: shipping_details || null,
      warranty: warranty || null
    };

    const result = await client.query(
      [
        'insert into product_cache (tenant_id, erp_id, external_id, source_system, sku, name, price, price_wholesale, stock, brand, description, data, is_visible_web, admin_locked)',
        'values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14)',
        'returning id',
      ].join(' '),
      [
        tenantId,
        externalId,
        externalId,
        sourceSystem,
        sku || null,
        name,
        price || 0,
        price_wholesale || price || 0,
        stock || 0,
        brand || null,
        normalizedLongDescription,
        JSON.stringify(productData),
        isVisibleWeb,
        adminLocked,
      ]
    );

    const productId = result.rows[0].id;

    // Associate product with all selected categories.
    if (selectedCategoryIds.length) {
      const categoryRes = await client.query(
        'select id from categories where tenant_id = $1 and id = any($2::uuid[])',
        [tenantId, selectedCategoryIds]
      );
      if (categoryRes.rowCount !== selectedCategoryIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'invalid_category_ids' });
      }

      await client.query(
        [
          'insert into product_categories (product_id, category_id)',
          'select $1, unnest($2::uuid[])',
          'on conflict do nothing',
        ].join(' '),
        [productId, selectedCategoryIds]
      );
    }

    if (is_featured) {
      await client.query(
        'insert into product_overrides (tenant_id, product_id, featured) values ($1, $2, true) on conflict (tenant_id, product_id) do update set featured = true',
        [tenantId, productId]
      );
    }

    await client.query(
      [
        'insert into product_overrides (tenant_id, product_id, hidden)',
        'values ($1, $2, $3)',
        'on conflict (tenant_id, product_id) do update set hidden = $3',
      ].join(' '),
      [tenantId, productId, !isVisibleWeb]
    );

    if (externalId && sourceSystem) {
      await client.query(
        [
          'insert into product_sync_metadata (tenant_id, product_id, external_id, source_system, last_sync_at, raw_payload, updated_at)',
          'values ($1, $2, $3, $4, $5, $6::jsonb, now())',
          'on conflict (tenant_id, external_id)',
          'do update set',
          'product_id = excluded.product_id,',
          'source_system = excluded.source_system,',
          'last_sync_at = excluded.last_sync_at,',
          'raw_payload = excluded.raw_payload,',
          'updated_at = now()',
        ].join(' '),
        [tenantId, productId, externalId, sourceSystem, new Date(), JSON.stringify({ source: 'tenant_admin_manual_create' })]
      );
    }

    await client.query('COMMIT');
    const item = await fetchTenantProductRow(pool, tenantId, productId);
    return res.json({ id: productId, ok: true, item });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Image Upload Endpoint
tenantRouter.post('/products/upload-image', upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'no_file_uploaded' });
    }

    // Generate public URL for the uploaded image
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/products/${req.file.filename}`;

    return res.json({ url: imageUrl, filename: req.file.filename });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/products/:id/featured', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const { featured } = req.body;
  const productId = req.params.id;

  // Validate UUID to prevent DB crash
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Note: the above regex was missing a block for the 4-char part, but let's use a better one or the same as public.js
  const betterUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!betterUuidRegex.test(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  try {
    await pool.query(
      'insert into product_overrides (tenant_id, product_id, featured) values ($1, $2, $3) on conflict (tenant_id, product_id) do update set featured = $3',
      [tenantId, productId, !!featured]
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/products/featured/clear', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    await pool.query(
      'update product_overrides set featured = false where tenant_id = $1 and featured = true',
      [tenantId]
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
