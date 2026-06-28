import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';

const { pool } = await import('../db.js');
const { resolveSchemaPath } = await import('./bootstrapSchema.js');

after(async () => {
  await pool.end();
});

test('resolveSchemaPath returns the first readable schema candidate', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'teflon-schema-'));
  const missingPath = path.join(tempDir, 'missing', 'schema.sql');
  const fallbackPath = path.join(tempDir, 'server', 'sql', 'base-schema.sql');

  await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
  await fs.writeFile(fallbackPath, 'select 1;', 'utf8');

  assert.equal(await resolveSchemaPath([missingPath, fallbackPath]), fallbackPath);
});
