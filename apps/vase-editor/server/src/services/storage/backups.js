// Copia de seguridad de una tienda. Se guarda dentro de la misma base, fila por fila, sin pasar
// los datos por el servidor: así una tienda pesada no llena la memoria. Queda solo la última.
import { pool } from '../../db.js';
import { listExistingStoreTables } from './tables.js';
import { invalidateTenantUsage } from './usage.js';

// "weekly" (la automática) y "manual" comparten lugar: siempre queda una sola, la más nueva.
// "pre_restore" es la foto que se saca justo antes de restablecer, por si hay que volver.
const MAIN_KINDS = ['weekly', 'manual'];
let tablesReady = false;

export async function ensureBackupTables(db = pool) {
  if (tablesReady) return;
  await db.query(
    [
      'CREATE TABLE IF NOT EXISTS tenant_backups (',
      'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
      'tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,',
      "kind text NOT NULL DEFAULT 'weekly',",
      "status text NOT NULL DEFAULT 'running',",
      'size_bytes bigint NOT NULL DEFAULT 0,',
      'row_count bigint NOT NULL DEFAULT 0,',
      'created_at timestamptz NOT NULL DEFAULT now()',
      ')',
    ].join(' ')
  );
  await db.query(
    [
      'CREATE TABLE IF NOT EXISTS tenant_backup_rows (',
      'backup_id uuid NOT NULL REFERENCES tenant_backups(id) ON DELETE CASCADE,',
      'table_name text NOT NULL,',
      'row jsonb NOT NULL',
      ')',
    ].join(' ')
  );
  await db.query('CREATE INDEX IF NOT EXISTS tenant_backups_tenant_idx ON tenant_backups (tenant_id, created_at DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS tenant_backup_rows_backup_idx ON tenant_backup_rows (backup_id, table_name)');
  tablesReady = true;
}

const toBackup = (row) => ({
  id: row.id,
  kind: row.kind,
  sizeBytes: Number(row.size_bytes || 0),
  rowCount: Number(row.row_count || 0),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
});

export async function listTenantBackups(tenantId, db = pool) {
  await ensureBackupTables(db);
  const result = await db.query(
    "select id, kind, size_bytes, row_count, created_at from tenant_backups where tenant_id = $1 and status = 'ready' order by created_at desc",
    [tenantId]
  );
  return result.rows.map(toBackup);
}

// Una sola copia o restauración a la vez por tienda.
async function lockTenant(client, tenantId) {
  const result = await client.query('select pg_try_advisory_xact_lock(hashtext($1)) as locked', [`backup:${tenantId}`]);
  if (!result.rows[0]?.locked) {
    const error = new Error('backup_in_progress');
    error.status = 409;
    throw error;
  }
}

// Copia las filas de la tienda adentro de la transacción abierta y borra la copia anterior del mismo tipo.
async function copyStoreRows(client, tenantId, kind) {
  const tables = await listExistingStoreTables(client);
  const header = await client.query('insert into tenant_backups (tenant_id, kind) values ($1, $2) returning id', [tenantId, kind]);
  const backupId = header.rows[0].id;
  for (const table of tables) {
    await client.query(
      `insert into tenant_backup_rows (backup_id, table_name, row) select $2, '${table.name}', to_jsonb(t) from ${table.name} t where ${table.where}`,
      [tenantId, backupId]
    );
  }
  const saved = await client.query(
    [
      "update tenant_backups set status = 'ready',",
      'size_bytes = (select coalesce(sum(octet_length(row::text)), 0) from tenant_backup_rows where backup_id = $1),',
      'row_count = (select count(*) from tenant_backup_rows where backup_id = $1)',
      'where id = $1 returning id, kind, size_bytes, row_count, created_at',
    ].join(' '),
    [backupId]
  );
  const sameSlot = MAIN_KINDS.includes(kind) ? MAIN_KINDS : [kind];
  await client.query('delete from tenant_backups where tenant_id = $1 and id <> $2 and kind = any($3::text[])', [tenantId, backupId, sameSlot]);
  return toBackup(saved.rows[0]);
}

/** Guarda una copia completa de la tienda (diseño, catálogo, precios, fotos y pedidos). */
export async function createTenantBackup(tenantId, kind = 'weekly') {
  await ensureBackupTables();
  const client = await pool.connect();
  try {
    await client.query('begin');
    await lockTenant(client, tenantId);
    const backup = await copyStoreRows(client, tenantId, kind);
    await client.query('commit');
    return backup;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Arma el "insert" de una tabla desde la copia. Si el cliente dueño de la fila ya no existe,
// la fila vuelve sin dueño o se saltea, según la tabla.
function restoreSql(table) {
  const userExists = "exists (select 1 from users u where u.id::text = b.row->>'user_id')";
  const row = table.nullIfUserMissing
    ? `case when b.row->>'user_id' is null or ${userExists} then b.row else b.row || '{"user_id": null}'::jsonb end`
    : 'b.row';
  const filter = table.skipIfUserMissing ? ` and ${userExists}` : '';
  return [
    `insert into ${table.name}`,
    `select (r).* from (select jsonb_populate_record(null::${table.name}, ${row}) as r`,
    `from tenant_backup_rows b where b.backup_id = $1 and b.table_name = '${table.name}'${filter}) restored`,
  ].join(' ');
}

export const isRestoreEnabled = () => String(process.env.BACKUP_RESTORE_ENABLED || '').trim() === '1';

/**
 * Deja la tienda como estaba cuando se hizo la copia. Antes guarda cómo está ahora.
 * Todo pasa en una sola transacción: si algo falla, la tienda queda exactamente como estaba.
 */
export async function restoreTenantBackup(tenantId, backupId) {
  if (!isRestoreEnabled()) {
    const error = new Error('restore_disabled');
    error.status = 403;
    throw error;
  }
  await ensureBackupTables();
  const client = await pool.connect();
  try {
    await client.query('begin');
    await lockTenant(client, tenantId);
    const found = await client.query("select id from tenant_backups where id = $1 and tenant_id = $2 and status = 'ready'", [backupId, tenantId]);
    if (!found.rows[0]) {
      const error = new Error('backup_not_found');
      error.status = 404;
      throw error;
    }
    const safety = await copyStoreRows(client, tenantId, 'pre_restore');
    const tables = await listExistingStoreTables(client);
    for (const table of [...tables].reverse()) {
      await client.query(`delete from ${table.name} t where ${table.where}`, [tenantId]);
    }
    for (const table of tables) {
      await client.query(restoreSql(table), [backupId]);
    }
    await client.query('commit');
    invalidateTenantUsage(tenantId);
    return { restoredBackupId: backupId, safetyBackup: safety };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
