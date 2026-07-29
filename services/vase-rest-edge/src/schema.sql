CREATE TABLE IF NOT EXISTS edge_identity (
  id TEXT PRIMARY KEY CHECK (id = 'current'),
  global_tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  certificate_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  enrolled_at TEXT NOT NULL,
  projection_revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS staff_projection (
  staff_id TEXT PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  roles_json TEXT NOT NULL,
  active INTEGER NOT NULL,
  projection_revision INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_session (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (staff_id) REFERENCES staff_projection(staff_id)
);

CREATE TABLE IF NOT EXISTS aggregate_state (
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (aggregate_type, aggregate_id)
);

CREATE TABLE IF NOT EXISTS local_event (
  event_id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  acknowledged_at TEXT,
  last_error TEXT,
  FOREIGN KEY (event_id) REFERENCES local_event(event_id)
);

CREATE TABLE IF NOT EXISTS config_projection (
  family TEXT NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  value_json TEXT NOT NULL,
  signature TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  PRIMARY KEY (family, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS print_job (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  printer_id TEXT NOT NULL,
  payload BLOB NOT NULL,
  state TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  printed_at TEXT,
  last_error TEXT
);
