import { pool } from '../db.js';
import { normalizeTenantSettingsWritePayload } from './tenantSettingsPayload.js';

// Borrador de los ajustes de la tienda que guarda el panel solo, en la nube.
// La tienda nunca lo lee: recién se ve cuando se toca Publicar.

let tableReady = false;

export async function ensureEditorDraftTable(db = pool) {
  if (tableReady) return;
  await db.query(
    [
      'CREATE TABLE IF NOT EXISTS tenant_editor_drafts (',
      'tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,',
      "settings jsonb NOT NULL DEFAULT '{}'::jsonb,",
      'updated_at timestamptz NOT NULL DEFAULT now()',
      ')',
    ].join(' ')
  );
  tableReady = true;
}

export function normalizeEditorDraft(body = {}) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  return normalizeTenantSettingsWritePayload(source.settings);
}

export async function readEditorDraft(tenantId, db = pool) {
  await ensureEditorDraftTable(db);
  const result = await db.query(
    'select settings, updated_at from tenant_editor_drafts where tenant_id = $1',
    [tenantId]
  );
  return result.rows[0] || null;
}

export async function writeEditorDraft(tenantId, settings, db = pool) {
  await ensureEditorDraftTable(db);
  const result = await db.query(
    [
      'insert into tenant_editor_drafts (tenant_id, settings, updated_at) values ($1, $2::jsonb, now())',
      'on conflict (tenant_id) do update set settings = excluded.settings, updated_at = now()',
      'returning updated_at',
    ].join(' '),
    [tenantId, settings]
  );
  return result.rows[0];
}

export async function clearEditorDraft(tenantId, db = pool) {
  await ensureEditorDraftTable(db);
  await db.query('delete from tenant_editor_drafts where tenant_id = $1', [tenantId]);
}
