-- WhatsApp booking sessions + atomic appointment creation (no portal gate)

CREATE TABLE IF NOT EXISTS public.whatsapp_booking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_phone TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'collecting' CHECK (state IN ('collecting', 'completed', 'cancelled')),
  desired_date DATE,
  desired_time TIME,
  reason TEXT,
  consultation_type public.consultation_type NOT NULL DEFAULT 'normal',
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_booking_active
  ON public.whatsapp_booking_sessions (clinic_id, patient_phone)
  WHERE state = 'collecting';

ALTER TABLE public.clinic_branding
  ADD COLUMN IF NOT EXISTS whatsapp_meta_phone_id TEXT;

CREATE OR REPLACE FUNCTION public.book_whatsapp_appointment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_doctor_id UUID,
  p_date DATE,
  p_time TIME,
  p_reason TEXT DEFAULT NULL,
  p_consultation_type public.consultation_type DEFAULT 'normal',
  p_apt_type public.appointment_type DEFAULT 'scheduled'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_appointment_id UUID;
  v_appointment_number TEXT;
  v_status public.appointment_status := 'confirmed';
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
    SELECT 1 FROM public.clinics WHERE id = p_clinic_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'clinic_unavailable');
  END IF;

  v_appointment_number := public.generate_appointment_number(p_clinic_id);

  INSERT INTO public.appointments (
    clinic_id, patient_id, doctor_id, appointment_date, appointment_time,
    status, type, priority, consultation_type, appointment_number,
    payment_mode, booking_symptoms, booking_notes
  ) VALUES (
    p_clinic_id, p_patient_id, p_doctor_id, p_date, p_time,
    v_status, p_apt_type, 'normal', p_consultation_type, v_appointment_number,
    'at_clinic', p_reason, 'Booked via WhatsApp'
  )
  RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'ok', true,
    'appointment_id', v_appointment_id,
    'appointment_number', v_appointment_number
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'slot_taken');
END;
$$;
