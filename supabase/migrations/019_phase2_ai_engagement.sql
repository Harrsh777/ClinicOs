-- =============================================================================
-- ClinicOS — Phase 2: AI Patient Engagement
-- Run AFTER 018_phase1_followup_foundation.sql
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE engagement_reminder_type AS ENUM (
    'clinical_follow_up',
    'medicine',
    'vaccination',
    'bp_review',
    'diabetes_review',
    'physiotherapy',
    'pregnancy',
    'annual_checkup',
    'birthday',
    'inactive_patient'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_schedule_rule AS ENUM (
    'tomorrow',
    '3_days',
    '7_days',
    '15_days',
    'monthly',
    'yearly',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE follow_up_reminders
  ADD COLUMN IF NOT EXISTS reminder_type engagement_reminder_type NOT NULL DEFAULT 'clinical_follow_up',
  ADD COLUMN IF NOT EXISTS schedule_rule engagement_schedule_rule NOT NULL DEFAULT 'tomorrow',
  ADD COLUMN IF NOT EXISTS send_on_date DATE,
  ADD COLUMN IF NOT EXISTS complaint TEXT,
  ADD COLUMN IF NOT EXISTS doctor_name TEXT,
  ADD COLUMN IF NOT EXISTS advice TEXT,
  ADD COLUMN IF NOT EXISTS ai_message TEXT,
  ADD COLUMN IF NOT EXISTS interactive_options JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS patient_response TEXT,
  ADD COLUMN IF NOT EXISTS recovery_analysis JSONB,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}';

-- Allow non-clinical reminders without EMR/consultation link
ALTER TABLE follow_up_reminders
  ALTER COLUMN emr_record_id DROP NOT NULL,
  ALTER COLUMN consultation_id DROP NOT NULL;

-- Backfill send_on_date for existing rows (send 1 day before follow-up)
UPDATE follow_up_reminders
SET send_on_date = follow_up_date - INTERVAL '1 day'
WHERE send_on_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_send
  ON follow_up_reminders(clinic_id, send_on_date, status);

-- Cached AI patient briefs (regenerated on demand)
CREATE TABLE IF NOT EXISTS patient_ai_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  brief JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_ai_briefs_patient
  ON patient_ai_briefs(patient_id);

ALTER TABLE patient_ai_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY patient_ai_briefs_clinic ON patient_ai_briefs FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));
