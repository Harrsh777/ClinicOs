-- =============================================================================
-- Phase 1: Clinic registration, approval workflow & setup wizard
-- =============================================================================

-- Sequential clinic codes (CLN-000001)
CREATE SEQUENCE IF NOT EXISTS clinic_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_sequential_clinic_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_num BIGINT;
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_num := nextval('clinic_code_seq');
    v_code := 'CLN-' || lpad(v_num::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.clinics WHERE clinic_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Setup wizard progress & portal gate
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS onboarding_progress JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT false;

-- Sync sequence with existing numeric clinic codes
DO $$
DECLARE
  v_max BIGINT := 0;
  v_match TEXT[];
BEGIN
  FOR v_match IN
    SELECT regexp_matches(clinic_code, '^CLN-(\d+)$')
    FROM public.clinics
    WHERE clinic_code ~ '^CLN-\d+$'
  LOOP
    IF v_match[1]::BIGINT > v_max THEN
      v_max := v_match[1]::BIGINT;
    END IF;
  END LOOP;
  IF v_max > 0 THEN
    PERFORM setval('clinic_code_seq', v_max, true);
  END IF;
END $$;

-- Extended doctor profile fields for setup wizard
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS degree TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS biography TEXT,
  ADD COLUMN IF NOT EXISTS buffer_mins INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_daily_patients INT,
  ADD COLUMN IF NOT EXISTS emergency_slots INT NOT NULL DEFAULT 2;

-- Clinic facilities & location extras
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wheelchair_access BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS facility_images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_facilities TEXT[] DEFAULT '{}';

-- Billing / consultation fee extras
ALTER TABLE public.clinic_billing_settings
  ADD COLUMN IF NOT EXISTS emergency_consultation_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS video_consultation_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS home_visit_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS follow_up_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS free_follow_up_days INT DEFAULT 7,
  ADD COLUMN IF NOT EXISTS refund_policy TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS prescription_header TEXT,
  ADD COLUMN IF NOT EXISTS digital_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Simplified application fields (owner phone as primary contact)
ALTER TABLE public.clinic_applications
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Public registration: anon can insert pending applications
DROP POLICY IF EXISTS applications_public_insert ON public.clinic_applications;
CREATE POLICY applications_public_insert ON public.clinic_applications
  FOR INSERT TO anon
  WITH CHECK (status = 'pending');

-- Backfill portal_enabled for clinics that completed setup
UPDATE public.clinics
SET portal_enabled = true
WHERE clinic_setup_completed = true AND portal_enabled = false;
