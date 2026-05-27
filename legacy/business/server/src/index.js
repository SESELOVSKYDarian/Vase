import dotenv from 'dotenv';
dotenv.config();
import { access, readFile } from 'fs/promises';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { pool } from './db.js';
import app from './app.js';
import { ensurePricingSchema } from './services/userPricing.js';
import { ensureProductSyncSchema } from './services/integration.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REQUIRED_BASE_TABLES = [
  'tenants',
  'tenant_domains',
  'tenant_settings',
  'users',
  'user_tenants',
  'product_cache',
  'categories',
];

async function resolveBaseSchemaPath() {
  const candidates = [
    path.resolve(__dirname, '..', 'sql', 'base-schema.sql'),
    path.resolve(__dirname, '..', '..', 'db', 'schema.sql'),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next deployment layout.
    }
  }

  throw new Error('Base schema SQL not found. Include server/sql/base-schema.sql in the deployment image.');
}

async function ensureBaseSchema() {
  const client = await pool.connect();
  try {
    const existingBaseTables = await client.query(
      [
        'select table_name',
        'from information_schema.tables',
        "where table_schema = 'public'",
        "and table_type = 'BASE TABLE'",
        'and table_name = any($1::text[])',
      ].join(' '),
      [REQUIRED_BASE_TABLES]
    );

    const existing = new Set(existingBaseTables.rows.map((row) => row.table_name));
    const missing = REQUIRED_BASE_TABLES.filter((tableName) => !existing.has(tableName));
    if (missing.length === 0) return;

    const tableCount = await client.query(
      [
        'select count(*)::int as total',
        'from information_schema.tables',
        "where table_schema = 'public'",
        "and table_type = 'BASE TABLE'",
      ].join(' ')
    );
    const totalTables = Number(tableCount.rows[0]?.total || 0);

    if (totalTables > 0) {
      throw new Error(`Base schema incomplete. Missing tables: ${missing.join(', ')}.`);
    }

    const schemaPath = await resolveBaseSchemaPath();
    const schemaSql = await readFile(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log(`Base schema applied from ${path.relative(process.cwd(), schemaPath) || schemaPath}`);
  } finally {
    client.release();
  }
}

async function runStartupMigrations() {
  await pool.query(
    [
      'ALTER TABLE user_tenants',
      'ADD COLUMN IF NOT EXISTS price_adjustment_percent numeric(6,2) NOT NULL DEFAULT 0',
    ].join(' ')
  );

  await pool.query(
    [
      'CREATE TABLE IF NOT EXISTS tenant_offers (',
      'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
      'tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,',
      "name text NOT NULL,",
      "label text NOT NULL DEFAULT 'Oferta',",
      'percent numeric(6,2) NOT NULL CHECK (percent >= 0),',
      'enabled boolean NOT NULL DEFAULT true,',
      "user_ids uuid[] NOT NULL DEFAULT '{}',",
      "category_ids uuid[] NOT NULL DEFAULT '{}',",
      'created_at timestamptz NOT NULL DEFAULT now(),',
      'updated_at timestamptz NOT NULL DEFAULT now()',
      ')',
    ].join(' ')
  );

  await pool.query(
    'CREATE INDEX IF NOT EXISTS tenant_offers_tenant_idx ON tenant_offers(tenant_id, enabled)'
  );

  await pool.query(
    [
      'CREATE TABLE IF NOT EXISTS product_reviews (',
      'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
      'tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,',
      'product_id uuid NOT NULL REFERENCES product_cache(id) ON DELETE CASCADE,',
      'user_id uuid REFERENCES users(id) ON DELETE SET NULL,',
      'rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),',
      'comment text NOT NULL,',
      "status text NOT NULL DEFAULT 'published',",
      'created_at timestamptz NOT NULL DEFAULT now(),',
      'updated_at timestamptz NOT NULL DEFAULT now()',
      ')',
    ].join(' ')
  );

  await pool.query(
    [
      'CREATE INDEX IF NOT EXISTS product_reviews_tenant_product_idx',
      'ON product_reviews(tenant_id, product_id, status, created_at DESC)',
    ].join(' ')
  );

  await pool.query(
    [
      'CREATE INDEX IF NOT EXISTS product_reviews_user_idx',
      'ON product_reviews(user_id, created_at DESC)',
    ].join(' ')
  );

  await ensureProductSyncSchema();
}

// Verify DB connection on startup
const dbHost = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'NOT SET';
console.log(`Checking DB connection to: ${dbHost}`);

async function bootstrapDb() {
  try {
    await pool.query('SELECT 1');
    await ensureBaseSchema();
    await runStartupMigrations();
    console.log('DB Connection OK');
    await ensurePricingSchema();
    console.log('Pricing schema ready');
  } catch (err) {
    console.error('DB bootstrap warning:', err?.message || err);
  }
}

async function startServer() {
  await bootstrapDb();

  const port = Number(process.env.PORT || 4000);
  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the previous API process or change PORT in server/.env.`);
      return;
    }
    console.error('Server startup error:', err);
  });

  server.on('listening', () => {
    console.log(`API listening on port ${port}`);
  });

  server.listen(port);
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err?.message || err);
});
