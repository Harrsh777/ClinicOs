-- =============================================================================
-- Phase 3: Production hardening — atomic IDs, idempotency, tenant sequences, RLS
-- =============================================================================

-- Per-tenant atomic sequence counters
CREATE TABLE IF NOT EXISTS public.tenant_sequences (
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  sequence_key TEXT NOT NULL,
  last_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, sequence_key)
);

CREATE OR REPLACE FUNCTION public.next_tenant_sequence(p_clinic_id UUID, p_key TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_val BIGINT;
BEGIN
  INSERT INTO public.tenant_sequences (clinic_id, sequence_key, last_value)
  VALUES (p_clinic_id, p_key, 1)
  ON CONFLICT (clinic_id, sequence_key)
  DO UPDATE SET
    last_value = public.tenant_sequences.last_value + 1,
    updated_at = now()
  RETURNING last_value INTO v_val;
  RETURN v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_patient_code(p_clinic_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'P' || lpad(public.next_tenant_sequence(p_clinic_id, 'patient')::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_appointment_number(p_clinic_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date TEXT := to_char(now(), 'YYMMDD');
  v_seq BIGINT;
BEGIN
  v_seq := public.next_tenant_sequence(p_clinic_id, 'appointment_' || v_date);
  RETURN 'APT-' || v_date || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- Global booking sequence (platform-level)
CREATE TABLE IF NOT EXISTS public.platform_sequences (
  sequence_key TEXT PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.next_platform_sequence(p_key TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_val BIGINT;
BEGIN
  INSERT INTO public.platform_sequences (sequence_key, last_value)
  VALUES (p_key, 1)
  ON CONFLICT (sequence_key)
  DO UPDATE SET last_value = public.platform_sequences.last_value + 1, updated_at = now()
  RETURNING last_value INTO v_val;
  RETURN v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_booking_id_atomic()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date TEXT := to_char(now(), 'YYMMDD');
  v_seq BIGINT;
BEGIN
  v_seq := public.next_platform_sequence('booking_' || v_date);
  RETURN 'BK-' || v_date || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- Payment hold expiry for online bookings
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_pending_expiry
  ON public.appointments (payment_expires_at)
  WHERE status = 'pending' AND payment_expires_at IS NOT NULL;

-- Idempotency keys for API deduplication
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  scope TEXT NOT NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  response_body JSONB,
  status_code INT NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  UNIQUE (idempotency_key, scope)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys (expires_at);

-- Processed webhook events (Razorpay etc.)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

-- Rate limit buckets (DB-backed for serverless)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hit_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON public.rate_limit_buckets (expires_at);

-- Atomic slot reservation: insert pending appointment or return conflict
CREATE OR REPLACE FUNCTION public.reserve_appointment_slot(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_doctor_id UUID,
  p_date DATE,
  p_time TIME,
  p_consultation_type public.consultation_type DEFAULT 'normal',
  p_payment_mode public.portal_payment_mode DEFAULT 'online',
  p_priority public.appointment_priority DEFAULT 'normal',
  p_apt_type public.appointment_type DEFAULT 'scheduled',
  p_hold_minutes INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_appointment_id UUID;
  v_appointment_number TEXT;
  v_expires TIMESTAMPTZ;
  v_status public.appointment_status;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_date
      AND appointment_time = p_time
      AND status NOT IN ('cancelled', 'rejected')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slot_taken');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.doctors
    WHERE id = p_doctor_id AND clinic_id = p_clinic_id AND is_accepting_appointments = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'doctor_unavailable');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clinics
    WHERE id = p_clinic_id AND status = 'active' AND portal_enabled = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'clinic_unavailable');
  END IF;

  v_appointment_number := public.generate_appointment_number(p_clinic_id);
  v_status := CASE WHEN p_payment_mode = 'at_clinic' THEN 'confirmed'::public.appointment_status ELSE 'pending'::public.appointment_status END;
  v_expires := CASE WHEN p_payment_mode = 'online' THEN now() + (p_hold_minutes || ' minutes')::interval ELSE NULL END;

  INSERT INTO public.appointments (
    clinic_id, patient_id, doctor_id, appointment_date, appointment_time,
    status, type, priority, consultation_type, appointment_number, payment_mode, payment_expires_at,
    notes
  ) VALUES (
    p_clinic_id, p_patient_id, p_doctor_id, p_date, p_time,
    v_status, p_apt_type, p_priority, p_consultation_type, v_appointment_number, p_payment_mode, v_expires,
    'Booked via public portal'
  )
  RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'ok', true,
    'appointment_id', v_appointment_id,
    'appointment_number', v_appointment_number,
    'payment_expires_at', v_expires
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slot_taken');
END;
$$;

-- Expire abandoned pending online bookings
CREATE OR REPLACE FUNCTION public.expire_stale_pending_bookings()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH expired AS (
    UPDATE public.appointments
    SET status = 'cancelled',
        notes = coalesce(notes, '') || ' [Auto-cancelled: payment timeout]'
    WHERE status = 'pending'
      AND payment_expires_at IS NOT NULL
      AND payment_expires_at < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

-- Audit log insert policy (service role bypasses; authenticated via SECURITY DEFINER helper)
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_clinic_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (clinic_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_clinic_id, p_actor_id, p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Tighten: appointments public slots — only time columns, not full rows
DROP POLICY IF EXISTS appointments_public_slots ON public.appointments;
CREATE POLICY appointments_public_slots ON public.appointments
  FOR SELECT TO anon
  USING (
    status NOT IN ('cancelled', 'rejected')
    AND clinic_id IN (SELECT id FROM public.clinics WHERE status = 'active' AND portal_enabled = true)
  );

-- RLS on tenant_sequences (service role only in practice)
ALTER TABLE public.tenant_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sequences ENABLE ROW LEVEL SECURITY;

-- Notification type index for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_type
  ON public.notifications (clinic_id, type, created_at DESC);

-- Unique payment gateway ref to prevent duplicate payment rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_ref_unique
  ON public.payments (gateway_ref)
  WHERE gateway_ref IS NOT NULL AND status = 'pending';

-- RLS on queue_daily_analytics (tenant isolation)
ALTER TABLE public.queue_daily_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS queue_daily_analytics_tenant ON public.queue_daily_analytics;
CREATE POLICY queue_daily_analytics_tenant ON public.queue_daily_analytics
  FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
