-- =============================================================================
-- ClinicOS — Phase 1: Digital Visit & Follow-up Foundation
-- Run AFTER 017_demo_requests.sql
-- =============================================================================

-- Consultation notes: follow-up scheduling + patient advice
ALTER TABLE consultation_notes
  ADD COLUMN IF NOT EXISTS follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS advice TEXT;

-- WhatsApp delivery lifecycle
DO $$ BEGIN
  CREATE TYPE whatsapp_delivery_status AS ENUM (
    'scheduled', 'sent', 'delivered', 'read', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE follow_up_reminder_status AS ENUM (
    'scheduled', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_status whatsapp_delivery_status DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_reason TEXT,
  ADD COLUMN IF NOT EXISTS external_message_id TEXT;

-- Clinical follow-up reminders (distinct from medication adherence tasks)
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  emr_record_id UUID NOT NULL UNIQUE REFERENCES emr_records(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  follow_up_date DATE NOT NULL,
  diagnosis TEXT,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  status follow_up_reminder_status NOT NULL DEFAULT 'scheduled',
  whatsapp_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_date
  ON follow_up_reminders(clinic_id, follow_up_date, status);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_patient
  ON follow_up_reminders(patient_id, status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_delivery
  ON whatsapp_messages(clinic_id, delivery_status, created_at DESC);

CREATE TRIGGER trg_follow_up_reminders_updated
  BEFORE UPDATE ON follow_up_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY follow_up_reminders_clinic ON follow_up_reminders FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
