-- =============================================================================
-- ClinicOS — Full Single-Clinic Demo Seed
-- Run in Supabase SQL Editor AFTER:
--   1. schema.sql (+ fix_auth_trigger.sql)
--   2. migrations 003_004, 005, 006, 007 (recommended)
--
-- Creates one fully working clinic with staff, patients, appointments, queue,
-- consultations, prescriptions, lab, pharmacy, inventory, billing, insurance,
-- follow-ups, and health-risk flags.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DEMO LOGIN CREDENTIALS (password for ALL accounts: ClinicOS2026!)
-- -----------------------------------------------------------------------------
-- | Role          | Clinic ID    | Email                     | Route          |
-- |---------------|--------------|---------------------------|----------------|
-- | Super Admin   | PLATFORM     | admin@clinicos.demo       | /admin         |
-- | Clinic Owner  | CLN-DEMO01   | owner@cityclinic.demo     | /owner         |
-- | Doctor        | CLN-DEMO01   | doctor@cityclinic.demo    | /doctor        |
-- | Receptionist  | CLN-DEMO01   | reception@cityclinic.demo | /receptionist  |
-- | Patient       | CLN-DEMO01   | patient@cityclinic.demo   | /patient       |
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.seed_auth_user(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role public.user_role,
  p_clinic_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT := extensions.crypt(p_password, extensions.gen_salt('bf'));
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    v_user_id := p_user_id;
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := p_user_id;

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', p_email,
      v_password_hash,
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', p_full_name, 'role', p_role::text),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      'email', now(), now(), now()
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = v_password_hash,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role::text),
      updated_at = now()
    WHERE id = v_user_id;

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = v_user_id AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user_id, v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', p_email),
        'email', now(), now(), now()
      );
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, clinic_id, is_active)
  VALUES (v_user_id, p_email, p_full_name, p_role, p_clinic_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    clinic_id = EXCLUDED.clinic_id,
    is_active = true;

  RETURN v_user_id;
END;
$$;

DO $$
DECLARE
  v_password TEXT := 'ClinicOS2026!';

  -- Users
  v_admin_id       UUID := 'b0000000-0000-4000-8000-000000000000';
  v_owner_id       UUID := 'b0000001-0000-4000-8000-000000000001';
  v_doctor_user_id UUID := 'b0000002-0000-4000-8000-000000000002';
  v_recep_id       UUID := 'b0000003-0000-4000-8000-000000000003';
  v_patient_user   UUID := 'b0000004-0000-4000-8000-000000000004';

  -- Clinic & doctor
  v_clinic_id      UUID := 'a0000001-0000-4000-8000-000000000001';
  v_doctor_id      UUID := 'c0000001-0000-4000-8000-000000000001';
  v_plan_id        UUID;

  -- Patients
  v_patient_raj    UUID := 'd0000001-0000-4000-8000-000000000001';
  v_patient_sunita UUID := 'd0000002-0000-4000-8000-000000000002';
  v_patient_mohan  UUID := 'd0000003-0000-4000-8000-000000000003';

  -- Appointments
  v_appt_today_raj    UUID := 'e0000001-0000-4000-8000-000000000001';
  v_appt_today_sunita UUID := 'e0000002-0000-4000-8000-000000000002';
  v_appt_tomorrow     UUID := 'e0000003-0000-4000-8000-000000000003';
  v_appt_past_raj     UUID := 'e0000004-0000-4000-8000-000000000004';
  v_appt_tele         UUID := 'e0000005-0000-4000-8000-000000000005';

  -- Queue
  v_session_id     UUID := 'f0000001-0000-4000-8000-000000000001';
  v_token_a1       UUID := 'f0000002-0000-4000-8000-000000000002';
  v_token_a2       UUID := 'f0000003-0000-4000-8000-000000000003';
  v_token_e1       UUID := 'f0000004-0000-4000-8000-000000000004';
  v_visit_raj      UUID := 'f0000006-0000-4000-8000-000000000006';

  -- Consultations (prefix 10 = clinical)
  v_consult_past   UUID := '10000001-0000-4000-8000-000000000001';
  v_consult_live   UUID := '10000002-0000-4000-8000-000000000002';

  -- Prescriptions
  v_rx_past        UUID := '10000020-0000-4000-8000-000000000020';
  v_rx_item_1      UUID := '10000021-0000-4000-8000-000000000021';
  v_rx_item_2      UUID := '10000022-0000-4000-8000-000000000022';

  -- Lab (prefix 20)
  v_lab_cbc        UUID := '20000001-0000-4000-8000-000000000001';
  v_lab_fbs        UUID := '20000002-0000-4000-8000-000000000002';
  v_lab_lipid      UUID := '20000003-0000-4000-8000-000000000003';
  v_lab_tsh        UUID := '20000004-0000-4000-8000-000000000004';
  v_lab_hba1c      UUID := '20000005-0000-4000-8000-000000000005';
  v_lab_order      UUID := '20000010-0000-4000-8000-000000000010';
  v_lab_item_1     UUID := '20000011-0000-4000-8000-000000000011';
  v_lab_item_2     UUID := '20000012-0000-4000-8000-000000000012';
  v_lab_report     UUID := '20000020-0000-4000-8000-000000000020';

  -- Billing (prefix 30)
  v_bill_paid      UUID := 'f0000005-0000-4000-8000-000000000005';
  v_bill_unpaid    UUID := '30000001-0000-4000-8000-000000000001';
  v_payment_1      UUID := '30000002-0000-4000-8000-000000000002';

  -- Pharmacy (prefix 40)
  v_med_para       UUID := '40000001-0000-4000-8000-000000000001';
  v_med_metformin  UUID := '40000002-0000-4000-8000-000000000002';
  v_med_amlodipine UUID := '40000003-0000-4000-8000-000000000003';
  v_stock_para     UUID := '40000010-0000-4000-8000-000000000010';
  v_stock_met      UUID := '40000011-0000-4000-8000-000000000011';
  v_stock_aml      UUID := '40000012-0000-4000-8000-000000000012';
  v_dispense_1     UUID := '40000020-0000-4000-8000-000000000020';

  -- Inventory (prefix 50)
  v_inv_gloves     UUID := '50000001-0000-4000-8000-000000000001';
  v_inv_syringe    UUID := '50000002-0000-4000-8000-000000000002';
  v_inv_mask       UUID := '50000003-0000-4000-8000-000000000003';

  -- Insurance (prefix 60)
  v_policy_raj     UUID := '60000001-0000-4000-8000-000000000001';
  v_claim_raj      UUID := '60000002-0000-4000-8000-000000000002';

  -- Sprint 5 extras (prefix 70–80)
  v_follow_up      UUID := '70000001-0000-4000-8000-000000000001';
  v_health_risk    UUID := '70000002-0000-4000-8000-000000000002';
  v_expense        UUID := '80000001-0000-4000-8000-000000000001';
  v_comm_rule      UUID := '80000002-0000-4000-8000-000000000002';
  v_tele_session   UUID := '80000003-0000-4000-8000-000000000003';

  v_today          DATE := CURRENT_DATE;
  v_yesterday      DATE := CURRENT_DATE - 1;
  v_last_week      DATE := CURRENT_DATE - 7;
  v_next_week      DATE := CURRENT_DATE + 7;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE slug = 'pro' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Pro plan not found — run schema.sql first';
  END IF;

  -- =========================================================================
  -- AUTH + PROFILES
  -- =========================================================================
  v_admin_id := public.seed_auth_user(v_admin_id,       'admin@clinicos.demo',       v_password, 'Platform Admin',   'super_admin',    NULL);
  v_owner_id := public.seed_auth_user(v_owner_id,       'owner@cityclinic.demo',     v_password, 'Anita Mehta',      'clinic_owner',   v_clinic_id);
  v_doctor_user_id := public.seed_auth_user(v_doctor_user_id, 'doctor@cityclinic.demo',    v_password, 'Dr. Amit Verma',   'doctor',         v_clinic_id);
  v_recep_id := public.seed_auth_user(v_recep_id,       'reception@cityclinic.demo', v_password, 'Priya Singh',      'receptionist',   v_clinic_id);
  v_patient_user := public.seed_auth_user(v_patient_user,   'patient@cityclinic.demo',   v_password, 'Raj Kumar',        'patient',        v_clinic_id);

  -- =========================================================================
  -- CLINIC + SUBSCRIPTION
  -- =========================================================================
  INSERT INTO clinics (
    id, clinic_code, name, slug, address, city, state, pincode, phone, email,
    status, consultation_fee_default
  )
  VALUES (
    v_clinic_id, 'CLN-DEMO01', 'City Health Clinic', 'city-health-clinic',
    '42 MG Road, Andheri West', 'Mumbai', 'Maharashtra', '400058',
    '+91 98765 43210', 'care@cityhealth.demo', 'active', 500
  )
  ON CONFLICT (id) DO UPDATE SET
    clinic_code = EXCLUDED.clinic_code,
    name = EXCLUDED.name,
    status = 'active';

  INSERT INTO subscriptions (clinic_id, plan_id, status, current_period_end)
  VALUES (v_clinic_id, v_plan_id, 'active', now() + INTERVAL '365 days')
  ON CONFLICT (clinic_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, status = 'active';

  -- =========================================================================
  -- DOCTOR + SCHEDULE
  -- =========================================================================
  INSERT INTO doctors (id, profile_id, clinic_id, specialization, consultation_fee, slot_duration_mins)
  VALUES (v_doctor_id, v_doctor_user_id, v_clinic_id, 'General Physician', 500, 15)
  ON CONFLICT (id) DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    clinic_id = EXCLUDED.clinic_id,
    specialization = EXCLUDED.specialization;

  INSERT INTO doctor_schedules (doctor_id, clinic_id, day_of_week, start_time, end_time)
  VALUES
    (v_doctor_id, v_clinic_id, 1, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 2, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 3, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 4, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 5, '09:00', '18:00'),
    (v_doctor_id, v_clinic_id, 6, '09:00', '14:00')
  ON CONFLICT (doctor_id, day_of_week) DO NOTHING;

  -- =========================================================================
  -- PATIENTS
  -- =========================================================================
  INSERT INTO patients (
    id, clinic_id, user_id, patient_code, full_name, phone, email,
    date_of_birth, gender, blood_group, address,
    emergency_contact_name, emergency_contact_phone, created_by
  )
  VALUES
    (v_patient_raj,    v_clinic_id, v_patient_user, 'PAT-001', 'Raj Kumar',   '9876543210', 'patient@cityclinic.demo', '1988-03-15', 'male',   'B+', 'Andheri, Mumbai', 'Sita Kumar', '9876543211', v_recep_id),
    (v_patient_sunita, v_clinic_id, NULL,             'PAT-002', 'Sunita Devi', '9876543220', NULL,                      '1975-07-22', 'female', 'O+', 'Bandra, Mumbai',  'Ravi Devi',  '9876543221', v_recep_id),
    (v_patient_mohan,  v_clinic_id, NULL,             'PAT-003', 'Mohan Lal',   '9876543230', NULL,                      '1960-11-08', 'male',   'A+', 'Juhu, Mumbai',    'Geeta Lal',  '9876543231', v_recep_id)
  ON CONFLICT (id) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, patients.user_id),
    clinic_id = EXCLUDED.clinic_id,
    full_name = EXCLUDED.full_name;

  INSERT INTO patient_medical_history (
    patient_id, clinic_id, illnesses, surgeries, family_history,
    smoking_status, alcohol_status, chronic_conditions, notes, updated_by
  )
  VALUES (
    v_patient_raj, v_clinic_id,
    'Seasonal allergies', 'Appendectomy (2010)',
    'Father — hypertension; Mother — type 2 diabetes',
    'never', 'occasional',
    'Hypertension, pre-diabetes',
    'On lifestyle modification; monitors BP at home',
    v_doctor_user_id
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    chronic_conditions = EXCLUDED.chronic_conditions,
    notes = EXCLUDED.notes;

  IF NOT EXISTS (SELECT 1 FROM patient_vitals WHERE patient_id = v_patient_raj LIMIT 1) THEN
    INSERT INTO patient_vitals (
      patient_id, clinic_id, recorded_by, height_cm, weight_kg, bmi,
      bp_systolic, bp_diastolic, pulse, spo2, blood_sugar, recorded_at
    )
    VALUES
      (v_patient_raj, v_clinic_id, v_recep_id, 172, 78, 26.4, 142, 92, 82, 98, 118, now() - INTERVAL '7 days'),
      (v_patient_raj, v_clinic_id, v_recep_id, 172, 79, 26.7, 148, 94, 84, 97, 126, now() - INTERVAL '1 day'),
      (v_patient_sunita, v_clinic_id, v_recep_id, 158, 62, 24.8, 118, 76, 72, 99, 95, now() - INTERVAL '2 hours');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM patient_allergies WHERE patient_id = v_patient_raj AND allergen = 'Penicillin') THEN
    INSERT INTO patient_allergies (patient_id, clinic_id, allergen, severity, reaction, created_by)
    VALUES (v_patient_raj, v_clinic_id, 'Penicillin', 'severe', 'Anaphylaxis', v_recep_id);
  END IF;

  -- =========================================================================
  -- APPOINTMENTS (past, today, future, teleconsult)
  -- =========================================================================
  INSERT INTO appointments (
    id, clinic_id, patient_id, doctor_id, appointment_date, appointment_time,
    status, type, priority, booked_by, notes
  )
  VALUES
    (v_appt_past_raj,     v_clinic_id, v_patient_raj,    v_doctor_id, v_last_week,  '10:00', 'completed', 'scheduled', 'normal',    v_recep_id, 'Follow-up for hypertension'),
    (v_appt_today_raj,    v_clinic_id, v_patient_raj,    v_doctor_id, v_today,      '10:00', 'confirmed', 'scheduled', 'normal',    v_recep_id, NULL),
    (v_appt_today_sunita, v_clinic_id, v_patient_sunita, v_doctor_id, v_today,      '10:30', 'confirmed', 'scheduled', 'normal',    v_recep_id, 'Fever and fatigue'),
    (v_appt_tomorrow,     v_clinic_id, v_patient_mohan,  v_doctor_id, v_today + 1,  '11:00', 'confirmed', 'scheduled', 'normal',    v_recep_id, NULL)
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'appointment_type' AND e.enumlabel = 'teleconsult'
  ) THEN
    INSERT INTO appointments (
      id, clinic_id, patient_id, doctor_id, appointment_date, appointment_time,
      status, type, priority, booked_by, notes
    )
    VALUES (
      v_appt_tele, v_clinic_id, v_patient_raj, v_doctor_id, v_next_week, '15:00',
      'confirmed', 'teleconsult', 'normal', v_recep_id, 'Tele follow-up'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =========================================================================
  -- QUEUE (today)
  -- =========================================================================
  INSERT INTO queue_sessions (id, clinic_id, session_date, current_token, avg_consultation_mins, is_active)
  VALUES (v_session_id, v_clinic_id, v_today, 2, 12, true)
  ON CONFLICT (clinic_id, session_date) DO UPDATE SET current_token = 2, is_active = true;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'queue_tokens' AND column_name = 'token_label'
  ) THEN
    INSERT INTO queue_tokens (
      id, session_id, clinic_id, token_number, patient_id, doctor_id, appointment_id,
      status, priority, token_series, series_number, token_label, payment_status,
      called_at, serving_at, created_at
    )
    VALUES
      (v_token_a1, v_session_id, v_clinic_id, 1, v_patient_raj,    v_doctor_id, v_appt_today_raj,    'waiting',  'normal',    'regular',   1, 'A-1',  'not_required', NULL,                        NULL,                        now() - INTERVAL '25 minutes'),
      (v_token_a2, v_session_id, v_clinic_id, 2, v_patient_sunita, v_doctor_id, v_appt_today_sunita, 'serving',  'normal',    'regular',   2, 'A-2',  'not_required', now() - INTERVAL '5 minutes', now() - INTERVAL '3 minutes', now() - INTERVAL '20 minutes'),
      (v_token_e1, v_session_id, v_clinic_id, 3, v_patient_mohan,  v_doctor_id, NULL,                'waiting',  'emergency', 'emergency', 1, 'E-01', 'pending',      NULL,                        NULL,                        now() - INTERVAL '10 minutes')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO queue_tokens (
      id, session_id, clinic_id, token_number, patient_id, doctor_id, appointment_id,
      status, priority, called_at, serving_at, created_at
    )
    VALUES
      (v_token_a1, v_session_id, v_clinic_id, 1, v_patient_raj,    v_doctor_id, v_appt_today_raj,    'waiting',  'normal',    NULL,                        NULL,                        now() - INTERVAL '25 minutes'),
      (v_token_a2, v_session_id, v_clinic_id, 2, v_patient_sunita, v_doctor_id, v_appt_today_sunita, 'serving',  'normal',    now() - INTERVAL '5 minutes', now() - INTERVAL '3 minutes', now() - INTERVAL '20 minutes'),
      (v_token_e1, v_session_id, v_clinic_id, 3, v_patient_mohan,  v_doctor_id, NULL,                'waiting',  'emergency', NULL,                        NULL,                        now() - INTERVAL '10 minutes')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =========================================================================
  -- CONSULTATIONS (completed past + live in-progress)
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultations') THEN
    INSERT INTO consultations (
      id, clinic_id, appointment_id, queue_token_id, doctor_id, patient_id,
      status, started_at, ended_at
    )
    VALUES
      (
        v_consult_past, v_clinic_id, v_appt_past_raj, NULL, v_doctor_id, v_patient_raj,
        'completed', now() - INTERVAL '7 days', now() - INTERVAL '7 days' + INTERVAL '18 minutes'
      ),
      (
        v_consult_live, v_clinic_id, v_appt_today_sunita, v_token_a2, v_doctor_id, v_patient_sunita,
        'in_progress', now() - INTERVAL '3 minutes', NULL
      )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO consultation_notes (consultation_id, clinic_id, symptoms, diagnosis, clinical_notes)
    VALUES
      (
        v_consult_past, v_clinic_id,
        'Headache, elevated BP readings at home',
        'Essential hypertension; impaired fasting glucose',
        'Advised DASH diet, daily walking 30 min. Recheck labs in 3 months.'
      ),
      (
        v_consult_live, v_clinic_id,
        'Low-grade fever, body ache, fatigue x 2 days',
        'Viral fever — provisional',
        'No respiratory distress. Hydration and symptomatic treatment.'
      )
    ON CONFLICT (consultation_id) DO UPDATE SET
      symptoms = EXCLUDED.symptoms,
      diagnosis = EXCLUDED.diagnosis,
      clinical_notes = EXCLUDED.clinical_notes;

    INSERT INTO emr_records (
      id, clinic_id, patient_id, consultation_id, visit_number, summary, vitals_snapshot
    )
    VALUES (
      '10000011-0000-4000-8000-000000000011',
      v_clinic_id, v_patient_raj, v_consult_past, 1,
      jsonb_build_object(
        'chief_complaint', 'Hypertension follow-up',
        'diagnosis', 'Essential hypertension',
        'plan', 'Lifestyle + medication review'
      ),
      jsonb_build_object('bp', '142/92', 'pulse', 82, 'weight_kg', 78)
    )
    ON CONFLICT (consultation_id) DO NOTHING;

    INSERT INTO prescriptions (id, clinic_id, consultation_id, patient_id, doctor_id, notes)
    VALUES (
      v_rx_past, v_clinic_id, v_consult_past, v_patient_raj, v_doctor_id,
      'Avoid NSAIDs if BP uncontrolled. Patient allergic to Penicillin.'
    )
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM prescription_items WHERE prescription_id = v_rx_past) THEN
      INSERT INTO prescription_items (
        id, prescription_id, medicine_name, dosage, frequency, duration, instructions,
        allergy_acknowledged, sort_order
      )
      VALUES
        (v_rx_item_1, v_rx_past, 'Amlodipine 5mg', '1 tablet', 'Once daily', '30 days', 'Take in the morning', true, 0),
        (v_rx_item_2, v_rx_past, 'Metformin 500mg', '1 tablet', 'Twice daily', '30 days', 'After meals', true, 1);
    END IF;

    INSERT INTO referrals (
      id, clinic_id, consultation_id, patient_id, doctor_id, referred_to, reason, notes
    )
    VALUES (
      '10000030-0000-4000-8000-000000000030',
      v_clinic_id, v_consult_past, v_patient_raj, v_doctor_id,
      'Dr. Neha Kapoor — Cardiologist, Lilavati Hospital',
      'Persistent stage 1 hypertension despite lifestyle changes',
      'Schedule echo if BP remains elevated at next visit'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =========================================================================
  -- LAB
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_tests') THEN
    INSERT INTO lab_tests (id, clinic_id, name, code, price, description)
    VALUES
      (v_lab_cbc,   v_clinic_id, 'Complete Blood Count (CBC)', 'CBC',   350, 'Hemogram panel'),
      (v_lab_fbs,   v_clinic_id, 'Blood Sugar (Fasting)',      'FBS',   150, 'Fasting plasma glucose'),
      (v_lab_lipid, v_clinic_id, 'Lipid Profile',              'LIPID', 600, 'Cholesterol panel'),
      (v_lab_tsh,   v_clinic_id, 'Thyroid Profile (TSH)',      'TSH',   450, 'TSH screening'),
      (v_lab_hba1c, v_clinic_id, 'HbA1c',                      'HBA1C', 500, 'Glycated hemoglobin')
    ON CONFLICT (clinic_id, code) DO NOTHING;

    INSERT INTO lab_orders (
      id, clinic_id, patient_id, consultation_id, doctor_id, status, ordered_by, notes
    )
    VALUES (
      v_lab_order, v_clinic_id, v_patient_raj, v_consult_past, v_doctor_id,
      'completed', v_doctor_user_id, 'Baseline labs for hypertension workup'
    )
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM lab_order_items WHERE lab_order_id = v_lab_order) THEN
      INSERT INTO lab_order_items (id, lab_order_id, test_id, price)
      VALUES
        (v_lab_item_1, v_lab_order, v_lab_cbc, 350),
        (v_lab_item_2, v_lab_order, v_lab_fbs, 150);
    END IF;

    INSERT INTO lab_reports (
      id, lab_order_id, clinic_id, patient_id, file_name, result_values, ai_summary, uploaded_by
    )
    VALUES (
      v_lab_report, v_lab_order, v_clinic_id, v_patient_raj,
      'raj-kumar-labs.pdf',
      jsonb_build_object(
        'hemoglobin', '14.2 g/dL',
        'wbc', '7.1 x10^9/L',
        'fasting_glucose', '126 mg/dL'
      ),
      'Fasting glucose at upper limit; CBC within normal limits.',
      v_recep_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =========================================================================
  -- BILLING
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinic_billing_settings') THEN
    INSERT INTO clinic_billing_settings (clinic_id, tax_rate, invoice_prefix)
    VALUES (v_clinic_id, 5, 'CHC')
    ON CONFLICT (clinic_id) DO NOTHING;

    INSERT INTO bills (
      id, clinic_id, patient_id, consultation_id, invoice_number, status,
      subtotal, tax_amount, total_amount, paid_amount, patient_amount, created_by
    )
    VALUES
      (
        v_bill_paid, v_clinic_id, v_patient_raj, v_consult_past,
        'CHC-' || TO_CHAR(v_last_week, 'YYYYMM') || '-0001',
        'paid', 1000, 50, 1050, 1050, 1050, v_recep_id
      ),
      (
        v_bill_unpaid, v_clinic_id, v_patient_mohan, NULL,
        'CHC-' || TO_CHAR(v_today, 'YYYYMM') || '-0002',
        'unpaid', 500, 25, 525, 0, 525, v_recep_id
      )
    ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM bill_line_items WHERE bill_id = v_bill_paid) THEN
      INSERT INTO bill_line_items (bill_id, clinic_id, description, item_type, quantity, unit_price, amount)
      VALUES
        (v_bill_paid, v_clinic_id, 'Consultation — Dr. Amit Verma', 'consultation', 1, 500, 500),
        (v_bill_paid, v_clinic_id, 'CBC + Fasting Blood Sugar', 'lab', 1, 500, 500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM bill_line_items WHERE bill_id = v_bill_unpaid) THEN
      INSERT INTO bill_line_items (bill_id, clinic_id, description, item_type, quantity, unit_price, amount)
      VALUES (v_bill_unpaid, v_clinic_id, 'Emergency consultation', 'consultation', 1, 500, 500);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
      IF NOT EXISTS (SELECT 1 FROM payments WHERE bill_id = v_bill_paid) THEN
        INSERT INTO payments (
          id, clinic_id, bill_id, patient_id, amount, method, status, paid_at, recorded_by
        )
        VALUES (
          v_payment_1, v_clinic_id, v_bill_paid, v_patient_raj,
          1050, 'upi', 'completed', v_last_week::timestamptz + TIME '11:30', v_recep_id
        );
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- PHARMACY
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pharmacy_medicines') THEN
    INSERT INTO pharmacy_medicines (id, clinic_id, name, generic_name, unit, reorder_level)
    VALUES
      (v_med_para,      v_clinic_id, 'Paracetamol 650mg', 'Paracetamol', 'tablet', 100),
      (v_med_metformin, v_clinic_id, 'Metformin 500mg',   'Metformin',   'tablet', 80),
      (v_med_amlodipine,v_clinic_id, 'Amlodipine 5mg',    'Amlodipine',  'tablet', 60)
    ON CONFLICT (clinic_id, name) DO NOTHING;

    INSERT INTO pharmacy_stock (
      id, clinic_id, medicine_id, batch_number, quantity, expiry_date, purchase_price, selling_price
    )
    VALUES
      (v_stock_para, v_clinic_id, v_med_para,       'BATCH-P001', 500, v_today + 180, 1.20, 2.00),
      (v_stock_met,  v_clinic_id, v_med_metformin,  'BATCH-M001', 300, v_today + 365, 3.50, 5.00),
      (v_stock_aml,  v_clinic_id, v_med_amlodipine, 'BATCH-A001', 200, v_today + 300, 4.00, 6.50)
    ON CONFLICT (medicine_id, batch_number) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM pharmacy_dispense WHERE id = v_dispense_1) THEN
      INSERT INTO pharmacy_dispense (
        id, clinic_id, prescription_item_id, medicine_id, stock_id, patient_id, quantity, dispensed_by
      )
      VALUES (
        v_dispense_1, v_clinic_id, v_rx_item_1, v_med_amlodipine, v_stock_aml,
        v_patient_raj, 30, v_recep_id
      );
    END IF;
  END IF;

  -- =========================================================================
  -- INVENTORY
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_items') THEN
    INSERT INTO inventory_items (id, clinic_id, name, category, unit, quantity, reorder_level)
    VALUES
      (v_inv_gloves,  v_clinic_id, 'Examination Gloves (M)', 'supplies', 'box',   45, 20),
      (v_inv_syringe, v_clinic_id, 'Syringe 5ml',            'supplies', 'piece', 120, 50),
      (v_inv_mask,    v_clinic_id, 'Surgical Masks',         'PPE',      'box',   8,  15)
    ON CONFLICT (clinic_id, name) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM inventory_transactions WHERE item_id = v_inv_gloves LIMIT 1) THEN
      INSERT INTO inventory_transactions (clinic_id, item_id, tx_type, quantity, reason, recorded_by)
      VALUES (v_clinic_id, v_inv_gloves, 'out', 5, 'Daily OPD usage', v_recep_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM inventory_alerts WHERE clinic_id = v_clinic_id AND item_id = v_inv_mask) THEN
      INSERT INTO inventory_alerts (clinic_id, item_id, alert_type, message)
      VALUES (v_clinic_id, v_inv_mask, 'low_stock', 'Surgical Masks below reorder level (8 boxes remaining)');
    END IF;
  END IF;

  -- =========================================================================
  -- INSURANCE
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insurance_policies') THEN
    INSERT INTO insurance_policies (
      id, clinic_id, patient_id, company, policy_number, member_id,
      coverage_percent, expiry_date, is_active
    )
    VALUES (
      v_policy_raj, v_clinic_id, v_patient_raj,
      'Star Health Insurance', 'SH-2024-889912', 'MEM-445566',
      80, v_today + 120, true
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO insurance_claims (
      id, clinic_id, policy_id, bill_id, patient_id, claim_amount,
      approved_amount, status, submitted_at, created_by
    )
    VALUES (
      v_claim_raj, v_clinic_id, v_policy_raj, v_bill_paid, v_patient_raj,
      1050, 840, 'approved', v_last_week::timestamptz + INTERVAL '2 days', v_recep_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =========================================================================
  -- SPRINT 5 — FOLLOW-UPS, HEALTH RISK, EXPENSES, TELECONSULT
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'follow_up_tasks') THEN
    INSERT INTO follow_up_tasks (
      id, clinic_id, patient_id, prescription_id, medicine_name,
      scheduled_at, status, question
    )
    VALUES (
      v_follow_up, v_clinic_id, v_patient_raj, v_rx_past, 'Amlodipine 5mg',
      now() + INTERVAL '7 days', 'pending',
      'Are you taking Amlodipine daily? Any dizziness or ankle swelling?'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_risk_flags') THEN
    INSERT INTO health_risk_flags (
      id, clinic_id, patient_id, risk_type, severity, details
    )
    VALUES (
      v_health_risk, v_clinic_id, v_patient_raj, 'hypertension',
      'high',
      jsonb_build_object('bp_latest', '148/94', 'fasting_glucose', 126, 'bmi', 26.7)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    INSERT INTO expenses (id, clinic_id, category, amount, expense_date, description, created_by)
    VALUES (
      v_expense, v_clinic_id, 'rent', 45000, date_trunc('month', v_today)::date,
      'Clinic premises rent — current month', v_owner_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doctor_commission_rules') THEN
    INSERT INTO doctor_commission_rules (id, clinic_id, doctor_id, doctor_percentage, clinic_percentage)
    VALUES (v_comm_rule, v_clinic_id, v_doctor_id, 60, 40)
    ON CONFLICT (clinic_id, doctor_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teleconsult_sessions')
     AND EXISTS (SELECT 1 FROM appointments WHERE id = v_appt_tele) THEN
    INSERT INTO teleconsult_sessions (
      id, clinic_id, appointment_id, doctor_id, patient_id, room_id, status
    )
    VALUES (
      v_tele_session, v_clinic_id, v_appt_tele, v_doctor_id, v_patient_raj,
      'city-health-raj-' || to_char(v_next_week, 'YYYYMMDD'), 'scheduled'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- =========================================================================
  -- VISITS + BRANDING + NOTIFICATIONS
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinic_visits') THEN
    INSERT INTO clinic_visits (
      id, visit_code, booking_id, clinic_id, patient_id, appointment_id, queue_token_id,
      visit_type, payment_status, check_in_status, qr_signature, token_label
    )
    VALUES (
      v_visit_raj, 'VIS-DEMO01', 'BK-DEMO-0001', v_clinic_id, v_patient_raj,
      v_appt_today_raj, v_token_a1, 'scheduled', 'not_required', 'in_queue',
      encode(extensions.digest('VIS-DEMO01', 'sha256'), 'hex'), 'A-1'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinic_branding') THEN
    INSERT INTO clinic_branding (clinic_id, primary_color, secondary_color, tagline, whatsapp_number)
    VALUES (v_clinic_id, '#0ea5e9', '#14b8a6', 'Your health, our priority', '+919876543210')
    ON CONFLICT (clinic_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM notifications WHERE id = '90000001-0000-4000-8000-000000000001') THEN
      INSERT INTO notifications (id, user_id, clinic_id, title, body, type, metadata)
      VALUES (
        '90000001-0000-4000-8000-000000000001',
        v_doctor_user_id, v_clinic_id,
        'Patient in queue',
        'Sunita Devi (A-2) is ready for consultation',
        'queue',
        jsonb_build_object('token_label', 'A-2', 'patient_id', v_patient_sunita::text)
      );
    END IF;
  END IF;

  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ Full demo clinic seeded: City Health Clinic';
  RAISE NOTICE '  Clinic ID:   CLN-DEMO01';
  RAISE NOTICE '  Password:    %', v_password;
  RAISE NOTICE '  Owner:       owner@cityclinic.demo';
  RAISE NOTICE '  Doctor:      doctor@cityclinic.demo';
  RAISE NOTICE '  Reception:   reception@cityclinic.demo';
  RAISE NOTICE '  Patient:     patient@cityclinic.demo';
  RAISE NOTICE '  Super Admin: admin@clinicos.demo (Clinic ID: PLATFORM)';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
