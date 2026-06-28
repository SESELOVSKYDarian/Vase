BEGIN;

WITH seed AS (
  SELECT
    '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id,
    'PIQUIM'::text AS tenant_name
)
INSERT INTO tenants (id, name, status)
SELECT tenant_id, tenant_name, 'active'
FROM seed
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;

INSERT INTO tenant_settings (tenant_id, branding, theme, commerce)
VALUES (
  '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid,
  '{
    "name": "PIQUIM",
    "logo_url": "",
    "design_preset": "piquim",
    "navbar": {
      "links": [
        { "label": "Inicio", "href": "/" },
        { "label": "Catalogo", "href": "/catalog" },
        { "label": "Nosotros", "href": "/about" }
      ]
    },
    "catalog_cards": [
      { "id": "heladeria", "title": "Heladeria", "prefix": "01 - Frio que enamora", "description": "Materia prima para la elaboracion de helados artesanales, bases estables y terminaciones con sabor propio.", "tags": ["Pulpas", "Variegattos", "Bases", "Neutros"], "image": "/piquim/catalog-heladeria.jpg", "category": "Heladeria" },
      { "id": "panaderia", "title": "Panaderia/Confiteria", "prefix": "02 - Hornear y decorar", "description": "Premezclas, mejoradores, cremas y bases para panaderia, reposteria y confiteria profesional.", "tags": ["Premezclas", "Mejoradores", "Cremas", "DDL"], "image": "/piquim/catalog-panaderia.jpg", "category": "Panaderia" }
    ],
    "footer": {
      "description": "Materia prima premium para heladerias, panaderias y confiterias. Mar del Plata, desde 1992.",
      "quickLinks": [
        { "label": "Catalogo", "href": "/catalog" },
        { "label": "Nosotros", "href": "/about" }
      ],
      "shopLinks": [
        { "label": "Heladeria", "href": "/catalog?category=Heladeria" },
        { "label": "Panaderia/Confiteria", "href": "/catalog?category=panaderia" },
        { "label": "Promociones", "href": "/catalog" }
      ],
      "helpLinks": [
        { "label": "Envios y entregas", "href": "/about" },
        { "label": "Pagos y facturacion", "href": "/checkout" },
        { "label": "Cambios y devoluciones", "href": "/about" },
        { "label": "Preguntas frecuentes", "href": "/about" }
      ],
      "legalLinks": [
        { "label": "Terminos", "href": "/terms" },
        { "label": "Privacidad", "href": "/privacy" },
        { "label": "Cookies", "href": "/privacy" },
        { "label": "Defensa al consumidor", "href": "/about" }
      ],
      "newsletter": {
        "enabled": true,
        "title": "Novedades para profesionales",
        "description": "Recibi lanzamientos, promociones y catalogos tecnicos en tu correo.",
        "placeholder": "tu@email.com",
        "buttonLabel": "Suscribirme"
      },
      "legalText": "(c) 2026 Piquim Profesional S.A. - Mar del Plata, Argentina - CUIT 30-XXXXXXXX-X",
      "contact": {
        "address": "Mar del Plata, Argentina",
        "phone": "",
        "email": "ventas@piquim.local"
      },
      "socials": {
        "instagram": "",
        "facebook": "",
        "youtube": "",
        "tiktok": "",
        "whatsapp": ""
      }
    }
  }'::jsonb,
  '{
    "mode": "light",
    "primary": "#ff4d00",
    "accent": "#ff7a2f",
    "background": "#fffaf6",
    "text": "#1a1614",
    "secondary": "#6f625d",
    "font_family": "Gilroy, Manrope, sans-serif",
    "catalog": {
      "panel_bg": "#fff3eb",
      "surface_bg": "#fffaf6",
      "card_bg": "#ffffff",
      "border": "#dab6a6",
      "muted_text": "#7b665d"
    }
  }'::jsonb,
  '{
    "address": "Mar del Plata, Argentina",
    "email": "ventas@piquim.local"
  }'::jsonb
)
ON CONFLICT (tenant_id) DO UPDATE
SET
  branding = coalesce(tenant_settings.branding, '{}'::jsonb) || EXCLUDED.branding,
  theme = coalesce(tenant_settings.theme, '{}'::jsonb) || EXCLUDED.theme,
  commerce = coalesce(tenant_settings.commerce, '{}'::jsonb) || EXCLUDED.commerce,
  updated_at = now();

WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
)
INSERT INTO categories (tenant_id, name, slug, data)
SELECT tenant_id, 'Heladeria', 'heladeria', '{}'::jsonb FROM seed
UNION ALL
SELECT tenant_id, 'Panaderia/Confiteria', 'panaderia', '{}'::jsonb FROM seed
ON CONFLICT (tenant_id, slug) DO UPDATE
SET
  name = EXCLUDED.name,
  data = EXCLUDED.data;

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
VALUES (
  '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid,
  'ERP-001',
  'PROD-001',
  'Base neutra para helado artesanal',
  'Materia prima profesional para heladerias que necesitan textura estable, buen rendimiento y sabor limpio.',
  15000.00,
  12000.00,
  'ARS',
  50,
  'PIQUIM',
  'active',
  '{
    "short_description": "Base profesional para elaboracion de helados artesanales.",
    "image": "/piquim/product-bucket.png"
  }'::jsonb
)
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
    AND slug = 'heladeria'
)
INSERT INTO product_categories (product_id, category_id)
SELECT product_ref.id, category_ref.id
FROM product_ref, category_ref
ON CONFLICT (product_id, category_id) DO NOTHING;

COMMIT;
