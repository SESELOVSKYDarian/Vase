// Rutas internas (solo Vase, con el token de servicio): espacio usado y copia de seguridad de una tienda.
import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { createTenantBackup, isRestoreEnabled, listTenantBackups, restoreTenantBackup } from '../services/storage/backups.js';
import { reportTenantUsage } from '../services/storage/scheduler.js';
import { findTenantByVaseId } from '../services/storage/tables.js';
import { listTenantProductImages, measureTenantUsage } from '../services/storage/usage.js';

export const internalStorageRouter = Router();

function requireServiceToken(req, res, next) {
  const expected = Buffer.from(String(process.env.SERVICE_TO_SERVICE_TOKEN || '').trim());
  const supplied = Buffer.from(String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim());
  if (expected.length > 0 && expected.length === supplied.length && timingSafeEqual(expected, supplied)) return next();
  return res.status(403).json({ error: 'forbidden' });
}

async function loadTenant(req, res, next) {
  try {
    const tenant = await findTenantByVaseId(req.params.vaseTenantId);
    // Una cuenta que nunca abrió Business todavía no tiene tienda: no es un error.
    if (!tenant) return res.status(404).json({ error: 'store_not_found' });
    req.storeTenant = { ...tenant, external_tenant_id: req.params.vaseTenantId };
    return next();
  } catch (error) {
    return next(error);
  }
}

internalStorageRouter.use(requireServiceToken);

internalStorageRouter.get('/:vaseTenantId', loadTenant, async (req, res, next) => {
  try {
    const [usage, backups] = await Promise.all([measureTenantUsage(req.storeTenant.id), listTenantBackups(req.storeTenant.id)]);
    return res.json({ usage, backups, restoreEnabled: isRestoreEnabled() });
  } catch (error) {
    return next(error);
  }
});

internalStorageRouter.get('/:vaseTenantId/images', loadTenant, async (req, res, next) => {
  try {
    return res.json({ images: await listTenantProductImages(req.storeTenant.id) });
  } catch (error) {
    return next(error);
  }
});

internalStorageRouter.post('/:vaseTenantId/backup', loadTenant, async (req, res, next) => {
  try {
    const backup = await createTenantBackup(req.storeTenant.id, 'manual');
    void reportTenantUsage(req.storeTenant).catch(() => {});
    return res.json({ backup });
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

internalStorageRouter.post('/:vaseTenantId/restore', loadTenant, async (req, res, next) => {
  try {
    const backupId = String(req.body?.backupId || '');
    if (!/^[0-9a-f-]{36}$/i.test(backupId)) return res.status(400).json({ error: 'backup_id_required' });
    const result = await restoreTenantBackup(req.storeTenant.id, backupId);
    void reportTenantUsage(req.storeTenant, { fresh: true }).catch(() => {});
    return res.json(result);
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ error: error.message });
    console.error('store_restore_failed', req.storeTenant?.id, error?.message || error);
    return res.status(500).json({ error: 'restore_failed' });
  }
});
