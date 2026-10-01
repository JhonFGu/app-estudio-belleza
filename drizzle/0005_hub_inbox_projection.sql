CREATE TABLE IF NOT EXISTS hub_tenant_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  hub_tenant_id text NOT NULL UNIQUE,
  event_secret_ciphertext text NOT NULL,
  hub_api_credential_ciphertext text,
  previous_event_secret_ciphertext text,
  previous_secret_valid_until timestamp,
  active boolean NOT NULL DEFAULT true,
  activated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hub_integrations_hub_tenant_idx ON hub_tenant_integrations(hub_tenant_id);

CREATE TABLE IF NOT EXISTS hub_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES hub_tenant_integrations(id) ON DELETE CASCADE,
  hub_conversation_id text NOT NULL,
  hub_contact_id text,
  takeover_id text,
  assigned_to text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  contact_name text,
  contact_phone text,
  status text NOT NULL DEFAULT 'bot_active',
  handling_mode text NOT NULL DEFAULT 'bot',
  last_message_at timestamp,
  hub_sequence integer,
  deleted_at timestamp,
  retention_expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT hub_conversations_tenant_external_unique UNIQUE (tenant_id, hub_conversation_id)
);
CREATE INDEX IF NOT EXISTS hub_conversations_tenant_last_message_idx ON hub_conversations(tenant_id, last_message_at);

CREATE TABLE IF NOT EXISTS hub_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES hub_conversations(id) ON DELETE CASCADE,
  hub_message_id text NOT NULL,
  direction text NOT NULL,
  author_type text NOT NULL,
  author_id text,
  provider_message_id text,
  content text,
  delivery_status text NOT NULL DEFAULT 'accepted',
  created_at_hub timestamp NOT NULL,
  delivered_at timestamp,
  hub_sequence integer,
  redacted_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT hub_messages_tenant_external_unique UNIQUE (tenant_id, hub_message_id)
);
CREATE INDEX IF NOT EXISTS hub_messages_conversation_created_idx ON hub_conversation_messages(conversation_id, created_at_hub);

CREATE TABLE IF NOT EXISTS hub_inbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  payload_hash text NOT NULL,
  event_type text NOT NULL,
  hub_message_id text,
  delivery_status text,
  hub_sequence integer,
  occurred_at timestamp NOT NULL,
  received_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp,
  dedupe_expires_at timestamp NOT NULL,
  CONSTRAINT hub_inbox_events_tenant_event_unique UNIQUE (tenant_id, event_id)
);
CREATE INDEX IF NOT EXISTS hub_inbox_events_dedupe_expiry_idx ON hub_inbox_events(dedupe_expires_at);
CREATE INDEX IF NOT EXISTS hub_inbox_events_message_state_idx ON hub_inbox_events(tenant_id, hub_message_id, hub_sequence);
