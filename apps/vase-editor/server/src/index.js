import dotenv from 'dotenv';
dotenv.config();
import http from 'http';

import { pool } from './db.js';
import app from './app.js';
import { ensureBaseSchema } from './services/bootstrapSchema.js';
import { ensurePricingSchema } from './services/userPricing.js';
import { ensureUserProfileSchema } from './services/userProfile.js';
import { ensureProductSyncSchema } from './services/integration.service.js';
import { ensureVaseBridgeSchema } from './services/vaseBridge.js';
import { selectTeflonBootstrapTargetTenant } from './services/teflonBootstrapTarget.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_TEFLON_TENANT_ID = '636736e2-e135-44cd-ac5c-5d4ccb839a73';
const TEFLON_TENANT_ID = String(
  process.env.TEFLON_TENANT_ID ||
  process.env.DEFAULT_TENANT_ID ||
  DEFAULT_TEFLON_TENANT_ID
).trim();
const ENABLE_PIQUIM_BOOTSTRAP = String(process.env.ENABLE_PIQUIM_BOOTSTRAP || '').trim().toLowerCase() === 'true';
const PIQUIM_TENANT_ID = ENABLE_PIQUIM_BOOTSTRAP
  ? String(
      process.env.PIQUIM_TENANT_ID ||
      process.env.PIQUIM_TENANT_IDS ||
      ''
    ).split(',')[0].trim()
  : '';

const TEFLON_DEFAULT_BRANDING = {
  name: 'Sanitarios El Teflon',
  logo_url: '',
  design_preset: 'sanitarios_industrial',
  navbar: {
    links: [
      { label: 'Inicio', href: '/' },
      { label: 'Catalogo', href: '/catalog' },
      { label: 'Nosotros', href: '/about' },
    ],
    show_search: true,
    show_wishlist: true,
    show_cart: true,
    show_account: true,
    register_label: 'Registrarse',
    register_href: '/register',
  },
  footer: {
    description: 'Griferia, sanitarios, accesorios y materiales con asesoramiento para cada obra o renovacion.',
    quickLinks: [
      { label: 'Catalogo', href: '/catalog' },
      { label: 'Nosotros', href: '/about' },
    ],
    shopLinks: [
      { label: 'Griferia', href: '/catalog?category=griferia' },
      { label: 'Sanitarios', href: '/catalog?category=sanitarios' },
      { label: 'Accesorios', href: '/catalog?category=accesorios' },
    ],
    helpLinks: [
      { label: 'Carrito', href: '/cart' },
      { label: 'Terminos', href: '/terms' },
    ],
    legalLinks: [
      { label: 'Terminos y condiciones', href: '/terms' },
    ],
    newsletter: {
      enabled: false,
      title: 'Novedades',
      description: '',
      placeholder: 'tu@email.com',
      buttonLabel: 'Enviar',
    },
    legalText: '(c) 2026 Sanitarios El Teflon. Todos los derechos reservados.',
    contact: {
      address: 'Mar del Plata, Argentina',
      phone: '',
      email: '',
    },
    socials: {
      instagram: '',
      facebook: '',
      youtube: '',
      tiktok: '',
      whatsapp: '',
    },
  },
  admin_panel: {
    title: 'Panel de administracion',
    logo_url: '',
  },
  catalog_cards: [],
};

const TEFLON_DEFAULT_THEME = {
  mode: 'light',
  primary: '#f97316',
  accent: '#111827',
  background: '#f8f7f4',
  text: '#111827',
  secondary: '#64748b',
  font_family: 'Inter, Manrope, sans-serif',
  catalog: {
    panel_bg: '#f1f5f9',
    surface_bg: '#ffffff',
    card_bg: '#ffffff',
    border: '#dbe2ea',
    muted_text: '#64748b',
  },
  admin_panel: {
    mode: 'light',
    accent: '#111111',
    shell_bg: '#e7edf4',
    sidebar_bg: '#f8fafc',
    panel_bg: '#ffffff',
    canvas_bg: '#eef3f8',
    text: '#0f172a',
    muted_text: '#475569',
  },
};

const TEFLON_DEFAULT_COMMERCE = {
  mode: 'hybrid',
  currency: 'ARS',
  locale: 'es-AR',
  show_prices: true,
  show_stock: true,
  reviews_enabled: true,
  tax_rate: 0.21,
  address: 'Mar del Plata, Argentina',
  email: '',
  payment_methods: ['transfer', 'cash_on_pickup'],
};

const PIQUIM_DEFAULT_BRANDING = {
  name: 'PIQUIM',
  logo_url: '',
  design_preset: 'piquim',
  navbar: {
    links: [
      { label: 'Inicio', href: '/' },
      { label: 'Catalogo', href: '/catalog' },
      { label: 'Nosotros', href: '/about' },
    ],
  },
  catalog_cards: [
    {
      id: 'heladeria',
      title: 'Heladeria',
      prefix: '01 - Frio que enamora',
      description: 'Materia prima para la elaboracion de helados artesanales, bases estables y terminaciones con sabor propio.',
      tags: ['Pulpas', 'Variegattos', 'Bases', 'Neutros'],
      image: '/piquim/catalogo/card-heladeria.png',
      category: 'heladeria',
    },
    {
      id: 'panaderia',
      title: 'Panaderia/Confiteria',
      prefix: '02 - Hornear y decorar',
      description: 'Premezclas, mejoradores, cremas y bases para panaderia, reposteria y confiteria profesional.',
      tags: ['Premezclas', 'Mejoradores', 'Cremas', 'DDL'],
      image: '/piquim/catalogo/card-panaderia.png',
      category: 'panaderia',
    },
  ],
};

const PIQUIM_DEFAULT_THEME = {
  mode: 'light',
  primary: '#ff4d00',
  accent: '#ff7a2f',
  background: '#fffaf6',
  text: '#1a1614',
  secondary: '#6f625d',
  font_family: 'Gilroy, Manrope, sans-serif',
};

const PIQUIM_DEFAULT_COMMERCE = {
  mode: 'hybrid',
  currency: 'ARS',
  address: 'Mar del Plata, Argentina',
  email: 'ventas@piquim.local',
};

async function resolveTeflonTenantBootstrapTarget() {
  const fallback = {
    id: TEFLON_TENANT_ID,
    name: 'Sanitarios El Teflon',
    external_source: null,
    external_tenant_slug: null,
    domains: ['teflon.vase.ar'],
  };

  const tenantsRes = await pool.query(
    [
      'SELECT',
      't.id::text AS id,',
      't.name,',
      't.external_source,',
      't.external_tenant_slug,',
      "COALESCE(jsonb_agg(DISTINCT d.domain) FILTER (WHERE d.domain IS NOT NULL), '[]'::jsonb) AS domains",
      'FROM tenants t',
      'LEFT JOIN tenant_domains d ON d.tenant_id = t.id',
      'WHERE t.id = $1::uuid',
      "OR lower(coalesce(t.name, '')) LIKE '%teflon%'",
      "OR lower(coalesce(t.external_tenant_slug, '')) LIKE '%teflon%'",
      "OR lower(coalesce(d.domain, '')) LIKE '%teflon%'",
      'GROUP BY t.id, t.name, t.external_source, t.external_tenant_slug',
    ].join(' '),
    [TEFLON_TENANT_ID]
  );

  return selectTeflonBootstrapTargetTenant(tenantsRes.rows, TEFLON_TENANT_ID) || fallback;
}

async function ensureTeflonTenantBootstrap() {
  if (!UUID_PATTERN.test(TEFLON_TENANT_ID)) {
    console.warn(`Skipping Teflon bootstrap: TEFLON_TENANT_ID is not a valid UUID (${TEFLON_TENANT_ID}).`);
    return;
  }

  const bootstrapTarget = await resolveTeflonTenantBootstrapTarget();
  const teflonTenantId = String(bootstrapTarget?.id || TEFLON_TENANT_ID).trim();
  const isFallbackTenant = teflonTenantId === TEFLON_TENANT_ID;

  if (!UUID_PATTERN.test(teflonTenantId)) {
    console.warn(`Skipping Teflon bootstrap: resolved tenant is not a valid UUID (${teflonTenantId}).`);
    return;
  }

  if (!isFallbackTenant) {
    console.log(`Teflon bootstrap target resolved from Vase tenant: ${teflonTenantId}`);
  }

  if (isFallbackTenant) {
    await pool.query(
      [
        'INSERT INTO tenants (id, name, status)',
        "VALUES ($1::uuid, 'Sanitarios El Teflon', 'active')",
        'ON CONFLICT (id) DO UPDATE',
        "SET name = 'Sanitarios El Teflon', status = 'active'",
      ].join(' '),
      [teflonTenantId]
    );
  } else {
    await pool.query(
      "UPDATE tenants SET status = 'active' WHERE id = $1::uuid",
      [teflonTenantId]
    );
  }

  await pool.query(
    [
      'INSERT INTO tenant_settings (tenant_id, branding, theme, commerce)',
      'VALUES ($1::uuid, $2::jsonb, $3::jsonb, $4::jsonb)',
      'ON CONFLICT (tenant_id) DO UPDATE SET',
      "branding = CASE WHEN lower(coalesce(tenant_settings.branding->>'name', '')) LIKE '%piquim%'",
      "OR tenant_settings.branding->>'design_preset' = 'piquim'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%piquim%'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%heladeria%'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%panaderia%'",
      "OR lower(coalesce(tenant_settings.commerce::text, '')) LIKE '%piquim%'",
      'THEN EXCLUDED.branding ELSE tenant_settings.branding END,',
      "theme = CASE WHEN lower(coalesce(tenant_settings.branding->>'name', '')) LIKE '%piquim%'",
      "OR tenant_settings.branding->>'design_preset' = 'piquim'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%piquim%'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%heladeria%'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%panaderia%'",
      "OR lower(coalesce(tenant_settings.commerce::text, '')) LIKE '%piquim%'",
      'THEN EXCLUDED.theme ELSE tenant_settings.theme END,',
      "commerce = CASE WHEN lower(coalesce(tenant_settings.branding->>'name', '')) LIKE '%piquim%'",
      "OR tenant_settings.branding->>'design_preset' = 'piquim'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%piquim%'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%heladeria%'",
      "OR lower(coalesce(tenant_settings.branding::text, '')) LIKE '%panaderia%'",
      "OR lower(coalesce(tenant_settings.commerce::text, '')) LIKE '%piquim%'",
      'THEN EXCLUDED.commerce ELSE tenant_settings.commerce END,',
      'updated_at = now()',
    ].join(' '),
    [
      teflonTenantId,
      JSON.stringify(TEFLON_DEFAULT_BRANDING),
      JSON.stringify(TEFLON_DEFAULT_THEME),
      JSON.stringify(TEFLON_DEFAULT_COMMERCE),
    ]
  );

  const bootstrapDomains = [
    ['teflon.vase.ar', true],
    ['sanitarioselteflon.com', false],
    ['www.sanitarioselteflon.com', false],
  ];
  if (isFallbackTenant) {
    bootstrapDomains.unshift(['localhost', true]);
  }

  for (const [domain, isPrimary] of bootstrapDomains) {
    await pool.query(
      [
        'INSERT INTO tenant_domains (tenant_id, domain, is_primary)',
        'VALUES ($1::uuid, $2, $3)',
        'ON CONFLICT (domain) DO UPDATE',
        'SET tenant_id = EXCLUDED.tenant_id, is_primary = EXCLUDED.is_primary',
        'WHERE tenant_domains.tenant_id = EXCLUDED.tenant_id',
        'OR tenant_domains.tenant_id = $4::uuid',
      ].join(' '),
      [teflonTenantId, domain, isPrimary, TEFLON_TENANT_ID]
    );
  }

  await pool.query(
    [
      'UPDATE tenant_domains',
      "SET is_primary = CASE WHEN domain = 'teflon.vase.ar' THEN true ELSE false END",
      'WHERE tenant_id = $1::uuid',
      "AND domain ~ '^teflon(-[0-9]+)?\\.vase\\.ar$'",
    ].join(' '),
    [teflonTenantId]
  );

  await pool.query(
    [
      'WITH seed AS (SELECT $1::uuid AS tenant_id)',
      'INSERT INTO categories (tenant_id, name, slug, data)',
      "SELECT tenant_id, 'Griferia', 'griferia', '{}'::jsonb FROM seed",
      'UNION ALL',
      "SELECT tenant_id, 'Sanitarios', 'sanitarios', '{}'::jsonb FROM seed",
      'UNION ALL',
      "SELECT tenant_id, 'Accesorios', 'accesorios', '{}'::jsonb FROM seed",
      'UNION ALL',
      "SELECT tenant_id, 'Repuestos', 'repuestos', '{}'::jsonb FROM seed",
      'ON CONFLICT (tenant_id, slug) DO UPDATE',
      'SET name = EXCLUDED.name',
    ].join(' '),
    [teflonTenantId]
  );

  await pool.query(
    [
      'WITH seed AS (SELECT $1::uuid AS tenant_id)',
      'INSERT INTO pages (tenant_id, slug)',
      "SELECT tenant_id, 'home' FROM seed",
      'UNION ALL',
      "SELECT tenant_id, 'about' FROM seed",
      'ON CONFLICT (tenant_id, slug) DO NOTHING',
    ].join(' '),
    [teflonTenantId]
  );

  await pool.query(
    [
      'DELETE FROM page_sections ps',
      'USING pages p',
      'WHERE ps.page_id = p.id',
      'AND p.tenant_id = $1::uuid',
      "AND ps.type LIKE 'Piquim%'",
    ].join(' '),
    [teflonTenantId]
  );

  await pool.query(
    [
      'DELETE FROM product_cache',
      'WHERE tenant_id = $1::uuid',
      'AND (',
      "upper(coalesce(brand, '')) = 'PIQUIM'",
      "OR coalesce(data->>'image', '') LIKE '/piquim/%'",
      "OR sku = 'PROD-001'",
      "OR name ILIKE '%helado%'",
      ')',
    ].join(' '),
    [teflonTenantId]
  );

  await pool.query(
    [
      'DELETE FROM categories',
      'WHERE tenant_id = $1::uuid',
      "AND slug IN ('heladeria', 'panaderia', 'confiteria')",
    ].join(' '),
    [teflonTenantId]
  );
}

async function ensurePiquimTenantBootstrap() {
  if (!PIQUIM_TENANT_ID) return;

  if (!UUID_PATTERN.test(PIQUIM_TENANT_ID)) {
    console.warn(`Skipping Piquim bootstrap: PIQUIM_TENANT_ID is not a valid UUID (${PIQUIM_TENANT_ID}).`);
    return;
  }

  await pool.query(
    [
      'INSERT INTO tenants (id, name, status)',
      "VALUES ($1::uuid, 'PIQUIM', 'active')",
      'ON CONFLICT (id) DO NOTHING',
    ].join(' '),
    [PIQUIM_TENANT_ID]
  );

  await pool.query(
    [
      'INSERT INTO tenant_settings (tenant_id, branding, theme, commerce)',
      'VALUES ($1::uuid, $2::jsonb, $3::jsonb, $4::jsonb)',
      'ON CONFLICT (tenant_id) DO NOTHING',
    ].join(' '),
    [
      PIQUIM_TENANT_ID,
      JSON.stringify(PIQUIM_DEFAULT_BRANDING),
      JSON.stringify(PIQUIM_DEFAULT_THEME),
      JSON.stringify(PIQUIM_DEFAULT_COMMERCE),
    ]
  );

  await pool.query(
    [
      'WITH seed AS (',
      'SELECT $1::uuid AS tenant_id',
      '), roots AS (',
      'INSERT INTO categories (tenant_id, name, slug, data)',
      "SELECT tenant_id, 'Heladeria', 'heladeria', '{}'::jsonb FROM seed",
      'UNION ALL',
      "SELECT tenant_id, 'Panaderia/Confiteria', 'panaderia', '{}'::jsonb FROM seed",
      'ON CONFLICT (tenant_id, slug) DO UPDATE',
      'SET name = EXCLUDED.name, data = categories.data || EXCLUDED.data',
      'RETURNING id, tenant_id, slug',
      '), panaderia AS (',
      "SELECT id, tenant_id FROM roots WHERE slug = 'panaderia'",
      '), confiteria AS (',
      'SELECT c.id, c.tenant_id',
      'FROM categories c',
      'JOIN seed s ON s.tenant_id = c.tenant_id',
      "WHERE c.slug = 'confiteria'",
      '), moved_products AS (',
      'INSERT INTO product_categories (product_id, category_id)',
      'SELECT pc.product_id, p.id',
      'FROM product_categories pc',
      'JOIN confiteria c ON c.id = pc.category_id',
      'JOIN panaderia p ON p.tenant_id = c.tenant_id',
      'ON CONFLICT DO NOTHING',
      'RETURNING product_id',
      ')',
      'DELETE FROM categories c',
      'USING confiteria old_root',
      'WHERE c.id = old_root.id',
    ].join(' '),
    [PIQUIM_TENANT_ID]
  );
}

async function runStartupMigrations() {
  await pool.query(
    [
      'ALTER TABLE tenant_domains',
      'ADD COLUMN IF NOT EXISTS vercel_status text,',
      'ADD COLUMN IF NOT EXISTS vercel_payload jsonb,',
      'ADD COLUMN IF NOT EXISTS vercel_checked_at timestamptz,',
      'ADD COLUMN IF NOT EXISTS provisioning_status text,',
      'ADD COLUMN IF NOT EXISTS provisioning_payload jsonb,',
      'ADD COLUMN IF NOT EXISTS provisioning_checked_at timestamptz',
    ].join(' ')
  );

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

  await ensureVaseBridgeSchema();
  await ensureProductSyncSchema();
  await ensureTeflonTenantBootstrap();
  await ensurePiquimTenantBootstrap();
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
    await ensureUserProfileSchema();
    console.log('User profile schema ready');
  } catch (err) {
    console.error('DB bootstrap warning:', err?.message || err);
    throw err;
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
