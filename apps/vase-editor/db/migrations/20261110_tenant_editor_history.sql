-- Additive only: últimos puntos del diseño para volver atrás (el servidor guarda hasta 10 por tienda).
CREATE TABLE IF NOT EXISTS tenant_editor_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  pages jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_editor_history_tenant_idx ON tenant_editor_history (tenant_id, created_at DESC);
