import { pool } from '../db.js';
import { normalizeTenantSettingsWritePayload } from './tenantSettingsPayload.js';

// Puntos para volver atrás en el diseño de la tienda. Solo se guardan los últimos cambios
// importantes, no cada tecla: el panel decide cuándo marcar un punto.

export const MAX_HISTORY_ENTRIES = 10;
const MAX_SUMMARY_LENGTH = 160;
const PAGE_SLUGS = ['home', 'about'];

let tableReady = false;

export async function ensureEditorHistoryTable(db = pool) {
  if (tableReady) return;
  await db.query(
    [
      'CREATE TABLE IF NOT EXISTS tenant_editor_history (',
      'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
      'tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,',
      "settings jsonb NOT NULL DEFAULT '{}'::jsonb,",
      "pages jsonb NOT NULL DEFAULT '{}'::jsonb,",
      "summary text NOT NULL DEFAULT '',",
      'created_at timestamptz NOT NULL DEFAULT now()',
      ')',
    ].join(' ')
  );
  await db.query('CREATE INDEX IF NOT EXISTS tenant_editor_history_tenant_idx ON tenant_editor_history (tenant_id, created_at DESC)');
  tableReady = true;
}

export function normalizeHistoryEntry(body = {}) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const pagesSource = source.pages && typeof source.pages === 'object' && !Array.isArray(source.pages) ? source.pages : {};
  const pages = {};
  for (const slug of PAGE_SLUGS) {
    pages[slug] = Array.isArray(pagesSource[slug]) ? pagesSource[slug] : [];
  }
  const summary = String(source.summary ?? '').trim().slice(0, MAX_SUMMARY_LENGTH) || 'Cambios en el diseño';
  return { settings: normalizeTenantSettingsWritePayload(source.settings), pages, summary };
}

export async function listEditorHistory(tenantId, db = pool) {
  await ensureEditorHistoryTable(db);
  const result = await db.query(
    'select id, summary, created_at from tenant_editor_history where tenant_id = $1 order by created_at desc limit $2',
    [tenantId, MAX_HISTORY_ENTRIES]
  );
  return result.rows;
}

export async function addEditorHistory(tenantId, entry, db = pool) {
  await ensureEditorHistoryTable(db);
  const inserted = await db.query(
    'insert into tenant_editor_history (tenant_id, settings, pages, summary) values ($1, $2::jsonb, $3::jsonb, $4) returning id, summary, created_at',
    [tenantId, entry.settings, entry.pages, entry.summary]
  );
  // Se quedan solo los últimos puntos: el resto se borra.
  await db.query(
    [
      'delete from tenant_editor_history where tenant_id = $1 and id not in (',
      'select id from tenant_editor_history where tenant_id = $1 order by created_at desc limit $2',
      ')',
    ].join(' '),
    [tenantId, MAX_HISTORY_ENTRIES]
  );
  return inserted.rows[0];
}

export async function readEditorHistoryEntry(tenantId, id, db = pool) {
  await ensureEditorHistoryTable(db);
  const result = await db.query(
    'select id, settings, pages, summary, created_at from tenant_editor_history where tenant_id = $1 and id = $2',
    [tenantId, id]
  );
  return result.rows[0] || null;
}

export const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
