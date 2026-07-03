import express from 'express';
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
import { resolveHostCandidates } from './middleware/tenant.js';
import { pool } from './db.js';
import { buildGtmSnippets, normalizeSeoSettings, resolveCanonicalUrl } from '../../web/src/utils/seo.js';

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

  const hostCandidates = resolveHostCandidates(req);
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
  return result.rows[0] || null;
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
  app.use(express.static(webDistPath));

  app.get('*', async (req, res, next) => {
    if (!req.accepts('html')) {
      return next();
    }

    const blockedPrefixes = ['/auth', '/api', '/public', '/checkout', '/webhooks', '/tenant', '/uploads'];
    if (blockedPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    const isAdminSpaRoute =
      req.path === '/admin' ||
      req.path.startsWith('/admin/');

    if (isAdminSpaRoute) {
      return res.sendFile(webIndexPath);
    }

    const tenant = await resolvePublicTenant(req);
    if (!tenant) {
      return res.status(404).json({ error: 'tenant_not_found' });
    }
    req.tenant = tenant;

    const html = fs.readFileSync(webIndexPath, 'utf8');
    const settingsRes = await pool.query(
      'select branding, theme, seo, commerce from tenant_settings where tenant_id = $1',
      [req.tenant.id]
    );
    const rawSettings = settingsRes.rows[0] || {};
    const seo = normalizeSeoSettings(rawSettings.seo || {});
    const brandName = String(rawSettings.branding?.name || req.tenant?.name || 'Vase Business').trim();
    const title = seo.title || brandName;
    const description = seo.description || '';
    const canonicalUrl = resolveCanonicalUrl({
      pathname: req.path || '/',
      canonicalPath: seo.canonicalPath,
    });
    const robots = seo.indexable ? 'index,follow' : 'noindex,nofollow';
    const ogTitle = seo.ogTitle || title;
    const ogDescription = seo.ogDescription || description;
    const { head, body } = buildGtmSnippets(seo.tracking?.enabled ? seo.tracking.googleTagManagerContainerId : '');
    const taggedHead = head ? head.replace('<script>', '<script id="vase-gtm-script">') : '';
    const taggedBody = body ? body.replace('<noscript>', '<noscript id="vase-gtm-noscript">') : '';

    const titleTag = title ? `<title>${escapeHtml(title)}</title>` : '';
    const headTags = [
      description ? `<meta name="description" content="${escapeHtml(description)}" />` : '',
      `<meta name="robots" content="${escapeHtml(robots)}" />`,
      canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : '',
      ogTitle ? `<meta property="og:title" content="${escapeHtml(ogTitle)}" />` : '',
      ogDescription ? `<meta property="og:description" content="${escapeHtml(ogDescription)}" />` : '',
      taggedHead || '',
    ].filter(Boolean).join('\n');

    const bodyTags = taggedBody || '';
    const renderedHtml = html
      .replace(/<title>.*?<\/title>/i, titleTag || '')
      .replace('<head>', `<head>\n${headTags}\n`)
      .replace('<body>', `<body>\n${bodyTags}\n`);

    return res.send(renderedHtml);
  });
} else {
  console.warn(`Frontend build not found at ${webIndexPath}.`);
}

export default app;
