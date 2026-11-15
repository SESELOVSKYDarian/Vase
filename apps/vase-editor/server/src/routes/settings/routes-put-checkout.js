// Rutas de settings.js: use-middleware, use-middleware, get-checkout, get-email, put-email, post-email-verify, post-email-test, put-checkout.
import { pool } from '../../db.js';
import { resolveTenant } from '../../middleware/tenant.js';
import { sendSmtpEmail, verifySmtpConnection } from '../../services/mailer.js';
import { EMAIL_RE, UUID_REGEX_SETTINGS, emailSettings, emailUpdates, normalizeCheckoutSettings, sanitizeCheckoutPayload, settingsAdminRouter, settingsRouter } from './sanitize-checkout-payload.js';

settingsRouter.use(resolveTenant);
settingsAdminRouter.use(resolveTenant);


settingsRouter.get('/checkout', async (req, res, next) => {
  try {
    const result = await pool.query(
      'select commerce from tenant_settings where tenant_id = $1',
      [req.tenant.id]
    );
    const commerce = (result.rows[0] && result.rows[0].commerce) || {};
    return res.json(normalizeCheckoutSettings(commerce));
  } catch (err) {
    return next(err);
  }
});


settingsAdminRouter.get('/email', async (req, res, next) => {
  try { const result = await pool.query('select commerce from tenant_settings where tenant_id = $1', [req.tenant.id]); return res.json(emailSettings(result.rows[0]?.commerce || {})); }
  catch (err) { return next(err); }
});

settingsAdminRouter.put('/email', async (req, res, next) => {
  try {
    const result = await pool.query('select commerce from tenant_settings where tenant_id = $1', [req.tenant.id]);
    const current = result.rows[0]?.commerce || {};
    const updates = emailUpdates(req.body || {}, current);
    if (!updates) return res.status(400).json({ code: 'smtp_configuration_incomplete', message: 'Completá los datos SMTP requeridos antes de guardar.' });
    const saved = await pool.query("insert into tenant_settings (tenant_id, commerce, updated_at) values ($1, $2::jsonb, now()) on conflict (tenant_id) do update set commerce = tenant_settings.commerce || excluded.commerce, updated_at = now() returning commerce", [req.tenant.id, updates]);
    return res.json(emailSettings(saved.rows[0].commerce));
  } catch (err) { return next(err); }
});

settingsAdminRouter.post('/email/verify', async (req, res, next) => {
  try { return res.status(200).json(await verifySmtpConnection({ tenantId: req.tenant.id })); }
  catch (err) { return next(err); }
});

settingsAdminRouter.post('/email/test', async (req, res, next) => {
  const to = String(req.body?.to || '').trim();
  if (!EMAIL_RE.test(to)) return res.status(400).json({ code: 'invalid_recipient', message: 'Ingresá un email destinatario válido.' });
  try {
    const result = await pool.query('select branding from tenant_settings where tenant_id = $1', [req.tenant.id]);
    const name = String(result.rows[0]?.branding?.name || req.tenant?.name || 'tu tienda').trim();
    const delivery = await sendSmtpEmail({ tenantId: req.tenant.id, to, subject: `Prueba de correo - ${name}`, text: `La configuración de correo de ${name} funciona correctamente.`, logPrefix: 'smtp-test' });
    return res.status(delivery.sent ? 200 : 400).json(delivery);
  } catch (err) { return next(err); }
});

settingsAdminRouter.put('/checkout', async (req, res, next) => {
  let targetTenantId = null;
  try {
    const updates = sanitizeCheckoutPayload(req.body || {});
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'settings_required' });
    }

    targetTenantId = req.tenant?.id;

    const isAdmin = ['master_admin', 'tenant_admin'].includes(req.user?.role);
    if (!targetTenantId && isAdmin && req.body?.tenant_id) {
      targetTenantId = String(req.body.tenant_id).trim();
    }

    if (!targetTenantId) {
      return res.status(400).json({
        error: 'missing_tenant_id',
        code: 'missing_tenant_id',
        details: `No se detecto el ID del sitio. Rol actual: ${req.user?.role || 'desconocido'}. Usa el boton Gestionar en Empresas.`,
      });
    }

    if (!UUID_REGEX_SETTINGS.test(targetTenantId)) {
      return res.status(400).json({
        error: 'invalid_tenant_id',
        code: 'invalid_tenant_id',
        details: `El ID del sitio no tiene formato valido: ${targetTenantId}`,
      });
    }

    const tenantCheck = await pool.query(
      'select id from tenants where id = $1',
      [targetTenantId]
    );
    if (!tenantCheck.rowCount) {
      return res.status(404).json({
        error: 'tenant_not_found',
        code: 'tenant_not_found',
        tenant_id: targetTenantId,
        details: `El sitio seleccionado (${targetTenantId}) ya no existe. Volve a Empresas y elegi un sitio valido.`,
      });
    }

    const upsertRes = await pool.query(
      [
        'insert into tenant_settings (tenant_id, commerce, updated_at)',
        'values ($1, $2::jsonb, now())',
        'on conflict (tenant_id) do update',
        "set commerce = coalesce(tenant_settings.commerce, '{}'::jsonb) || excluded.commerce,",
        'updated_at = now()',
        'returning commerce',
      ].join(' '),
      [targetTenantId, updates]
    );

    return res.json(normalizeCheckoutSettings(upsertRes.rows[0].commerce));
  } catch (err) {
    console.error('Error saving checkout settings:', err);
    if (err && err.code === '23503') {
      return res.status(404).json({
        error: 'tenant_not_found',
        code: 'tenant_not_found',
        tenant_id: targetTenantId,
        details: `El sitio (${targetTenantId}) ya no existe en la base. Volve a Empresas y elegi un sitio valido.`,
      });
    }
    return res.status(500).json({
      error: `ID [${targetTenantId || 'unknown'}]: ${err.message}`,
      code: err.code,
    });
  }
});
