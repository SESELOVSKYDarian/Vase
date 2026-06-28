import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { pool } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(serverRoot, '..');
const schemaPathCandidates = [
  process.env.BASE_SCHEMA_SQL_PATH,
  path.join(serverRoot, 'sql', 'base-schema.sql'),
  path.join(projectRoot, 'db', 'schema.sql'),
  path.join(serverRoot, 'db', 'schema.sql'),
].filter(Boolean);

const REQUIRED_TABLES = [
  'tenants',
  'tenant_settings',
  'users',
  'user_tenants',
  'pages',
  'product_cache',
  'orders',
];

function buildIdempotentSchemaSql(rawSql) {
  return String(rawSql || '')
    .replace(/CREATE TABLE(?!\s+IF\s+NOT\s+EXISTS)\s+/g, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE UNIQUE INDEX(?!\s+IF\s+NOT\s+EXISTS)\s+/g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/CREATE INDEX(?!\s+IF\s+NOT\s+EXISTS)\s+/g, 'CREATE INDEX IF NOT EXISTS ');
}

async function findMissingTables() {
  const missing = [];

  for (const tableName of REQUIRED_TABLES) {
    const result = await pool.query('select to_regclass($1) as regclass', [`public.${tableName}`]);
    if (!result.rows[0]?.regclass) {
      missing.push(tableName);
    }
  }

  return missing;
}

export async function resolveSchemaPath(candidatePaths = schemaPathCandidates) {
  for (const candidatePath of candidatePaths) {
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Base schema SQL file not found. Checked: ${candidatePaths.join(', ')}`);
}

export async function ensureBaseSchema() {
  const missingTables = await findMissingTables();
  if (!missingTables.length) {
    return { initialized: false, missingTables: [] };
  }

  const schemaPath = await resolveSchemaPath();
  const rawSchema = await fs.readFile(schemaPath, 'utf8');
  const schemaSql = buildIdempotentSchemaSql(rawSchema);

  console.log(`Base schema missing tables detected: ${missingTables.join(', ')}`);
  await pool.query(schemaSql);
  console.log(`Base schema initialized from ${path.relative(process.cwd(), schemaPath) || schemaPath}`);

  return { initialized: true, missingTables };
}
