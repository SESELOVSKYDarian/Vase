import { pool } from '../src/db.js';

const args = process.argv.slice(2);

function readArg(name, fallback = '') {
  const flag = `--${name}`;
  const index = args.indexOf(flag);
  if (index >= 0) return String(args[index + 1] || '').trim();

  const inline = args.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1).trim();

  return fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const tenantSelector = readArg('tenant') || readArg('slug') || readArg('id');
const preset = normalizeText(readArg('preset', 'generic')).replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
const resetPages = hasFlag('reset-pages');

if (!tenantSelector || !preset) {
  console.error('Usage: node scripts/apply-tenant-design-preset.js --tenant <id|slug|name> --preset <preset> [--reset-pages]');
  process.exit(1);
}

const client = await pool.connect();

try {
  await client.query('BEGIN');

  const tenantRes = await client.query(
    [
      'select id, name, external_tenant_slug',
      'from tenants',
      'where id::text = $1',
      'or lower(coalesce(external_tenant_slug, \'\')) = lower($1)',
      'or lower(coalesce(name, \'\')) = lower($1)',
      'order by case when id::text = $1 then 0 when lower(coalesce(external_tenant_slug, \'\')) = lower($1) then 1 else 2 end',
      'limit 1',
    ].join(' '),
    [tenantSelector]
  );

  if (!tenantRes.rowCount) {
    throw new Error(`Tenant not found: ${tenantSelector}`);
  }

  const tenant = tenantRes.rows[0];
  await client.query(
    [
      'insert into tenant_settings (tenant_id, branding, theme, commerce)',
      "values ($1, jsonb_build_object('name', $2::text, 'design_preset', $3::text), '{}'::jsonb, '{}'::jsonb)",
      'on conflict (tenant_id) do update set',
      "branding = coalesce(tenant_settings.branding, '{}'::jsonb)",
      "|| jsonb_build_object('name', $2::text, 'design_preset', $3::text),",
      'updated_at = now()',
    ].join(' '),
    [tenant.id, tenant.name, preset]
  );

  let deletedSections = 0;
  if (resetPages) {
    const deleteRes = await client.query(
      [
        'delete from page_sections ps',
        'using pages p',
        'where ps.page_id = p.id',
        'and p.tenant_id = $1',
        "and p.slug in ('home', 'about')",
      ].join(' '),
      [tenant.id]
    );
    deletedSections = deleteRes.rowCount || 0;
  }

  await client.query('COMMIT');

  console.log(
    JSON.stringify(
      {
        ok: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          external_tenant_slug: tenant.external_tenant_slug,
        },
        design_preset: preset,
        reset_pages: resetPages,
        deleted_sections: deletedSections,
      },
      null,
      2
    )
  );
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
