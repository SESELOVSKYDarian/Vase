import express from 'express';
import cors from 'cors';

import { publicRouter } from './routes/public.js';
import { tenantRouter } from './routes/tenant.js';
import { adminRouter } from './routes/admin.js';
import { checkoutRouter } from './routes/checkout.js';
import { authRouter, getMeHandler } from './routes/auth.js';
import { settingsRouter, settingsAdminRouter } from './routes/settings.js';
import { ordersRouter, adminOrdersRouter } from './routes/orders.js';
import { webhooksRouter } from './routes/webhooks.js';
import { integrationsRouter } from './routes/integrations.js';
import { authenticate, optionalAuthenticate, requireRole } from './middleware/auth.js';

const app = express();
app.set('trust proxy', true);

const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN : true;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const ADMIN_ROLES = ['tenant_admin', 'master_admin'];
const disableAuth = process.env.DISABLE_AUTH === 'true';

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.get('/api/me', authenticate, getMeHandler);
app.use('/api/settings', optionalAuthenticate, settingsRouter);
app.use('/api/orders', optionalAuthenticate, ordersRouter);
app.use('/public', optionalAuthenticate, publicRouter);
app.use('/checkout', optionalAuthenticate, checkoutRouter);
app.use('/webhooks', webhooksRouter);
app.use('/api/v1/integrations', integrationsRouter);

if (disableAuth) {
  console.warn('AUTH DISABLED: /tenant and /admin routes are open without token.');
  app.use('/api/admin/settings', settingsAdminRouter);
  app.use('/api/admin/orders', adminOrdersRouter);
  app.use('/tenant', tenantRouter);
  app.use('/admin', adminRouter);
} else {
  app.use('/api/admin/settings', authenticate, requireRole(ADMIN_ROLES), settingsAdminRouter);
  app.use('/api/admin/orders', authenticate, requireRole(ADMIN_ROLES), adminOrdersRouter);
  app.use('/tenant', authenticate, requireRole(ADMIN_ROLES), tenantRouter);
  app.use('/admin', authenticate, adminRouter);
}

export default app;
