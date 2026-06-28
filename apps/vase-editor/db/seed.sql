BEGIN;

WITH seed AS (
  SELECT
    '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id,
    'Sanitarios El Teflon'::text AS tenant_name,
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
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
),
domains AS (
  SELECT tenant_id, 'localhost'::text AS domain, true AS is_primary FROM seed
  UNION ALL
  SELECT tenant_id, 'teflon.vase.ar', true FROM seed
  UNION ALL
  SELECT tenant_id, 'sanitarioselteflon.com', false FROM seed
  UNION ALL
  SELECT tenant_id, 'www.sanitarioselteflon.com', false FROM seed
)
INSERT INTO tenant_domains (tenant_id, domain, is_primary)
SELECT tenant_id, domain, is_primary
FROM domains
ON CONFLICT (domain) DO UPDATE
SET
  tenant_id = EXCLUDED.tenant_id,
  is_primary = EXCLUDED.is_primary;

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO tenant_settings (tenant_id, branding, theme, commerce)
SELECT
  tenant_id,
  '{
    "name": "Sanitarios El Teflon",
    "logo_url": "",
    "design_preset": "sanitarios_industrial",
    "navbar": {
      "links": [
        { "label": "Inicio", "href": "/" },
        { "label": "Catalogo", "href": "/catalog" },
        { "label": "Nosotros", "href": "/about" }
      ],
      "show_search": true,
      "show_wishlist": true,
      "show_cart": true,
      "show_account": true,
      "register_label": "Registrarse",
      "register_href": "/register"
    },
    "footer": {
      "description": "Griferia, sanitarios, accesorios y materiales con asesoramiento para cada obra o renovacion.",
      "quickLinks": [
        { "label": "Catalogo", "href": "/catalog" },
        { "label": "Nosotros", "href": "/about" }
      ],
      "shopLinks": [
        { "label": "Griferia", "href": "/catalog?category=griferia" },
        { "label": "Sanitarios", "href": "/catalog?category=sanitarios" },
        { "label": "Accesorios", "href": "/catalog?category=accesorios" }
      ],
      "helpLinks": [
        { "label": "Carrito", "href": "/cart" },
        { "label": "Terminos", "href": "/terms" }
      ],
      "legalLinks": [
        { "label": "Terminos y condiciones", "href": "/terms" }
      ],
      "newsletter": {
        "enabled": false,
        "title": "Novedades",
        "description": "",
        "placeholder": "tu@email.com",
        "buttonLabel": "Enviar"
      },
      "legalText": "(c) 2026 Sanitarios El Teflon. Todos los derechos reservados.",
      "contact": {
        "address": "Mar del Plata, Argentina",
        "phone": "",
        "email": ""
      },
      "socials": {
        "instagram": "",
        "facebook": "",
        "youtube": "",
        "tiktok": "",
        "whatsapp": ""
      }
    },
    "admin_panel": {
      "title": "Panel de administracion",
      "logo_url": ""
    },
    "catalog_cards": []
  }'::jsonb,
  '{
    "mode": "light",
    "primary": "#f97316",
    "accent": "#111827",
    "background": "#f8f7f4",
    "text": "#111827",
    "secondary": "#64748b",
    "font_family": "Inter, Manrope, sans-serif",
    "catalog": {
      "panel_bg": "#f1f5f9",
      "surface_bg": "#ffffff",
      "card_bg": "#ffffff",
      "border": "#dbe2ea",
      "muted_text": "#64748b"
    },
    "admin_panel": {
      "mode": "light",
      "accent": "#111111",
      "shell_bg": "#e7edf4",
      "sidebar_bg": "#f8fafc",
      "panel_bg": "#ffffff",
      "canvas_bg": "#eef3f8",
      "text": "#0f172a",
      "muted_text": "#475569"
    }
  }'::jsonb,
  '{
    "mode": "hybrid",
    "currency": "ARS",
    "locale": "es-AR",
    "show_prices": true,
    "show_stock": true,
    "reviews_enabled": true,
    "tax_rate": 0.21,
    "whatsapp_number": "",
    "address": "Mar del Plata, Argentina",
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
        "id": "arg-general",
        "name": "Envio nacional",
        "description": "Cobertura general fuera del radio local",
        "price": 1500,
        "type": "flat",
        "enabled": true
      }
    ],
    "branches": [
      {
        "id": "branch-mdq",
        "name": "Sucursal Mar del Plata",
        "address": "Av. Independencia 1234, Mar del Plata",
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
DELETE FROM page_sections ps
USING pages p, seed
WHERE ps.page_id = p.id
  AND p.tenant_id = seed.tenant_id
  AND ps.type LIKE 'Piquim%';

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
DELETE FROM product_cache
USING seed
WHERE product_cache.tenant_id = seed.tenant_id
  AND (
    upper(coalesce(product_cache.brand, '')) = 'PIQUIM'
    OR coalesce(product_cache.data->>'image', '') LIKE '/piquim/%'
    OR product_cache.sku = 'PROD-001'
    OR product_cache.name ILIKE '%helado%'
  );

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
DELETE FROM categories
USING seed
WHERE categories.tenant_id = seed.tenant_id
  AND categories.slug IN ('heladeria', 'panaderia', 'confiteria');

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
),
price_seed AS (
  SELECT tenant_id, 'Retail'::text AS name, 'retail'::text AS type FROM seed
  UNION ALL
  SELECT tenant_id, 'Mayorista', 'wholesale' FROM seed
  UNION ALL
  SELECT tenant_id, 'Especial', 'special' FROM seed
)
INSERT INTO price_lists (tenant_id, name, type, rules_json)
SELECT tenant_id, name, type, '{}'::jsonb
FROM price_seed
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
),
category_seed AS (
  SELECT tenant_id, 'Griferia'::text AS name, 'griferia'::text AS slug FROM seed
  UNION ALL
  SELECT tenant_id, 'Sanitarios', 'sanitarios' FROM seed
  UNION ALL
  SELECT tenant_id, 'Accesorios', 'accesorios' FROM seed
  UNION ALL
  SELECT tenant_id, 'Repuestos', 'repuestos' FROM seed
)
INSERT INTO categories (tenant_id, name, slug, data)
SELECT tenant_id, name, slug, '{}'::jsonb
FROM category_seed
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
UNION ALL
SELECT tenant_id, 'about'
FROM seed
ON CONFLICT (tenant_id, slug) DO UPDATE
SET
  updated_at = now();

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
  status,
  data
)
SELECT
  tenant_id,
  'ERP-001',
  'SAN-001',
  'Griferia monocomando cromada',
  'Producto de muestra para validar catalogo y productos destacados.',
  85000.00,
  76000.00,
  'ARS',
  12,
  'Sanitarios El Teflon',
  'active',
  '{
    "short_description": "Griferia cromada para bano o cocina.",
    "image": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop"
  }'::jsonb
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
  data = EXCLUDED.data,
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
    AND slug = 'griferia'
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
