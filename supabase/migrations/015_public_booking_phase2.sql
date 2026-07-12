-- =============================================================================
-- Phase 2: Public booking engine & patient management extensions
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.consultation_type AS ENUM ('normal', 'emergency', 'video');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portal_payment_mode AS ENUM ('online', 'at_clinic');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS consultation_type public.consultation_type NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS appointment_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_mode public.portal_payment_mode DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS booking_symptoms TEXT,
  ADD COLUMN IF NOT EXISTS booking_notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_doctor_slot
  ON public.appointments (doctor_id, appointment_date, appointment_time)
  WHERE status NOT IN ('cancelled', 'rejected');

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_appointment_number
  ON public.appointments (appointment_number)
  WHERE appointment_number IS NOT NULL;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS insurance_info TEXT,
  ADD COLUMN IF NOT EXISTS is_returning BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visit_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_appointment_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_clinic_email
  ON public.patients (clinic_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

ALTER TABLE public.clinic_visits
  ADD COLUMN IF NOT EXISTS receipt_number TEXT;
