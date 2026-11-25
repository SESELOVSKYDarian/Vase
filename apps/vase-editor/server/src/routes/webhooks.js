import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { pool } from '../db.js';
import { ensureTenantSettingsSeoColumn } from '../services/tenantSettings.js';

export const webhooksRouter = express.Router();

webhooksRouter.post('/payments', async (req, res, next) => {
  try {
    const eventType = String(req.query.type || req.body.type || 'payment');
    await pool.query(
      'insert into webhook_events (event_type, payload) values ($1, $2::jsonb)',
      [eventType, req.body || {}]
    );
    return res.sendStatus(200);
  } catch (err) {
    return next(err);
  }
});

webhooksRouter.post('/vase-provision', async (req, res, next) => {
  try {
    // Solo Vase puede avisar que un proyecto quedó listo: exige la clave cargada en el servidor
    // y la compara sin dar pistas (tarda siempre lo mismo).
    const expectedSecret = process.env.VASE_WEBHOOK_SECRET?.trim();
    if (!expectedSecret) {
      return res.status(503).json({ error: 'webhook_not_configured' });
    }
    const provided = Buffer.from(String(req.headers.authorization || ''));
    const expected = Buffer.from(`Bearer ${expectedSecret}`);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { tenant_name, preview_url } = req.body;
    if (!tenant_name || !preview_url) {
      return res.status(400).json({ error: 'missing_fields', detail: 'tenant_name and preview_url are required' });
    }

    // Look up the tenant by name (case-insensitive) since Vase uses CUIDs and Teflon uses UUIDs
    const tenantRes = await pool.query(
      'select id from tenants where lower(name) = lower($1)',
      [tenant_name.trim()]
    );

    if (!tenantRes.rowCount) {
      console.error(`[vase-provision] Tenant not found by name: "${tenant_name}"`);
      return res.status(404).json({ error: 'tenant_not_found', tenant_name });
    }

    const tenantId = tenantRes.rows[0].id;
    console.log(`[vase-provision] Resolved tenant "${tenant_name}" -> ${tenantId}, preview_url: ${preview_url}`);

    const brandingUpdate = {
      preview_url,
      design_preset: 'piquim'
    };

    const existing = await pool.query(
      'select tenant_id from tenant_settings where tenant_id = $1',
      [tenantId]
    );

    if (!existing.rowCount) {
      await ensureTenantSettingsSeoColumn();
      await pool.query(
        'insert into tenant_settings (tenant_id, branding, theme, seo, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb)',
        [tenantId, brandingUpdate, {}, {}, {}]
      );
    } else {
      await ensureTenantSettingsSeoColumn();
      await pool.query(
        'update tenant_settings set branding = branding || $2::jsonb, updated_at = now() where tenant_id = $1',
        [tenantId, brandingUpdate]
      );
    }

    return res.json({ ok: true, tenant_id: tenantId, tenant_name, preview_url });
  } catch (err) {
    console.error('[vase-provision] Error:', err);
    return next(err);
  }
});
