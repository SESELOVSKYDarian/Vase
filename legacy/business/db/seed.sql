BEGIN;

WITH seed AS (
  SELECT
    '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id,
    'Sanitarios El Teflon'::text AS tenant_name,
    'localhost'::text AS domain,
    'admin@teflon.local'::text AS admin_email,
    '$2a$10$hE0tkmdmSK4yBrODZ6VsNeC.twjKZHiH6jcG4z79ysV17hwKo636a'::text AS password_hash
)
INSERT INTO tenants (id, name, status)
SELECT tenant_id, tenant_name, 'active'
FROM seed
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;

WITH seed AS (
  SELECT
    '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id,
    'localhost'::text AS domain
)
INSERT INTO tenant_domains (tenant_id, domain, is_primary)
SELECT tenant_id, domain, true
FROM seed
ON CONFLICT (domain) DO UPDATE
SET
  tenant_id = EXCLUDED.tenant_id,
  is_primary = EXCLUDED.is_primary;

WITH seed AS (
  SELECT
    '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO tenant_settings (tenant_id, branding, theme, commerce)
SELECT
  tenant_id,
  '{
    "name": "Sanitarios El Teflon",
    "logo_url": "",
    "navbar": {
      "links": [
        { "label": "Inicio", "href": "/" },
        { "label": "Catalogo", "href": "/catalog" }
      ]
    }
  }'::jsonb,
  '{
    "mode": "light",
    "primary": "#f97316",
    "accent": "#181411",
    "background": "#ffffff",
    "text": "#181411",
    "secondary": "#6b7280",
    "font_family": "Inter, sans-serif"
  }'::jsonb,
  '{
    "mode": "both",
    "currency": "ARS",
    "locale": "es-AR",
    "show_prices": true,
    "show_stock": true,
    "reviews_enabled": true,
    "tax_rate": 0.21,
    "whatsapp_number": "",
    "email": "",
    "order_notification_email": "",
    "payment_methods": ["transfer", "cash_on_pickup"],
    "default_delivery": "distance:auto",
    "shipping_zones": [
      {
        "id": "mdp-free",
        "name": "Entrega sin cargo",
        "description": "Hasta 5 km de la sucursal principal",
        "price": 0,
        "type": "distance",
        "branch_id": "branch-mdq",
        "min_distance_km": 0,
        "max_distance_km": 5,
        "enabled": true
      },
      {
        "id": "mdp-mid",
        "name": "Zona media",
        "description": "De 5 a 10 km desde la sucursal principal",
        "price": 3500,
        "type": "distance",
        "branch_id": "branch-mdq",
        "min_distance_km": 5,
        "max_distance_km": 10,
        "enabled": true
      },
      {
        "id": "mdp-extended",
        "name": "Zona extendida",
        "description": "De 10 a 20 km desde la sucursal principal",
        "price": 6500,
        "type": "distance",
        "branch_id": "branch-mdq",
        "min_distance_km": 10,
        "max_distance_km": 20,
        "enabled": true
      },
      {
        "id": "arg-general",
        "name": "Envio nacional",
        "description": "Cobertura nacional fuera del radio local",
        "price": 1500,
        "type": "flat",
        "enabled": true
      }
    ],
    "branches": [
      {
        "id": "branch-mdq",
        "name": "Sucursal principal",
        "address": "Av. Independencia 1234",
        "hours": "Lun a Sab 9:00-18:00",
        "phone": "",
        "pickup_fee": 0,
        "latitude": -38.00548,
        "longitude": -57.54261,
        "enabled": true
      }
    ],
    "bank_transfer": {
      "cbu": "",
      "alias": "",
      "bank": "",
      "holder": ""
    }
  }'::jsonb
FROM seed
ON CONFLICT (tenant_id) DO UPDATE
SET
  branding = EXCLUDED.branding,
  theme = EXCLUDED.theme,
  commerce = EXCLUDED.commerce,
  updated_at = now();

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO price_lists (tenant_id, name, type, rules_json)
SELECT tenant_id, 'Retail', 'retail', '{}'::jsonb FROM seed
ON CONFLICT (tenant_id, name) DO UPDATE
SET
  type = EXCLUDED.type,
  rules_json = EXCLUDED.rules_json;

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO price_lists (tenant_id, name, type, rules_json)
SELECT tenant_id, 'Mayorista', 'wholesale', '{}'::jsonb FROM seed
ON CONFLICT (tenant_id, name) DO UPDATE
SET
  type = EXCLUDED.type,
  rules_json = EXCLUDED.rules_json;

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO price_lists (tenant_id, name, type, rules_json)
SELECT tenant_id, 'Especial', 'special', '{}'::jsonb FROM seed
ON CONFLICT (tenant_id, name) DO UPDATE
SET
  type = EXCLUDED.type,
  rules_json = EXCLUDED.rules_json;

WITH seed AS (
  SELECT
    'admin@teflon.local'::text AS admin_email,
    '$2a$10$hE0tkmdmSK4yBrODZ6VsNeC.twjKZHiH6jcG4z79ysV17hwKo636a'::text AS password_hash
)
INSERT INTO users (email, password_hash, role, status)
SELECT admin_email, password_hash, 'tenant_admin', 'active'
FROM seed
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

WITH seed AS (
  SELECT
    '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id,
    'admin@teflon.local'::text AS admin_email
),
admin_user AS (
  SELECT id
  FROM users
  WHERE email = (SELECT admin_email FROM seed)
)
INSERT INTO user_tenants (user_id, tenant_id, role, status)
SELECT admin_user.id, seed.tenant_id, 'tenant_admin', 'active'
FROM admin_user, seed
ON CONFLICT (user_id, tenant_id) DO UPDATE
SET
  role = EXCLUDED.role,
  status = EXCLUDED.status;

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO api_tokens (tenant_id, name, token_hash, scope)
SELECT tenant_id, 'ERP Sync Local', 'erp-sync-local-001', 'products:sync'
FROM seed
WHERE NOT EXISTS (
  SELECT 1
  FROM api_tokens
  WHERE tenant_id = (SELECT tenant_id FROM seed)
    AND token_hash = 'erp-sync-local-001'
);

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO categories (tenant_id, name, slug, data)
SELECT tenant_id, 'Productos', 'productos', '{}'::jsonb
FROM seed
ON CONFLICT (tenant_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  data = EXCLUDED.data;

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO pages (tenant_id, slug)
SELECT tenant_id, 'home'
FROM seed
ON CONFLICT (tenant_id, slug) DO UPDATE
SET
  updated_at = now();

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO pages (tenant_id, slug)
SELECT tenant_id, 'about'
FROM seed
ON CONFLICT (tenant_id, slug) DO UPDATE
SET
  updated_at = now();

WITH home_page AS (
  SELECT id
  FROM pages
  WHERE tenant_id = '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid
    AND slug = 'home'
)
DELETE FROM page_sections
WHERE page_id = (SELECT id FROM home_page);

WITH home_page AS (
  SELECT id
  FROM pages
  WHERE tenant_id = '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid
    AND slug = 'home'
)
INSERT INTO page_sections (page_id, state, type, enabled, sort_order, props)
SELECT id, 'published', 'HeroSlider', true, 1, '{}'::jsonb FROM home_page
UNION ALL
SELECT id, 'published', 'BrandMarquee', true, 2, '{}'::jsonb FROM home_page
UNION ALL
SELECT id, 'published', 'FeaturedProducts', true, 3, '{}'::jsonb FROM home_page
UNION ALL
SELECT id, 'published', 'Services', true, 4, '{}'::jsonb FROM home_page
UNION ALL
SELECT id, 'draft', 'HeroSlider', true, 1, '{}'::jsonb FROM home_page
UNION ALL
SELECT id, 'draft', 'BrandMarquee', true, 2, '{}'::jsonb FROM home_page
UNION ALL
SELECT id, 'draft', 'FeaturedProducts', true, 3, '{}'::jsonb FROM home_page
UNION ALL
SELECT id, 'draft', 'Services', true, 4, '{}'::jsonb FROM home_page;

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO product_cache (
  tenant_id,
  erp_id,
  sku,
  name,
  description,
  price,
  price_wholesale,
  currency,
  stock,
  brand,
  status
)
SELECT
  tenant_id,
  'ERP-001',
  'PROD-001',
  'Producto demo',
  'Producto inicial para validar la tienda y el panel.',
  15000.00,
  12000.00,
  'ARS',
  50,
  'Marca Demo',
  'active'
FROM seed
ON CONFLICT (tenant_id, erp_id) DO UPDATE
SET
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_wholesale = EXCLUDED.price_wholesale,
  currency = EXCLUDED.currency,
  stock = EXCLUDED.stock,
  brand = EXCLUDED.brand,
  status = EXCLUDED.status,
  updated_at = now();

WITH product_ref AS (
  SELECT id, tenant_id
  FROM product_cache
  WHERE tenant_id = '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid
    AND erp_id = 'ERP-001'
),
category_ref AS (
  SELECT id
  FROM categories
  WHERE tenant_id = '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid
    AND slug = 'productos'
)
INSERT INTO product_categories (product_id, category_id)
SELECT product_ref.id, category_ref.id
FROM product_ref, category_ref
ON CONFLICT (product_id, category_id) DO NOTHING;

WITH product_ref AS (
  SELECT id
  FROM product_cache
  WHERE tenant_id = '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid
    AND erp_id = 'ERP-001'
)
INSERT INTO product_overrides (tenant_id, product_id, hidden, featured, sort_order)
SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid, id, false, true, 0
FROM product_ref
ON CONFLICT (tenant_id, product_id) DO UPDATE
SET
  hidden = EXCLUDED.hidden,
  featured = EXCLUDED.featured,
  sort_order = EXCLUDED.sort_order;

COMMIT;
