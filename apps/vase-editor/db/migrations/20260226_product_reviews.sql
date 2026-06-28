CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product_cache(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_reviews_tenant_product_idx
  ON product_reviews(tenant_id, product_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS product_reviews_user_idx
  ON product_reviews(user_id, created_at DESC);
