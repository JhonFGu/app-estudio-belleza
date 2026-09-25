CREATE TABLE IF NOT EXISTS integration_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamp,
  expires_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_keys_tenant_idx ON integration_api_keys(tenant_id);
CREATE TABLE IF NOT EXISTS integration_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  request_hash text NOT NULL,
  status_code integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT integration_idempotency_tenant_key UNIQUE (tenant_id, key)
);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS external_id text;
CREATE INDEX IF NOT EXISTS appointments_external_idx ON appointments(tenant_id, external_id);
