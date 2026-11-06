CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  evolution_name text NOT NULL UNIQUE,
  label text NOT NULL,
  phone_number text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_instances_tenant_active_idx
  ON whatsapp_instances(tenant_id, active);

CREATE TABLE IF NOT EXISTS whatsapp_agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  tone text NOT NULL DEFAULT 'amable y profesional',
  greeting text,
  business_context text,
  instructions text,
  booking_instructions text,
  handoff_message text,
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES whatsapp_instances(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  remote_jid text NOT NULL,
  phone_number text NOT NULL,
  display_name text,
  client_name_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  handling_mode text NOT NULL DEFAULT 'bot' CHECK (handling_mode IN ('bot', 'human')),
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  handoff_reason text,
  last_message_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_conversations_instance_remote_unique UNIQUE (instance_id, remote_jid)
);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_tenant_activity_idx
  ON whatsapp_conversations(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_tenant_client_idx
  ON whatsapp_conversations(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_tenant_assignment_idx
  ON whatsapp_conversations(tenant_id, handling_mode, assigned_user_id);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES whatsapp_instances(id) ON DELETE RESTRICT,
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  author_type text NOT NULL CHECK (author_type IN ('client', 'agent', 'user', 'system')),
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  provider_message_id text,
  idempotency_key text,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  media_mime_type text,
  delivery_status text NOT NULL DEFAULT 'received' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'unknown', 'received')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  sent_at timestamp,
  CONSTRAINT whatsapp_messages_tenant_instance_provider_unique UNIQUE (tenant_id, instance_id, provider_message_id),
  CONSTRAINT whatsapp_messages_tenant_idempotency_unique UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_created_idx
  ON whatsapp_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS whatsapp_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  currency text NOT NULL DEFAULT 'COP',
  subtotal numeric(12, 2) NOT NULL,
  total numeric(12, 2) NOT NULL,
  item_snapshot jsonb NOT NULL,
  notes text,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  sent_message_id uuid REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  accepted_message_id uuid REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  sent_at timestamp,
  accepted_at timestamp,
  expires_at timestamp
);
CREATE INDEX IF NOT EXISTS whatsapp_quotes_tenant_conversation_idx
  ON whatsapp_quotes(tenant_id, conversation_id, created_at DESC);

-- Idempotent appointment creation after a WhatsApp quote is explicitly accepted.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_whatsapp_quote_external_unique
  ON appointments(tenant_id, external_id)
  WHERE external_id LIKE 'whatsapp_quote:%';
