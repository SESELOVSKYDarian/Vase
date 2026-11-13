-- Additive only: borrador de ajustes que el panel guarda solo. La tienda no lo lee.
CREATE TABLE IF NOT EXISTS tenant_editor_drafts (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
