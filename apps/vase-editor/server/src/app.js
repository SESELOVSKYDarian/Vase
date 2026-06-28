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

  app.get('*', (req, res, next) => {
    if (!req.accepts('html')) {
      return next();
    }

    const blockedPrefixes = ['/auth', '/api', '/public', '/checkout', '/webhooks', '/tenant', '/uploads'];
    if (blockedPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    return res.sendFile(webIndexPath);
  });
} else {
  console.warn(`Frontend build not found at ${webIndexPath}.`);
}

export default app;
