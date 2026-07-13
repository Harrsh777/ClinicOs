-- ClinicOS Conversations — Phase 0 foundation
-- whatsapp_connections vault, conversations inbox, messages

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE whatsapp_connection_status AS ENUM (
    'pending', 'connected', 'disconnected', 'token_expired', 'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_channel AS ENUM (
    'whatsapp', 'web_chat', 'sms', 'instagram'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM (
    'open', 'pending', 'resolved', 'snoozed', 'needs_human', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_priority AS ENUM (
    'low', 'normal', 'high', 'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM (
    'inbound', 'outbound', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE message_sender_type AS ENUM (
    'patient', 'staff', 'ai', 'system', 'campaign'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE conversation_message_status AS ENUM (
    'queued', 'sent', 'delivered', 'read', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- OAuth state (CSRF for Embedded Signup)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_oauth_states_expires
  ON public.whatsapp_oauth_states(expires_at)
  WHERE used_at IS NULL;

-- ---------------------------------------------------------------------------
-- WhatsApp connections (encrypted credential vault)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT NOT NULL,
  business_name TEXT,
  access_token_encrypted BYTEA NOT NULL,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_encrypted BYTEA,
  connection_status whatsapp_connection_status NOT NULL DEFAULT 'pending',
  quality_rating TEXT,
  messaging_limit_tier TEXT,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  connected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  meta_business_id TEXT,
  webhook_subscribed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_active
  ON public.whatsapp_connections(phone_number_id)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_clinic_active
  ON public.whatsapp_connections(clinic_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_clinic_status
  ON public.whatsapp_connections(clinic_id, connection_status);

-- Safe view — no encrypted tokens
CREATE OR REPLACE VIEW public.whatsapp_connections_safe AS
SELECT
  id,
  clinic_id,
  waba_id,
  phone_number_id,
  display_phone_number,
  business_name,
  connection_status,
  quality_rating,
  messaging_limit_tier,
  connected_at,
  disconnected_at,
  connected_by,
  meta_business_id,
  webhook_subscribed,
  is_active,
  metadata,
  created_at,
  updated_at
FROM public.whatsapp_connections;

-- ---------------------------------------------------------------------------
-- Conversations (inbox threads)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  channel conversation_channel NOT NULL DEFAULT 'whatsapp',
  channel_identifier TEXT NOT NULL,
  patient_name TEXT NOT NULL DEFAULT 'Unknown',
  patient_phone TEXT,
  status conversation_status NOT NULL DEFAULT 'open',
  priority conversation_priority NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction message_direction,
  unread_count INT NOT NULL DEFAULT 0,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  session_expires_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, channel, channel_identifier)
);

CREATE INDEX IF NOT EXISTS idx_conversations_inbox
  ON public.conversations(clinic_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_status
  ON public.conversations(clinic_id, status, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_unread
  ON public.conversations(clinic_id)
  WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_conversations_patient
  ON public.conversations(patient_id)
  WHERE patient_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  direction message_direction NOT NULL,
  sender_type message_sender_type NOT NULL,
  sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  status conversation_message_status NOT NULL DEFAULT 'queued',
  external_message_id TEXT,
  intent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_thread
  ON public.conversation_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_external
  ON public.conversation_messages(external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_clinic
  ON public.conversation_messages(clinic_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.whatsapp_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- OAuth states: service role only (no authenticated policies)

-- Connections: staff read safe view only via whatsapp_connections_safe
CREATE POLICY whatsapp_connections_safe_read ON public.whatsapp_connections
  FOR SELECT TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY conversations_clinic ON public.conversations
  FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY conversation_messages_clinic ON public.conversation_messages
  FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- System module
-- ---------------------------------------------------------------------------

INSERT INTO public.system_modules (key, name, description, icon, route_path, sort_order)
VALUES (
  'conversations',
  'Conversations',
  'WhatsApp inbox, patient messaging, and campaigns',
  'MessageSquare',
  '/conversations',
  45
)
ON CONFLICT (key) DO NOTHING;

-- Enable for all existing clinics
INSERT INTO public.clinic_modules (clinic_id, module_key, enabled)
SELECT c.id, 'conversations', true
FROM public.clinics c
ON CONFLICT (clinic_id, module_key) DO NOTHING;
