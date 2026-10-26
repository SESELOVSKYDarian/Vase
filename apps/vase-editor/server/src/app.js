import express from 'express';
import compression from 'compression';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { publicRouter } from './routes/public.js';
import { tenantRouter } from './routes/tenant.js';
import { adminRouter } from './routes/admin.js';
import { checkoutRouter } from './routes/checkout.js';
import { authRouter, getMeHandler } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { settingsRouter, settingsAdminRouter } from './routes/settings.js';
import { ordersRouter, adminOrdersRouter } from './routes/orders.js';
import { webhooksRouter } from './routes/webhooks.js';
import { integrationsRouter } from './routes/integrations.js';
import { uploadsRouter } from './routes/uploads.js';
import { authenticate, optionalAuthenticate, requireRole } from './middleware/auth.js';
import { pool } from './db.js';
import { buildGtmSnippets, normalizeSeoSettings, resolveCanonicalUrl } from './services/seo.js';
import { normalizeDomainInput } from './services/tenantDomains.js';
import { ensureTenantSettingsSeoColumn, queryTenantSettingsWithSeo } from './services/tenantSettings.js';
import {
  applyTenantSeoDefaults,
  buildFaviconLinks,
  buildRobotsTxt,
  buildSitemapXml,
  buildStructuredData,
  cleanDescription,
  isAssetLikePath,
  isPiquimTenant,
  PIQUIM_SEO_DEFAULTS,
  renderJsonLd,
  renderLinkTags,
  resolveRequestOrigin,
  toAbsoluteUrl,
} from './services/tenantSeo.js';

const app = express();
app.set('trust proxy', true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const webDistPath = path.join(projectRoot, 'web', 'dist');
const webIndexPath = path.join(webDistPath, 'index.html');
const hasWebBuild = fs.existsSync(webIndexPath);

const corsOrigin = process.env.CORS_ORIGIN
  ? String(process.env.CORS_ORIGIN)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : true;
app.use(cors({
  origin: (origin, callback) => {
    if (corsOrigin === true || !origin) {
      callback(null, true);
      return;
    }
    const allowed = corsOrigin.some((entry) => {
      if (entry === origin) return true;
      if (entry.includes('*')) {
        const pattern = new RegExp(`^${entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
        return pattern.test(origin);
      }
      return false;
    });
    callback(null, allowed);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Storefront-Host', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const ADMIN_ROLES = ['tenant_admin', 'master_admin'];
const disableAuth = process.env.DISABLE_AUTH === 'true';
const platformAdminApiBase = '/api/platform/admin';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

async function resolvePublicTenant(req) {
  const headerTenant = String(req.get('x-tenant-id') || '').trim();
  if (UUID_REGEX.test(headerTenant)) {
    const result = await pool.query(
      'select id, name, external_tenant_slug from tenants where id = $1 and status = $2',
      [headerTenant, 'active']
    );
    if (result.rows[0]) {
      return result.rows[0];
    }
  }

  const rawHost = firstHeaderValue(
    req.get('x-storefront-host') ||
    req.get('x-original-host') ||
    req.get('x-forwarded-host') ||
    req.hostname ||
    req.get('host') ||
    ''
  );
  const normalizedHost = normalizeDomainInput(rawHost);
  const hostCandidates = normalizedHost
    ? (normalizedHost.startsWith('www.') ? [normalizedHost, normalizedHost.slice(4)] : [normalizedHost])
    : [];
  if (!hostCandidates.length) {
    return null;
  }

  const result = await pool.query(
    [
      'select t.id, t.name, t.external_tenant_slug',
      'from tenant_domains d',
      'join tenants t on t.id = d.tenant_id',
      'where d.domain = any($1::text[]) and t.status = $2',
      'order by array_position($1::text[], d.domain) asc',
      'limit 1',
    ].join(' '),
    [hostCandidates, 'active']
  );
  if (result.rows[0]) {
    return result.rows[0];
  }

  const hostSlug = normalizedHost.split('.')[0] || '';
  if (!hostSlug) {
    return null;
  }

  const slugResult = await pool.query(
    [
      'select id, name, external_tenant_slug',
      'from tenants',
      'where status = $2 and lower(coalesce(external_tenant_slug, \'\')) = $1',
      'limit 1',
    ].join(' '),
    [hostSlug, 'active']
  );
  return slugResult.rows[0] || null;
}

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.get('/api/me', authenticate, getMeHandler);
app.use('/api/me', authenticate, meRouter);
app.use('/api/uploads', authenticate, uploadsRouter);
app.use('/api/settings', optionalAuthenticate, settingsRouter);
app.use('/api/orders', optionalAuthenticate, ordersRouter);
app.use('/public', optionalAuthenticate, publicRouter);
app.use('/checkout', optionalAuthenticate, checkoutRouter);
app.use('/webhooks', webhooksRouter);
app.use('/api/v1/integrations', integrationsRouter);

if (disableAuth) {
  console.warn('AUTH DISABLED: /tenant and /api/platform/admin routes are open without token.');
  app.use('/api/admin/settings', settingsAdminRouter);
  app.use('/api/admin/orders', adminOrdersRouter);
  app.use('/tenant', tenantRouter);
  app.use(platformAdminApiBase, adminRouter);
} else {
  app.use('/api/admin/settings', authenticate, requireRole(ADMIN_ROLES), settingsAdminRouter);
  app.use('/api/admin/orders', authenticate, requireRole(ADMIN_ROLES), adminOrdersRouter);
  app.use('/tenant', authenticate, requireRole(ADMIN_ROLES), tenantRouter);
  app.use(platformAdminApiBase, authenticate, adminRouter);
}

if (hasWebBuild) {
  // Los archivos de /assets llevan hash en el nombre: se pueden cachear para siempre.
  app.use('/assets', express.static(path.join(webDistPath, 'assets'), {
    immutable: true,
    maxAge: '1y',
    fallthrough: false,
  }));
  // index: false para que "/" pase por el render con SEO del tenant.
  app.use(express.static(webDistPath, { index: false, maxAge: '1h' }));

  let cachedIndexHtml = null;
  const readIndexHtml = () => {
    if (cachedIndexHtml === null) cachedIndexHtml = fs.readFileSync(webIndexPath, 'utf8');
    return cachedIndexHtml;
  };

  // robots.txt, sitemap.xml y favicon.ico: antes devolvian la pagina HTML de la tienda (200), por eso
  // Google no leia el favicon ni el sitemap.
  const loadTenantSeoContext = async (req) => {
    const tenant = await resolvePublicTenant(req);
    if (!tenant) return null;
    await ensureTenantSettingsSeoColumn();
    const settingsRes = await queryTenantSettingsWithSeo(tenant.id);
    const rawSettings = settingsRes.rows[0] || {};
    const branding = rawSettings.branding || {};
    const seo = applyTenantSeoDefaults(rawSettings.seo || {}, tenant, branding);
    return { tenant, branding, seo, indexable: seo.indexable !== false };
  };

  app.get('/robots.txt', async (req, res, next) => {
    try {
      const context = await loadTenantSeoContext(req);
      res.type('text/plain').set('Cache-Control', 'public, max-age=3600');
      return res.send(buildRobotsTxt({ origin: resolveRequestOrigin(req), indexable: context ? context.indexable : true }));
    } catch (err) {
      return next(err);
    }
  });

  const sitemapCache = new Map();
  app.get('/sitemap.xml', async (req, res, next) => {
    try {
      const context = await loadTenantSeoContext(req);
      const origin = resolveRequestOrigin(req);
      if (!context || !origin || !context.indexable) return res.sendStatus(404);

      const cached = sitemapCache.get(context.tenant.id);
      let xml = cached && cached.expires > Date.now() ? cached.xml : null;
      if (!xml) {
        const products = await pool.query(
          [
            'select p.id, p.updated_at',
            'from product_cache p',
            'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
            "where p.tenant_id = $1 and p.status = 'active' and p.deleted_at is null",
            'and coalesce(p.is_active_source, true) = true and coalesce(p.is_visible_web, true) = true',
            'and (o.hidden is null or o.hidden = false)',
            'order by p.name asc limit 5000',
          ].join(' '),
          [context.tenant.id]
        );
        xml = buildSitemapXml({
          origin,
          entries: [
            { path: '/', changefreq: 'weekly', priority: '1.0' },
            { path: '/catalog', changefreq: 'daily', priority: '0.9' },
            { path: '/about', changefreq: 'monthly', priority: '0.5' },
            ...products.rows.map((row) => ({ path: `/product/${row.id}`, lastmod: row.updated_at, changefreq: 'weekly', priority: '0.7' })),
          ],
        });
        sitemapCache.set(context.tenant.id, { xml, expires: Date.now() + 10 * 60_000 });
      }
      return res.type('application/xml').set('Cache-Control', 'public, max-age=600').send(xml);
    } catch (err) {
      return next(err);
    }
  });

  app.get('/favicon.ico', async (req, res, next) => {
    try {
      const context = await loadTenantSeoContext(req);
      if (!context) return res.sendStatus(404);

      const configured = String(context.branding?.favicon_url || '').trim();
      if (/^data:image\/(png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon);base64,/i.test(configured)) {
        const comma = configured.indexOf(',');
        const mime = configured.slice(5, configured.indexOf(';'));
        res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
        return res.send(Buffer.from(configured.slice(comma + 1), 'base64'));
      }
      if (/^https?:\/\//i.test(configured) || (configured.startsWith('/') && !configured.startsWith('//'))) {
        return res.redirect(302, configured);
      }
      if (isPiquimTenant(context.tenant, context.branding)) return res.redirect(302, '/piquim/favicon.ico');
      return res.sendStatus(404);
    } catch (err) {
      return next(err);
    }
  });

  async function resolveProductSeo(req) {
    const match = /^\/product\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i.exec(req.path);
    if (!match) return null;
    const result = await pool.query(
      [
        'select p.name, p.description, p.brand',
        'from product_cache p',
        'left join product_overrides o on o.product_id = p.id and o.tenant_id = p.tenant_id',
        "where p.tenant_id = $1 and p.id = $2 and p.status = 'active' and p.deleted_at is null",
        'and coalesce(p.is_active_source, true) = true and coalesce(p.is_visible_web, true) = true',
        'and (o.hidden is null or o.hidden = false)',
      ].join(' '),
      [req.tenant.id, match[1]]
    );
    const row = result.rows[0];
    if (!row) return null;
    const name = String(row.name || '').trim();
    return {
      title: name,
      description: cleanDescription(row.description && row.description !== name ? row.description : `${name}${row.brand ? ` de ${row.brand}` : ''}. Consultá precios y disponibilidad.`),
    };
  }

  app.get('*', async (req, res, next) => {
    if (!req.accepts('html')) {
      return next();
    }

    const blockedPrefixes = ['/auth', '/api', '/public', '/checkout', '/webhooks', '/tenant', '/uploads'];
    if (blockedPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    // Un archivo que no existe (imagen, .xml, .js...) debe dar 404, no la pagina de la tienda.
    if (isAssetLikePath(req.path)) {
      return res.sendStatus(404);
    }

    const isAdminSpaRoute =
      req.path === '/admin' ||
      req.path.startsWith('/admin/');

    res.set('Cache-Control', 'no-cache');

    if (isAdminSpaRoute) {
      return res.sendFile(webIndexPath);
    }

    try {
      const tenant = await resolvePublicTenant(req);
      if (!tenant) {
        // Hosts sin tenant (ej. business.vase.ar) siguen recibiendo la SPA en "/".
        if (req.path === '/') return res.sendFile(webIndexPath);
        return res.status(404).json({ error: 'tenant_not_found' });
      }
      req.tenant = tenant;

      const html = readIndexHtml();
      await ensureTenantSettingsSeoColumn();
      const settingsRes = await queryTenantSettingsWithSeo(req.tenant.id);
      const rawSettings = settingsRes.rows[0] || {};
      const branding = rawSettings.branding || {};
      const rawSeo = applyTenantSeoDefaults(rawSettings.seo || {}, req.tenant, branding);
      const seo = normalizeSeoSettings(rawSeo);
      const brandName = String(branding?.name || req.tenant?.name || 'Vase Business').trim();
      const origin = resolveRequestOrigin(req);
      const product = await resolveProductSeo(req);
      const isHome = (req.path || '/') === '/';

      const title = product?.title ? `${product.title} | ${brandName}` : (seo.title || brandName);
      const description = product?.description || seo.description || '';
      const canonicalPath = isHome ? seo.canonicalPath : '';
      const canonicalUrl = toAbsoluteUrl(
        origin,
        resolveCanonicalUrl({ pathname: req.path || '/', canonicalPath })
      );
      const robots = seo.indexable ? 'index,follow' : 'noindex,nofollow';
      const ogTitle = product?.title ? title : (seo.ogTitle || title);
      const ogDescription = product?.description || seo.ogDescription || description;
      const isPiquim = isPiquimTenant(req.tenant, branding);
      const ogImage = isPiquim ? toAbsoluteUrl(origin, PIQUIM_SEO_DEFAULTS.ogImage) : '';
      const faviconLinks = buildFaviconLinks({ branding, seo: rawSeo, tenant: req.tenant });
      const structuredData = isHome ? buildStructuredData({ tenant: req.tenant, branding, seo, origin }) : null;
      const { head, body } = buildGtmSnippets(seo.tracking?.enabled ? seo.tracking.googleTagManagerContainerId : '');
      const taggedHead = head ? head.replace('<script>', '<script id="vase-gtm-script">') : '';
      const taggedBody = body ? body.replace('<noscript>', '<noscript id="vase-gtm-noscript">') : '';

      const titleTag = title ? `<title>${escapeHtml(title)}</title>` : '';
      const meta = (attr, name, content) => (content ? `<meta ${attr}="${name}" content="${escapeHtml(content)}" />` : '');
      const headTags = [
        meta('name', 'description', description),
        `<meta name="robots" content="${escapeHtml(robots)}" />`,
        canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : '',
        meta('property', 'og:type', 'website'),
        meta('property', 'og:site_name', brandName),
        meta('property', 'og:locale', 'es_AR'),
        meta('property', 'og:url', canonicalUrl),
        meta('property', 'og:title', ogTitle),
        meta('property', 'og:description', ogDescription),
        meta('property', 'og:image', ogImage),
        meta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary'),
        meta('name', 'twitter:title', ogTitle),
        meta('name', 'twitter:description', ogDescription),
        meta('name', 'twitter:image', ogImage),
        isPiquim ? meta('name', 'theme-color', PIQUIM_SEO_DEFAULTS.themeColor) : '',
        structuredData ? renderJsonLd(structuredData) : '',
        taggedHead || '',
      ].filter(Boolean).join('\n');

      const bodyTags = taggedBody || '';
      const iconTags = faviconLinks.length ? renderLinkTags(faviconLinks, origin) : '';
      const injectedHead = [iconTags, headTags].filter(Boolean).join('\n');
      let renderedHtml = html
        .replace(/<title>.*?<\/title>/i, () => titleTag)
        .replace('<body>', () => `<body>\n${bodyTags}\n`);
      if (iconTags) renderedHtml = renderedHtml.replace(/<link rel="icon"[^>]*>\s*/i, '');
      // Despues de <meta charset>, que debe estar en los primeros 1024 bytes del documento.
      renderedHtml = /<meta charset[^>]*>/i.test(renderedHtml)
        ? renderedHtml.replace(/<meta charset[^>]*>/i, (charset) => `${charset}\n${injectedHead}`)
        : renderedHtml.replace('<head>', () => `<head>\n${injectedHead}\n`);

      return res.send(renderedHtml);
    } catch (err) {
      return next(err);
    }
  });
} else {
  console.warn(`Frontend build not found at ${webIndexPath}.`);
}

export default app;
