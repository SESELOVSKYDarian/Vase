WITH seed AS (
  SELECT '636736e2-e135-44cd-ac5c-5d4ccb839a73'::uuid AS tenant_id
),
panaderia AS (
  INSERT INTO categories (tenant_id, name, slug, data)
  SELECT tenant_id, 'Panaderia/Confiteria', 'panaderia', '{}'::jsonb
  FROM seed
  ON CONFLICT (tenant_id, slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    data = categories.data || EXCLUDED.data
  RETURNING id, tenant_id
),
confiteria AS (
  SELECT c.id, c.tenant_id
  FROM categories c
  JOIN seed s ON s.tenant_id = c.tenant_id
  WHERE c.slug = 'confiteria'
),
moved_products AS (
  INSERT INTO product_categories (product_id, category_id)
  SELECT pc.product_id, p.id
  FROM product_categories pc
  JOIN confiteria c ON c.id = pc.category_id
  JOIN panaderia p ON p.tenant_id = c.tenant_id
  ON CONFLICT DO NOTHING
  RETURNING product_id
)
DELETE FROM categories c
USING confiteria old_root
WHERE c.id = old_root.id;
