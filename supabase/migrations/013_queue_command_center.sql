-- Queue Command Center: full patient journey timestamps, analytics, offline status

DO $$ BEGIN
  ALTER TYPE doctor_queue_status ADD VALUE IF NOT EXISTS 'offline';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE queue_patient_type AS ENUM ('new', 'returning', 'emergency', 'vip', 'walk_in');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE queue_journey_stage AS ENUM (
    'appointment_booked',
    'checked_in',
    'waiting',
    'called',
    'entered_room',
    'consultation_started',
    'consultation_paused',
    'consultation_completed',
    'billing',
    'billing_completed',
    'exited',
    'no_show',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE queue_tokens
  ADD COLUMN IF NOT EXISTS appointment_booked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entered_room_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS left_clinic_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS patient_type queue_patient_type DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS journey_stage queue_journey_stage DEFAULT 'appointment_booked',
  ADD COLUMN IF NOT EXISTS is_returning_patient BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_wait_mins INT,
  ADD COLUMN IF NOT EXISTS consultation_duration_mins INT;

-- Backfill timestamps from existing columns
UPDATE queue_tokens SET
  appointment_booked_at = COALESCE(appointment_booked_at, created_at),
  consultation_started_at = COALESCE(consultation_started_at, serving_at),
  consultation_completed_at = COALESCE(consultation_completed_at, completed_at),
  status_updated_at = COALESCE(status_updated_at, created_at),
  updated_at = COALESCE(updated_at, created_at)
WHERE appointment_booked_at IS NULL OR status_updated_at IS NULL;

UPDATE queue_tokens SET journey_stage = CASE
  WHEN status = 'cancelled' THEN 'cancelled'::queue_journey_stage
  WHEN status = 'no_show' THEN 'no_show'::queue_journey_stage
  WHEN status = 'completed' AND billing_completed_at IS NOT NULL THEN 'billing_completed'::queue_journey_stage
  WHEN status = 'completed' AND billing_started_at IS NOT NULL THEN 'billing'::queue_journey_stage
  WHEN status = 'completed' THEN 'consultation_completed'::queue_journey_stage
  WHEN status = 'serving' THEN 'consultation_started'::queue_journey_stage
  WHEN status = 'called' THEN 'called'::queue_journey_stage
  WHEN checked_in_at IS NOT NULL THEN 'waiting'::queue_journey_stage
  ELSE 'appointment_booked'::queue_journey_stage
END
WHERE journey_stage = 'appointment_booked';

UPDATE queue_tokens SET patient_type = CASE
  WHEN priority = 'emergency' OR token_series = 'emergency' THEN 'emergency'::queue_patient_type
  WHEN priority = 'vip' OR token_series = 'vip' THEN 'vip'::queue_patient_type
  WHEN is_returning_patient THEN 'returning'::queue_patient_type
  ELSE 'new'::queue_patient_type
END
WHERE patient_type = 'new';

CREATE TABLE IF NOT EXISTS queue_daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  department TEXT,
  avg_consultation_mins NUMERIC(6,2),
  avg_waiting_mins NUMERIC(6,2),
  total_patients_seen INT NOT NULL DEFAULT 0,
  no_show_count INT NOT NULL DEFAULT 0,
  cancelled_count INT NOT NULL DEFAULT 0,
  no_show_pct NUMERIC(5,2),
  cancellation_pct NUMERIC(5,2),
  daily_throughput INT NOT NULL DEFAULT 0,
  queue_efficiency_pct NUMERIC(5,2),
  estimated_completion_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, session_date, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_queue_daily_analytics_clinic_date
  ON queue_daily_analytics (clinic_id, session_date);

DROP TRIGGER IF EXISTS trg_queue_tokens_updated ON queue_tokens;
CREATE TRIGGER trg_queue_tokens_updated
  BEFORE UPDATE ON queue_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
