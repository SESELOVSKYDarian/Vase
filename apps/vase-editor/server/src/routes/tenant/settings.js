// Ajustes de la tienda, borrador del editor e historial de cambios.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { ensureTenantSettingsSeoColumn, queryTenantSettingsWithSeo } from '../../services/tenantSettings.js';
import { normalizeTenantSettingsWritePayload } from '../../services/tenantSettingsPayload.js';
import { clearEditorDraft, normalizeEditorDraft, readEditorDraft, writeEditorDraft } from '../../services/editorDraft.js';
import { applyVaseBusinessProfile, vaseProfileEditUrl, vaseProfileForTenant } from '../../services/vaseBusinessProfile.js';
import { addEditorHistory, listEditorHistory, normalizeHistoryEntry, readEditorHistoryEntry } from '../../services/editorHistory.js';
import { getTenantId, isUuid, normalizeTenantSettingsPayload } from './helpers-common.js';

tenantRouter.get('/settings', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    await ensureTenantSettingsSeoColumn();
    const result = await queryTenantSettingsWithSeo(tenantId);
    const stored = normalizeTenantSettingsPayload(result.rows[0] || { branding: {}, theme: {}, commerce: {} });
    const profile = await vaseProfileForTenant(tenantId);
    const settings = profile
      ? { ...applyVaseBusinessProfile(stored, profile), vase_profile: { connected: true, edit_url: vaseProfileEditUrl() } }
      : stored;
    return res.json({ tenant_id: tenantId, settings });
  } catch (err) {
    return next(err);
  }
});

// Borrador que guarda solo el panel; la tienda no lo lee hasta Publicar.
tenantRouter.get('/editor-draft', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    return res.json({ draft: await readEditorDraft(tenantId) });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/editor-draft', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    const saved = await writeEditorDraft(tenantId, normalizeEditorDraft(req.body));
    return res.json({ ok: true, updated_at: saved?.updated_at || null });
  } catch (err) {
    if (err && err.code === '23503') return res.status(404).json({ error: 'tenant_not_found' });
    return next(err);
  }
});

tenantRouter.delete('/editor-draft', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    await clearEditorDraft(tenantId);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// Historial: los últimos puntos para volver atrás en el diseño.
tenantRouter.get('/editor-history', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    return res.json({ entries: await listEditorHistory(tenantId, undefined, { full: req.query?.full === '1' }) });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/editor-history', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  try {
    // El nombre de quien edita sale de su cuenta, no de lo que manda el panel.
    let authorName = null;
    try {
      const author = await pool.query('select display_name, email from users where id = $1', [req.user?.id || null]);
      authorName = author.rows[0]?.display_name || author.rows[0]?.email?.split('@')[0] || null;
    } catch {
      authorName = null;
    }
    return res.json({ entry: await addEditorHistory(tenantId, { ...normalizeHistoryEntry(req.body), authorName }) });
  } catch (err) {
    if (err && err.code === '23503') return res.status(404).json({ error: 'tenant_not_found' });
    return next(err);
  }
});

tenantRouter.get('/editor-history/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'not_found' });
  try {
    const entry = await readEditorHistoryEntry(tenantId, req.params.id);
    if (!entry) return res.status(404).json({ error: 'not_found' });
    return res.json({ entry });
  } catch (err) {
    return next(err);
  }
});


tenantRouter.put('/settings', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const { branding, theme, seo, commerce } = normalizeTenantSettingsWritePayload(req.body);

    const tenantCheck = await pool.query(
      'select id from tenants where id = $1',
      [tenantId]
    );
    if (!tenantCheck.rowCount) {
      return res.status(404).json({
        error: 'tenant_not_found',
        code: 'tenant_not_found',
        tenant_id: tenantId,
        details: `El sitio seleccionado (${tenantId}) ya no existe. Volve a Empresas y elegi un sitio valido.`,
      });
    }

    const existing = await pool.query(
      'select tenant_id from tenant_settings where tenant_id = $1',
      [tenantId]
    );

    if (!existing.rowCount) {
      await ensureTenantSettingsSeoColumn();
      const insertRes = await pool.query(
        'insert into tenant_settings (tenant_id, branding, theme, seo, commerce) values ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb) returning branding, theme, seo, commerce',
        [tenantId, branding, theme, seo || {}, commerce]
      );
      return res.json({ tenant_id: tenantId, settings: normalizeTenantSettingsPayload(insertRes.rows[0]) });
    }

    await ensureTenantSettingsSeoColumn();
    const updateRes = await pool.query(
      [
        'update tenant_settings',
        'set branding = branding || $2::jsonb,',
        'theme = theme || $3::jsonb,',
        'seo = seo || $4::jsonb,',
        'commerce = commerce || $5::jsonb,',
        'updated_at = now()',
        'where tenant_id = $1',
        'returning branding, theme, seo, commerce',
      ].join(' '),
      [tenantId, branding, theme, seo, commerce]
    );

    return res.json({ tenant_id: tenantId, settings: normalizeTenantSettingsPayload(updateRes.rows[0]) });
  } catch (err) {
    if (err && err.code === '23503') {
      return res.status(404).json({
        error: 'tenant_not_found',
        code: 'tenant_not_found',
        tenant_id: tenantId,
        details: `El sitio (${tenantId}) ya no existe en la base. Volve a Empresas y elegi un sitio valido.`,
      });
    }
    return next(err);
  }
});
