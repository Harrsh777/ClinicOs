-- =============================================================================
-- ClinicOS — Demo Clinic Seed Data
-- Run in Supabase SQL Editor AFTER:
--   1. schema.sql (+ fix_auth_trigger.sql)
--   2. migrations 003_004, 005, 006 (recommended)
--
-- Creates: City Health Clinic + staff + patients + queue + sample billing
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DEMO LOGIN CREDENTIALS (password for ALL accounts: ClinicOS2026!)
-- -----------------------------------------------------------------------------
-- | Role          | Email                    | Dashboard route  |
-- |---------------|--------------------------|------------------|
-- | Super Admin   | admin@clinicos.demo      | /admin           |
-- | Clinic Owner  | owner@cityclinic.demo    | /owner           |
-- | Doctor        | doctor@cityclinic.demo   | /doctor          |
-- | Receptionist  | reception@cityclinic.demo| /receptionist    |
-- | Patient       | patient@cityclinic.demo  | /patient         |
-- -----------------------------------------------------------------------------

-- =============================================================================
-- HELPER: Create auth user + profile (idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_auth_user(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role public.user_role,
  p_clinic_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      p_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', p_full_name, 'role', p_role::text),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      p_user_id::text,
      jsonb_build_object('sub', p_user_id::text, 'email', p_email),
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, clinic_id, is_active)
  VALUES (p_user_id, p_email, p_full_name, p_role, p_clinic_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    clinic_id = EXCLUDED.clinic_id,
    is_active = true;
END;
$$;

-- =============================================================================
-- FIXED UUIDs (stable across re-runs)
-- =============================================================================

-- Users
-- \set admin_id    'b0000000-0000-4000-8000-000000000000'
-- Clinic
-- \set clinic_id   'a0000001-0000-4000-8000-000000000001'

DO $$
DECLARE
  v_password TEXT := 'ClinicOS2026!';

  -- User IDs
  v_admin_id       UUID := 'b0000000-0000-4000-8000-000000000000';
  v_owner_id       UUID := 'b0000001-0000-4000-8000-000000000001';
  v_doctor_user_id UUID := 'b0000002-0000-4000-8000-000000000002';
  v_recep_id       UUID := 'b0000003-0000-4000-8000-000000000003';
  v_patient_user   UUID := 'b0000004-0000-4000-8000-000000000004';

  -- Entity IDs
  v_clinic_id      UUID := 'a0000001-0000-4000-8000-000000000001';
  v_doctor_id      UUID := 'c0000001-0000-4000-8000-000000000001';
  v_plan_id        UUID;

  v_patient_raj    UUID := 'd0000001-0000-4000-8000-000000000001';
  v_patient_sunita UUID := 'd0000002-0000-4000-8000-000000000002';
  v_patient_mohan  UUID := 'd0000003-0000-4000-8000-000000000003';

  v_appt_1         UUID := 'e0000001-0000-4000-8000-000000000001';
  v_appt_2         UUID := 'e0000002-0000-4000-8000-000000000002';
  v_session_id     UUID := 'f0000001-0000-4000-8000-000000000001';
  v_token_a1       UUID := 'f0000002-0000-4000-8000-000000000002';
  v_token_a2       UUID := 'f0000003-0000-4000-8000-000000000003';
  v_token_e1       UUID := 'f0000004-0000-4000-8000-000000000004';
  v_bill_id        UUID := 'f0000005-0000-4000-8000-000000000005';
  v_visit_raj      UUID := 'f0000006-0000-4000-8000-000000000006';

  v_today          DATE := CURRENT_DATE;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE slug = 'pro' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Pro plan not found — run schema.sql seed first';
  END IF;

  -- Auth users + profiles
  PERFORM seed_auth_user(v_admin_id,       'admin@clinicos.demo',       v_password, 'Platform Admin',   'super_admin',    NULL);
  PERFORM seed_auth_user(v_owner_id,       'owner@cityclinic.demo',     v_password, 'Anita Mehta',      'clinic_owner',   v_clinic_id);
  PERFORM seed_auth_user(v_doctor_user_id, 'doctor@cityclinic.demo',    v_password, 'Dr. Amit Verma',   'doctor',         v_clinic_id);
  PERFORM seed_auth_user(v_recep_id,       'reception@cityclinic.demo', v_password, 'Priya Singh',      'receptionist',   v_clinic_id);
  PERFORM seed_auth_user(v_patient_user,   'patient@cityclinic.demo',   v_password, 'Raj Kumar',        'patient',        v_clinic_id);

  -- Clinic
  INSERT INTO clinics (id, clinic_code, name, slug, address, city, state, pincode, phone, email, status, consultation_fee_default)
  VALUES (
    v_clinic_id,
    'CLN-DEMO01',
    'City Health Clinic',
    'city-health-clinic',
    '42 MG Road, Andheri West',
    'Mumbai',
    'Maharashtra',
    '400058',
    '+91 98765 43210',
    'care@cityhealth.demo',
    'active',
    500
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = 'active';

  -- Subscription
  INSERT INTO subscriptions (clinic_id, plan_id, status, current_period_end)
  VALUES (v_clinic_id, v_plan_id, 'active', now() + INTERVAL '365 days')
  ON CONFLICT (clinic_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active';

  -- Doctor record
  INSERT INTO doctors (id, profile_id, clinic_id, specialization, consultation_fee, slot_duration_mins)
  VALUES (v_doctor_id, v_doctor_user_id, v_clinic_id, 'General Physician', 500, 15)
  ON CONFLICT (id) DO NOTHING;

  -- Doctor schedule (Mon–Sat)
  INSERT INTO doctor_schedules (doctor_id, clinic_id, day_of_week, start_time, end_time)
  VALUES
    (v_doctor_id, v_clinic_id, 1, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 2, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 3, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 4, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 5, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 6, '09:00', '14:00')
  ON CONFLICT (doctor_id, day_of_week) DO NOTHING;

  -- Patients
  INSERT INTO patients (id, clinic_id, user_id, patient_code, full_name, phone, email, date_of_birth, gender, blood_group, address, emergency_contact_name, emergency_contact_phone, created_by)
  VALUES
    (v_patient_raj,    v_clinic_id, v_patient_user, 'PAT-001', 'Raj Kumar',    '9876543210', 'patient@cityclinic.demo', '1988-03-15', 'male',   'B+', 'Andheri, Mumbai', 'Sita Kumar',  '9876543211', v_recep_id),
    (v_patient_sunita, v_clinic_id, NULL,           'PAT-002', 'Sunita Devi',  '9876543220', NULL,                      '1975-07-22', 'female', 'O+', 'Bandra, Mumbai',  'Ravi Devi',   '9876543221', v_recep_id),
    (v_patient_mohan,  v_clinic_id, NULL,           'PAT-003', 'Mohan Lal',    '9876543230', NULL,                      '1960-11-08', 'male',   'A+', 'Juhu, Mumbai',    'Geeta Lal',   '9876543231', v_recep_id)
  ON CONFLICT (id) DO NOTHING;

  -- Vitals (Raj — elevated BP for health-risk demo)
  IF NOT EXISTS (SELECT 1 FROM patient_vitals WHERE patient_id = v_patient_raj LIMIT 1) THEN
    INSERT INTO patient_vitals (patient_id, clinic_id, recorded_by, height_cm, weight_kg, bmi, bp_systolic, bp_diastolic, pulse, spo2, blood_sugar, recorded_at)
    VALUES
      (v_patient_raj, v_clinic_id, v_recep_id, 172, 78, 26.4, 142, 92, 82, 98, 118, now() - INTERVAL '7 days'),
      (v_patient_raj, v_clinic_id, v_recep_id, 172, 79, 26.7, 148, 94, 84, 97, 126, now() - INTERVAL '1 day');
  END IF;

  -- Allergy
  IF NOT EXISTS (SELECT 1 FROM patient_allergies WHERE patient_id = v_patient_raj AND allergen = 'Penicillin') THEN
    INSERT INTO patient_allergies (patient_id, clinic_id, allergen, severity, reaction, created_by)
    VALUES (v_patient_raj, v_clinic_id, 'Penicillin', 'severe', 'Anaphylaxis', v_recep_id);
  END IF;

  -- Appointments (today)
  INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, appointment_date, appointment_time, status, type, priority, booked_by)
  VALUES
    (v_appt_1, v_clinic_id, v_patient_raj,    v_doctor_id, v_today, '10:00', 'confirmed', 'scheduled', 'normal',    v_recep_id),
    (v_appt_2, v_clinic_id, v_patient_sunita, v_doctor_id, v_today, '10:30', 'confirmed', 'scheduled', 'normal',    v_recep_id)
  ON CONFLICT (id) DO NOTHING;

  -- Queue session (today)
  INSERT INTO queue_sessions (id, clinic_id, session_date, current_token, avg_consultation_mins, is_active)
  VALUES (v_session_id, v_clinic_id, v_today, 1, 12, true)
  ON CONFLICT (clinic_id, session_date) DO UPDATE SET current_token = 1, is_active = true;

  -- Queue tokens: A-1 waiting, A-2 serving, E-01 emergency
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queue_tokens' AND column_name = 'token_label'
  ) THEN
    INSERT INTO queue_tokens (
      id, session_id, clinic_id, token_number, patient_id, doctor_id, appointment_id,
      status, priority, token_series, series_number, token_label, payment_status, called_at, serving_at, created_at
    )
    VALUES
      (v_token_a1, v_session_id, v_clinic_id, 1, v_patient_raj,    v_doctor_id, v_appt_1, 'waiting',  'normal',    'regular',   1, 'A-1',  'not_required', NULL,                        NULL,                        now() - INTERVAL '25 minutes'),
      (v_token_a2, v_session_id, v_clinic_id, 2, v_patient_sunita, v_doctor_id, v_appt_2, 'serving',  'normal',    'regular',   2, 'A-2',  'not_required', now() - INTERVAL '5 minutes', now() - INTERVAL '3 minutes', now() - INTERVAL '20 minutes'),
      (v_token_e1, v_session_id, v_clinic_id, 3, v_patient_mohan,  v_doctor_id, NULL,     'waiting',  'emergency', 'emergency', 1, 'E-01', 'pending',      NULL,                        NULL,                        now() - INTERVAL '10 minutes')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO queue_tokens (id, session_id, clinic_id, token_number, patient_id, doctor_id, appointment_id, status, priority, called_at, serving_at, created_at)
    VALUES
      (v_token_a1, v_session_id, v_clinic_id, 1, v_patient_raj,    v_doctor_id, v_appt_1, 'waiting',  'normal',    NULL,                        NULL,                        now() - INTERVAL '25 minutes'),
      (v_token_a2, v_session_id, v_clinic_id, 2, v_patient_sunita, v_doctor_id, v_appt_2, 'serving',  'normal',    now() - INTERVAL '5 minutes', now() - INTERVAL '3 minutes', now() - INTERVAL '20 minutes'),
      (v_token_e1, v_session_id, v_clinic_id, 3, v_patient_mohan,  v_doctor_id, NULL,     'waiting',  'emergency', NULL,                        NULL,                        now() - INTERVAL '10 minutes')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Billing settings (if migration 003 applied)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinic_billing_settings') THEN
    INSERT INTO clinic_billing_settings (clinic_id, tax_rate, invoice_prefix)
    VALUES (v_clinic_id, 5, 'CHC')
    ON CONFLICT (clinic_id) DO NOTHING;

    INSERT INTO bills (id, clinic_id, patient_id, invoice_number, status, subtotal, tax_amount, total_amount, paid_amount, patient_amount, created_by)
    VALUES (v_bill_id, v_clinic_id, v_patient_raj, 'CHC-' || TO_CHAR(now(), 'YYYYMM') || '-0001', 'paid', 500, 25, 525, 525, 525, v_recep_id)
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM bill_line_items WHERE bill_id = v_bill_id) THEN
      INSERT INTO bill_line_items (bill_id, clinic_id, description, item_type, quantity, unit_price, amount)
      VALUES (v_bill_id, v_clinic_id, 'Consultation — Dr. Amit Verma', 'consultation', 1, 500, 500);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
      IF NOT EXISTS (SELECT 1 FROM payments WHERE bill_id = v_bill_id) THEN
        INSERT INTO payments (clinic_id, bill_id, amount, method, status, paid_at, received_by)
        VALUES (v_clinic_id, v_bill_id, 525, 'upi', 'completed', now() - INTERVAL '2 days', v_recep_id);
      END IF;
    END IF;
  END IF;

  -- Clinic visit + secure QR (if migration 006 applied)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinic_visits') THEN
    INSERT INTO clinic_visits (
      id, visit_code, booking_id, clinic_id, patient_id, appointment_id, queue_token_id,
      visit_type, payment_status, check_in_status, qr_signature, token_label
    )
    VALUES (
      v_visit_raj,
      'VIS-DEMO01',
      'BK-DEMO-0001',
      v_clinic_id,
      v_patient_raj,
      v_appt_1,
      v_token_a1,
      'scheduled',
      'not_required',
      'in_queue',
      encode(extensions.digest('VIS-DEMO01', 'sha256'), 'hex'),
      'A-1'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Branding (if migration 005 applied)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinic_branding') THEN
    INSERT INTO clinic_branding (clinic_id, primary_color, secondary_color, tagline, whatsapp_number)
    VALUES (v_clinic_id, '#0ea5e9', '#14b8a6', 'Your health, our priority', '+919876543210')
    ON CONFLICT (clinic_id) DO NOTHING;
  END IF;

  RAISE NOTICE '✓ Demo clinic seeded: City Health Clinic';
  RAISE NOTICE '  Password for all accounts: %', v_password;
  RAISE NOTICE '  Owner:       owner@cityclinic.demo';
  RAISE NOTICE '  Doctor:      doctor@cityclinic.demo';
  RAISE NOTICE '  Reception:   reception@cityclinic.demo';
  RAISE NOTICE '  Patient:     patient@cityclinic.demo';
  RAISE NOTICE '  Super Admin: admin@clinicos.demo';
END $$;

-- Optional cleanup (uncomment to reset demo data)
-- DELETE FROM queue_tokens WHERE clinic_id = 'a0000001-0000-4000-8000-000000000001';
-- DELETE FROM auth.users WHERE email LIKE '%@cityclinic.demo';
