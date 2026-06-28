#!/usr/bin/env node

import { pool } from '../src/db.js';
import { repairSyncedProductCategories } from '../src/services/integration.service.js';

const DEFAULT_DOMAIN = 'sanitarioselteflon.com';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readArgs = (argv) => {
  const options = {
    apply: false,
    domain: DEFAULT_DOMAIN,
    tenantId: '',
    sku: '',
    externalId: '',
    query: '',
    limit: 0,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--domain') {
      options.domain = String(next || '').trim() || DEFAULT_DOMAIN;
      index += 1;
      continue;
    }
    if (arg === '--tenant-id') {
      options.tenantId = String(next || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--sku') {
      options.sku = String(next || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--external-id') {
      options.externalId = String(next || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--q') {
      options.query = String(next || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--limit') {
      const parsed = Number(next || 0);
      options.limit = Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
      index += 1;
    }
  }

  return options;
};

const printUsage = () => {
  console.log([
    'Repair synced product categories.',
    '',
    'Dry-run by default:',
    '  node scripts/repair-sync-categories.js --domain sanitarioselteflon.com --q AF1500',
    '',
    'Apply changes:',
    '  node scripts/repair-sync-categories.js --domain sanitarioselteflon.com --apply',
    '',
    'Options:',
    '  --domain <domain>       Tenant domain. Defaults to sanitarioselteflon.com',
    '  --tenant-id <uuid>      Tenant id. Overrides --domain',
    '  --sku <sku>             Limit to one SKU',
    '  --external-id <id>      Limit to one external id / ERP id',
    '  --q <text>              Filter by product name, SKU, ERP id or external id',
    '  --limit <number>        Max products scanned',
    '  --apply                 Persist changes. Without this flag, all DB changes roll back',
  ].join('\n'));
};

async function resolveTenantId(options) {
  if (options.tenantId) {
    if (!UUID_REGEX.test(options.tenantId)) {
      throw new Error('invalid_tenant_id');
    }
    return options.tenantId;
  }

  const domain = String(options.domain || DEFAULT_DOMAIN)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');

  const result = await pool.query(
    [
      'select t.id',
      'from tenants t',
      'join tenant_domains d on d.tenant_id = t.id',
      'where lower(d.domain) = $1',
      'limit 1',
    ].join(' '),
    [domain]
  );

  if (!result.rowCount) {
    throw new Error(`tenant_not_found_for_domain:${domain}`);
  }

  return result.rows[0].id;
}

const main = async () => {
  const options = readArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const tenantId = await resolveTenantId(options);
  const result = await repairSyncedProductCategories({
    tenantId,
    apply: options.apply,
    filters: {
      sku: options.sku,
      externalId: options.externalId,
      query: options.query,
      limit: options.limit,
    },
  });

  console.log(JSON.stringify(result, null, 2));
};

main()
  .catch((err) => {
    console.error(err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
