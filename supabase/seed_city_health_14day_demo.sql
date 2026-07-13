-- =============================================================================
-- ClinicOS — City Health Clinic: 14-Day Rich Demo Data
-- Past 7 days + today + next 7 days — fills executive dashboard, revenue charts,
-- queue, appointments, consultations, billing, lab, pharmacy, AI insights.
--
-- PREREQUISITE: Run seed_full_clinic.sql first (creates clinic + staff + base patients)
-- PASSWORD for all logins: ClinicOS2026!
--
-- Run in Supabase SQL Editor (safe to re-run — uses deterministic UUIDs + upserts)
-- =============================================================================

DO $$
DECLARE
  v_clinic_id      UUID := 'a0000001-0000-4000-8000-000000000001';
  v_doctor_id      UUID := 'c0000001-0000-4000-8000-000000000001';
  v_doctor_user    UUID := 'b0000002-0000-4000-8000-000000000002';
  v_recep_id       UUID := 'b0000003-0000-4000-8000-000000000003';
  v_owner_id       UUID := 'b0000001-0000-4000-8000-000000000001';

  v_patient_raj    UUID := 'd0000001-0000-4000-8000-000000000001';
  v_patient_sunita UUID := 'd0000002-0000-4000-8000-000000000002';
  v_patient_mohan  UUID := 'd0000003-0000-4000-8000-000000000003';

  v_today          DATE := CURRENT_DATE;
  v_month_start    DATE := date_trunc('month', CURRENT_DATE)::date;

  v_day_offset     INT;
  v_day            DATE;
  v_day_idx        INT;
  v_slot           INT;
  v_patient_idx    INT;
  v_patient_id     UUID;
  v_patient_count  INT := 20;

  v_session_id     UUID;
  v_appt_id        UUID;
  v_token_id       UUID;
  v_consult_id     UUID;
  v_bill_id        UUID;
  v_payment_id     UUID;
  v_emr_id         UUID;

  v_appt_status    appointment_status;
  v_appt_time      TIME;
  v_token_status   token_status;
  v_consult_status consultation_status;
  v_bill_status    bill_status;
  v_amount         NUMERIC;
  v_token_num      INT;
  v_visit_num      INT;
  v_day_ts         TIMESTAMPTZ;
  v_serving_ts     TIMESTAMPTZ;
  v_completed_ts   TIMESTAMPTZ;

  v_has_token_label BOOLEAN;
  v_has_consultations BOOLEAN;
  v_has_billing BOOLEAN;
  v_has_lab BOOLEAN;
  v_has_follow_up BOOLEAN;
  v_has_health_risk BOOLEAN;
  v_has_teleconsult BOOLEAN;

  v_patient_ids UUID[] := ARRAY[
    v_patient_raj, v_patient_sunita, v_patient_mohan,
    'd1000004-0000-4000-8000-000000000004'::uuid,
    'd1000005-0000-4000-8000-000000000005'::uuid,
    'd1000006-0000-4000-8000-000000000006'::uuid,
    'd1000007-0000-4000-8000-000000000007'::uuid,
    'd1000008-0000-4000-8000-000000000008'::uuid,
    'd1000009-0000-4000-8000-000000000009'::uuid,
    'd1000010-0000-4000-8000-000000000010'::uuid,
    'd1000011-0000-4000-8000-000000000011'::uuid,
    'd1000012-0000-4000-8000-000000000012'::uuid,
    'd1000013-0000-4000-8000-000000000013'::uuid,
    'd1000014-0000-4000-8000-000000000014'::uuid,
    'd1000015-0000-4000-8000-000000000015'::uuid,
    'd1000016-0000-4000-8000-000000000016'::uuid,
    'd1000017-0000-4000-8000-000000000017'::uuid,
    'd1000018-0000-4000-8000-000000000018'::uuid,
    'd1000019-0000-4000-8000-000000000019'::uuid,
    'd1000020-0000-4000-8000-000000000020'::uuid
  ];

  v_patient_names TEXT[] := ARRAY[
    'Raj Kumar', 'Sunita Devi', 'Mohan Lal',
    'Kavita Sharma', 'Deepak Patel', 'Anjali Nair', 'Rohit Gupta', 'Meera Iyer',
    'Vikram Singh', 'Pooja Reddy', 'Arjun Desai', 'Neha Kapoor', 'Sanjay Joshi',
    'Lakshmi Rao', 'Imran Khan', 'Divya Menon', 'Karan Malhotra', 'Ritu Agarwal',
    'Farhan Sheikh', 'Aisha Banerjee'
  ];

  v_complaints TEXT[] := ARRAY[
    'Fever and body ache', 'Hypertension follow-up', 'Diabetes review',
    'Cough and cold', 'Back pain', 'Skin rash', 'Migraine', 'Annual checkup',
    'Knee pain', 'Acid reflux', 'Anxiety', 'Thyroid review'
  ];

  v_diagnoses TEXT[] := ARRAY[
    'Viral fever', 'Essential hypertension', 'Type 2 diabetes — controlled',
    'Upper respiratory infection', 'Lumbar strain', 'Contact dermatitis',
    'Tension headache', 'General wellness — normal', 'Osteoarthritis knee',
    'GERD', 'Generalized anxiety', 'Subclinical hypothyroidism'
  ];

  v_payment_methods payment_method[] := ARRAY['upi', 'cash', 'card', 'upi', 'cash']::payment_method[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clinics WHERE id = v_clinic_id) THEN
    RAISE EXCEPTION 'City Health Clinic not found — run supabase/seed_full_clinic.sql first';
  END IF;

  -- Ensure Pro subscription so teleconsult and other gated features work in demo
  INSERT INTO subscriptions (clinic_id, plan_id, status, current_period_end)
  SELECT v_clinic_id, p.id, 'active', now() + INTERVAL '365 days'
  FROM plans p WHERE p.slug = 'pro'
  ON CONFLICT (clinic_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    current_period_end = EXCLUDED.current_period_end;

  UPDATE plans SET features = features || '{"teleconsult":true}'::jsonb WHERE slug = 'pro';

  v_has_token_label := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'queue_tokens' AND column_name = 'token_label'
  );
  v_has_consultations := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'consultations'
  );
  v_has_billing := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bills'
  );
  v_has_lab := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lab_tests'
  );
  v_has_follow_up := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'follow_up_tasks'
  );
  v_has_health_risk := EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'health_risk_flags'
  );
  v_has_teleconsult := EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'appointment_type' AND e.enumlabel = 'teleconsult'
  );

  -- =========================================================================
  -- CLEANUP: safe re-run — remove prior 14-day demo rows + free doctor slots
  -- =========================================================================
  IF v_has_billing THEN
    DELETE FROM payments
    WHERE clinic_id = v_clinic_id
      AND (id::text LIKE '3100%' OR id::text LIKE '3210%');

    DELETE FROM bill_line_items
    WHERE clinic_id = v_clinic_id
      AND (bill_id::text LIKE '3000%' OR bill_id::text LIKE '3200%');

    DELETE FROM bills
    WHERE clinic_id = v_clinic_id
      AND (id::text LIKE '3000%' OR id::text LIKE '3200%');
  END IF;

  IF v_has_lab THEN
    DELETE FROM lab_reports
    WHERE lab_order_id IN (
      SELECT id FROM lab_orders
      WHERE clinic_id = v_clinic_id AND id::text LIKE '200000%'
    );
    DELETE FROM lab_order_items
    WHERE lab_order_id IN (
      SELECT id FROM lab_orders
      WHERE clinic_id = v_clinic_id AND id::text LIKE '200000%'
    );
    DELETE FROM lab_orders
    WHERE clinic_id = v_clinic_id AND id::text LIKE '200000%';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teleconsult_sessions') THEN
    DELETE FROM teleconsult_sessions
    WHERE clinic_id = v_clinic_id AND id::text LIKE '8000%';
  END IF;

  IF v_has_consultations THEN
    DELETE FROM prescription_items
    WHERE prescription_id IN (
      SELECT id FROM prescriptions
      WHERE clinic_id = v_clinic_id AND consultation_id::text LIKE '1000%'
    );
    DELETE FROM prescriptions
    WHERE clinic_id = v_clinic_id AND consultation_id::text LIKE '1000%';
    DELETE FROM referrals
    WHERE clinic_id = v_clinic_id AND consultation_id::text LIKE '1000%';
    DELETE FROM consultation_notes
    WHERE clinic_id = v_clinic_id
      AND (consultation_id::text LIKE '1000%' OR consultation_id::text LIKE '100099%');
    DELETE FROM emr_records
    WHERE clinic_id = v_clinic_id
      AND (consultation_id::text LIKE '1000%' OR consultation_id::text LIKE '100099%');
    DELETE FROM consultations
    WHERE clinic_id = v_clinic_id
      AND (id::text LIKE '1000%' OR id::text LIKE '100099%');
  END IF;

  DELETE FROM queue_tokens
  WHERE clinic_id = v_clinic_id
    AND (id::text LIKE 'f300%' OR session_id::text LIKE 'f200%');

  DELETE FROM appointments
  WHERE clinic_id = v_clinic_id AND id::text LIKE 'e200%';

  DELETE FROM queue_sessions
  WHERE clinic_id = v_clinic_id AND id::text LIKE 'f200%';

  IF v_has_follow_up THEN
    DELETE FROM follow_up_tasks
    WHERE clinic_id = v_clinic_id AND id::text LIKE '700001%';
  END IF;

  IF v_has_health_risk THEN
    DELETE FROM health_risk_flags
    WHERE clinic_id = v_clinic_id AND id::text LIKE '700000%'
      AND id::text NOT LIKE '70000002%';  -- keep seed_full baseline flag
  END IF;

  -- Cancel base-seed appointments in our window so doctor slots are free
  -- (partial unique index ignores cancelled/rejected)
  UPDATE appointments
  SET status = 'cancelled', updated_at = now()
  WHERE clinic_id = v_clinic_id
    AND appointment_date BETWEEN v_today - 7 AND v_today + 7
    AND id::text LIKE 'e000%'
    AND status NOT IN ('cancelled', 'rejected');

  -- =========================================================================
  -- EXTRA PATIENTS (17 new + 3 base = 20 total)
  -- =========================================================================
  FOR v_patient_idx IN 4..v_patient_count LOOP
  v_patient_id := v_patient_ids[v_patient_idx];

  INSERT INTO patients (
    id, clinic_id, patient_code, full_name, phone, email,
    date_of_birth, gender, blood_group, address,
    emergency_contact_name, emergency_contact_phone, created_by, created_at, is_active
  )
  VALUES (
    v_patient_id,
    v_clinic_id,
    'PAT-' || lpad(v_patient_idx::text, 3, '0'),
    v_patient_names[v_patient_idx],
    '98765' || lpad(v_patient_idx::text, 5, '0'),
    CASE WHEN v_patient_idx <= 6 THEN lower(replace(v_patient_names[v_patient_idx], ' ', '.')) || '@demo.local' ELSE NULL END,
    (DATE '1970-01-01' + (v_patient_idx * 137) % 15000),
    CASE WHEN v_patient_idx % 2 = 0 THEN 'female' ELSE 'male' END,
    (ARRAY['A+', 'B+', 'O+', 'AB+', 'A-', 'B-'])[1 + (v_patient_idx % 6)],
    'Mumbai, Maharashtra',
    'Emergency Contact',
    '98766' || lpad(v_patient_idx::text, 5, '0'),
    v_recep_id,
  CASE
    WHEN v_patient_idx <= 10 THEN v_month_start + ((v_patient_idx - 1) % 10)  -- new this month
    WHEN v_patient_idx <= 15 THEN v_today - 120                                   -- returning pool
    ELSE v_today - 200                                                            -- at-risk / lost pool
  END,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    is_active = true,
    created_at = EXCLUDED.created_at;
  END LOOP;

  -- Vitals for several patients
  FOR v_patient_idx IN 1..12 LOOP
    v_patient_id := v_patient_ids[v_patient_idx];
    IF NOT EXISTS (SELECT 1 FROM patient_vitals WHERE patient_id = v_patient_id AND recorded_at::date = v_today) THEN
      INSERT INTO patient_vitals (
        patient_id, clinic_id, recorded_by,
        height_cm, weight_kg, bp_systolic, bp_diastolic, pulse, spo2, blood_sugar, recorded_at
      )
      VALUES (
        v_patient_id, v_clinic_id, v_recep_id,
        155 + (v_patient_idx % 20),
        55 + (v_patient_idx % 35),
        110 + (v_patient_idx % 45),
        70 + (v_patient_idx % 25),
        68 + (v_patient_idx % 25),
        96 + (v_patient_idx % 4),
        85 + (v_patient_idx % 50),
        v_today::timestamptz + TIME '08:30' + ((v_patient_idx % 8) * INTERVAL '15 minutes')
      );
    END IF;
  END LOOP;

  -- Billing settings
  IF v_has_billing THEN
    INSERT INTO clinic_billing_settings (clinic_id, tax_rate, invoice_prefix)
    VALUES (v_clinic_id, 5, 'CHC')
    ON CONFLICT (clinic_id) DO UPDATE SET tax_rate = 5;
  END IF;

  -- =========================================================================
  -- 14-DAY LOOP: appointments, queue, consultations, billing
  -- =========================================================================
  FOR v_day_offset IN -7..7 LOOP
    v_day := v_today + v_day_offset;
    v_day_idx := v_day_offset + 7;
    v_session_id := ('f200' || lpad(v_day_idx::text, 2, '0') || '01-0000-4000-8000-000000000001')::uuid;

    INSERT INTO queue_sessions (id, clinic_id, session_date, current_token, avg_consultation_mins, is_active)
    VALUES (
      v_session_id, v_clinic_id, v_day,
      CASE WHEN v_day_offset = 0 THEN 12 ELSE 10 END,
      12 + (v_day_idx % 5),
      v_day_offset = 0
    )
    ON CONFLICT (clinic_id, session_date) DO UPDATE SET
      current_token = EXCLUDED.current_token,
      is_active = EXCLUDED.is_active;

    FOR v_slot IN 1..10 LOOP
      v_patient_idx := ((v_day_idx * 10 + v_slot - 1) % v_patient_count) + 1;
      v_patient_id := v_patient_ids[v_patient_idx];
      v_appt_id := ('e200' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid;
      v_appt_time := TIME '11:00' + ((v_slot - 1) * INTERVAL '15 minutes');

      IF v_day_offset < 0 THEN
        v_appt_status := CASE WHEN v_slot = 10 THEN 'no_show' ELSE 'completed' END;
      ELSIF v_day_offset = 0 THEN
        v_appt_status := CASE
          WHEN v_slot <= 6 THEN 'completed'
          WHEN v_slot <= 8 THEN 'confirmed'
          ELSE 'confirmed'
        END;
      ELSE
        v_appt_status := CASE
          WHEN v_slot <= 7 THEN 'confirmed'
          WHEN v_slot = 8 THEN 'pending'
          ELSE 'confirmed'
        END;
      END IF;

      INSERT INTO appointments (
        id, clinic_id, patient_id, doctor_id,
        appointment_date, appointment_time, status, type, priority,
        booked_by, notes, created_at
      )
      VALUES (
        v_appt_id, v_clinic_id, v_patient_id, v_doctor_id,
        v_day, v_appt_time, v_appt_status,
        CASE
          WHEN v_has_teleconsult AND v_day_offset > 0 AND v_slot = 9 THEN 'teleconsult'::appointment_type
          WHEN v_slot = 10 AND v_day_offset <= 0 THEN 'walk_in'::appointment_type
          ELSE 'scheduled'::appointment_type
        END,
        CASE WHEN v_slot = 10 THEN 'emergency'::appointment_priority ELSE 'normal'::appointment_priority END,
        v_recep_id,
        v_complaints[1 + ((v_day_idx + v_slot) % array_length(v_complaints, 1))],
        (v_day::timestamptz - INTERVAL '2 days') + (v_slot * INTERVAL '1 hour')
      )
      ON CONFLICT (doctor_id, appointment_date, appointment_time)
      WHERE (status NOT IN ('cancelled', 'rejected'))
      DO UPDATE SET
        patient_id = EXCLUDED.patient_id,
        status = EXCLUDED.status,
        type = EXCLUDED.type,
        priority = EXCLUDED.priority,
        notes = EXCLUDED.notes,
        updated_at = now();

      SELECT id INTO v_appt_id
      FROM appointments
      WHERE doctor_id = v_doctor_id
        AND appointment_date = v_day
        AND appointment_time = v_appt_time
        AND status NOT IN ('cancelled', 'rejected')
      LIMIT 1;

      IF v_appt_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Queue + clinical workflow for past days and today (not future)
      IF v_day_offset <= 0 AND v_appt_status IN ('completed', 'confirmed') AND NOT (v_day_offset = 0 AND v_slot > 8) THEN
        v_token_id := ('f300' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid;
        v_token_num := v_slot;
        v_day_ts := v_day::timestamptz + v_appt_time - INTERVAL '15 minutes';
        v_serving_ts := v_day_ts + INTERVAL '12 minutes';
        v_completed_ts := v_serving_ts + INTERVAL '14 minutes';

        IF v_day_offset = 0 THEN
          v_token_status := CASE
            WHEN v_slot <= 5 THEN 'completed'
            WHEN v_slot = 6 THEN 'serving'
            WHEN v_slot = 7 THEN 'called'
            ELSE 'waiting'
          END;
        ELSE
          v_token_status := CASE WHEN v_slot = 10 THEN 'skipped' ELSE 'completed' END;
        END IF;

        IF v_has_token_label THEN
          INSERT INTO queue_tokens (
            id, session_id, clinic_id, token_number, patient_id, doctor_id, appointment_id,
            status, priority, token_series, series_number, token_label, payment_status,
            called_at, serving_at, completed_at, checked_in_at, created_at
          )
          VALUES (
            v_token_id, v_session_id, v_clinic_id, v_token_num, v_patient_id, v_doctor_id, v_appt_id,
            v_token_status,
            CASE WHEN v_slot = 10 THEN 'emergency'::appointment_priority ELSE 'normal'::appointment_priority END,
            CASE WHEN v_slot = 10 THEN 'emergency'::token_series ELSE 'regular'::token_series END,
            CASE WHEN v_slot = 10 THEN 1 ELSE v_token_num END,
            CASE WHEN v_slot = 10 THEN 'E-' || lpad(v_token_num::text, 2, '0') ELSE 'A-' || v_token_num END,
            CASE WHEN v_slot = 10 THEN 'paid'::visit_payment_status ELSE 'not_required'::visit_payment_status END,
            CASE WHEN v_token_status IN ('called', 'serving', 'completed') THEN v_day_ts + INTERVAL '5 minutes' ELSE NULL END,
            CASE WHEN v_token_status IN ('serving', 'completed') THEN v_serving_ts ELSE NULL END,
            CASE WHEN v_token_status = 'completed' THEN v_completed_ts ELSE NULL END,
            v_day_ts,
            v_day_ts
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            called_at = EXCLUDED.called_at,
            serving_at = EXCLUDED.serving_at,
            completed_at = EXCLUDED.completed_at;
        ELSE
          INSERT INTO queue_tokens (
            id, session_id, clinic_id, token_number, patient_id, doctor_id, appointment_id,
            status, priority, called_at, serving_at, completed_at, created_at
          )
          VALUES (
            v_token_id, v_session_id, v_clinic_id, v_token_num, v_patient_id, v_doctor_id, v_appt_id,
            v_token_status,
            CASE WHEN v_slot = 10 THEN 'emergency'::appointment_priority ELSE 'normal'::appointment_priority END,
            CASE WHEN v_token_status IN ('called', 'serving', 'completed') THEN v_day_ts + INTERVAL '5 minutes' ELSE NULL END,
            CASE WHEN v_token_status IN ('serving', 'completed') THEN v_serving_ts ELSE NULL END,
            CASE WHEN v_token_status = 'completed' THEN v_completed_ts ELSE NULL END,
            v_day_ts
          )
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
        END IF;

        IF v_has_consultations AND v_token_status IN ('serving', 'completed') THEN
          v_consult_id := ('1000' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid;
          v_consult_status := CASE WHEN v_token_status = 'serving' THEN 'in_progress' ELSE 'completed' END;

          INSERT INTO consultations (
            id, clinic_id, appointment_id, queue_token_id, doctor_id, patient_id,
            status, started_at, ended_at, created_at
          )
          VALUES (
            v_consult_id, v_clinic_id, v_appt_id, v_token_id, v_doctor_id, v_patient_id,
            v_consult_status, v_serving_ts,
            CASE WHEN v_consult_status = 'completed' THEN v_completed_ts ELSE NULL END,
            v_serving_ts
          )
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

          INSERT INTO consultation_notes (consultation_id, clinic_id, symptoms, diagnosis, clinical_notes)
          VALUES (
            v_consult_id, v_clinic_id,
            v_complaints[1 + ((v_day_idx + v_slot) % array_length(v_complaints, 1))],
            v_diagnoses[1 + ((v_day_idx + v_slot) % array_length(v_diagnoses, 1))],
            'Advised rest, hydration, and follow-up if symptoms persist.'
          )
          ON CONFLICT (consultation_id) DO UPDATE SET diagnosis = EXCLUDED.diagnosis;

          v_visit_num := (v_day_idx * 10) + v_slot;
          v_emr_id := ('1001' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid;

          INSERT INTO emr_records (
            id, clinic_id, patient_id, consultation_id, visit_number, summary, vitals_snapshot, created_at
          )
          VALUES (
            v_emr_id, v_clinic_id, v_patient_id, v_consult_id, v_visit_num,
            jsonb_build_object(
              'chief_complaint', v_complaints[1 + ((v_day_idx + v_slot) % array_length(v_complaints, 1))],
              'diagnosis', v_diagnoses[1 + ((v_day_idx + v_slot) % array_length(v_diagnoses, 1))],
              'plan', 'Medication + lifestyle advice'
            ),
            jsonb_build_object('bp', '120/80', 'pulse', 76, 'temp_c', 37.1),
            v_completed_ts
          )
          ON CONFLICT (consultation_id) DO NOTHING;
        END IF;

        IF v_has_billing AND v_token_status = 'completed' THEN
          v_amount := 500 + ((v_slot * 137 + v_day_idx * 53) % 800);
          v_bill_id := ('3000' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid;
          v_bill_status := CASE
            WHEN v_day_offset = 0 AND v_slot = 5 THEN 'unpaid'
            WHEN v_day_offset = 0 AND v_slot = 4 THEN 'partial'
            ELSE 'paid'
          END;

          INSERT INTO bills (
            id, clinic_id, patient_id, consultation_id, invoice_number, status,
            subtotal, tax_amount, total_amount, paid_amount, patient_amount,
            created_by, created_at
          )
          VALUES (
            v_bill_id, v_clinic_id, v_patient_id,
            CASE WHEN v_has_consultations THEN ('1000' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid ELSE NULL END,
            'CHC-' || to_char(v_day, 'YYYYMM') || '-' || lpad((v_day_idx * 10 + v_slot)::text, 4, '0'),
            v_bill_status,
            v_amount,
            round(v_amount * 0.05, 2),
            round(v_amount * 1.05, 2),
            CASE v_bill_status
              WHEN 'paid' THEN round(v_amount * 1.05, 2)
              WHEN 'partial' THEN round(v_amount * 1.05 * 0.5, 2)
              ELSE 0
            END,
            round(v_amount * 1.05, 2),
            v_recep_id,
            v_completed_ts + INTERVAL '8 minutes'
          )
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

          IF NOT EXISTS (SELECT 1 FROM bill_line_items WHERE bill_id = v_bill_id) THEN
            INSERT INTO bill_line_items (bill_id, clinic_id, description, item_type, quantity, unit_price, amount)
            VALUES (
              v_bill_id, v_clinic_id,
              'Consultation — Dr. Amit Verma',
              'consultation', 1, v_amount, v_amount
            );
          END IF;

          IF v_bill_status IN ('paid', 'partial') THEN
            v_payment_id := ('3100' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid;
            INSERT INTO payments (
              id, clinic_id, bill_id, patient_id, amount, method, status,
              paid_at, recorded_by, created_at
            )
            VALUES (
              v_payment_id, v_clinic_id, v_bill_id, v_patient_id,
              CASE v_bill_status WHEN 'partial' THEN round(v_amount * 1.05 * 0.5, 2) ELSE round(v_amount * 1.05, 2) END,
              v_payment_methods[1 + ((v_day_idx + v_slot) % array_length(v_payment_methods, 1))],
              'completed',
              v_completed_ts + INTERVAL '12 minutes',
              v_recep_id,
              v_completed_ts + INTERVAL '12 minutes'
            )
            ON CONFLICT (id) DO NOTHING;
          END IF;
        END IF;
      END IF;

      -- Future teleconsult sessions
      IF v_has_teleconsult AND v_day_offset > 0 AND v_slot = 9 THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teleconsult_sessions') THEN
          INSERT INTO teleconsult_sessions (
            id, clinic_id, appointment_id, doctor_id, patient_id, room_id, status
          )
          VALUES (
            ('8000' || lpad(v_day_idx::text, 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid,
            v_clinic_id, v_appt_id, v_doctor_id, v_patient_id,
            'city-health-' || to_char(v_day, 'YYYYMMDD') || '-slot' || v_slot,
            'scheduled'::teleconsult_status
          )
          ON CONFLICT (appointment_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- =========================================================================
  -- EXTRA DAILY REVENUE (ensures 14-day chart is never flat/zero)
  -- =========================================================================
  IF v_has_billing THEN
    FOR v_day_offset IN -13..0 LOOP
      v_day := v_today + v_day_offset;
      v_day_idx := v_day_offset + 13;
      v_patient_id := v_patient_ids[1 + (v_day_idx % v_patient_count)];
      v_amount := 2500 + (v_day_idx * 430) % 6000;
      v_bill_id := ('3200' || lpad(v_day_idx::text, 2, '0') || '01-0000-4000-8000-000000000001')::uuid;
      v_payment_id := ('3210' || lpad(v_day_idx::text, 2, '0') || '01-0000-4000-8000-000000000001')::uuid;

      INSERT INTO bills (
        id, clinic_id, patient_id, invoice_number, status,
        subtotal, tax_amount, total_amount, paid_amount, patient_amount,
        created_by, created_at
      )
      VALUES (
        v_bill_id, v_clinic_id, v_patient_id,
        'CHC-REV-' || to_char(v_day, 'YYYYMMDD'),
        'paid', v_amount, round(v_amount * 0.05, 2), round(v_amount * 1.05, 2),
        round(v_amount * 1.05, 2), round(v_amount * 1.05, 2),
        v_recep_id, v_day::timestamptz + TIME '17:30'
      )
      ON CONFLICT (id) DO NOTHING;

      IF NOT EXISTS (SELECT 1 FROM bill_line_items WHERE bill_id = v_bill_id) THEN
        INSERT INTO bill_line_items (bill_id, clinic_id, description, item_type, quantity, unit_price, amount)
        VALUES (v_bill_id, v_clinic_id, 'OPD collection — ' || to_char(v_day, 'DD Mon'), 'consultation', 1, v_amount, v_amount);
      END IF;

      INSERT INTO payments (id, clinic_id, bill_id, patient_id, amount, method, status, paid_at, recorded_by)
      VALUES (
        v_payment_id, v_clinic_id, v_bill_id, v_patient_id,
        round(v_amount * 1.05, 2),
        v_payment_methods[1 + (v_day_idx % 3)],
        'completed',
        v_day::timestamptz + TIME '17:45',
        v_recep_id
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- =========================================================================
  -- LAB CATALOG + ORDERS
  -- =========================================================================
  IF v_has_lab THEN
    INSERT INTO lab_tests (id, clinic_id, name, code, price, description)
    VALUES
      ('20000001-0000-4000-8000-000000000001', v_clinic_id, 'Complete Blood Count (CBC)', 'CBC', 350, 'Hemogram'),
      ('20000002-0000-4000-8000-000000000002', v_clinic_id, 'Blood Sugar (Fasting)', 'FBS', 150, 'Fasting glucose'),
      ('20000003-0000-4000-8000-000000000003', v_clinic_id, 'Lipid Profile', 'LIPID', 600, 'Cholesterol panel'),
      ('20000004-0000-4000-8000-000000000004', v_clinic_id, 'Thyroid Profile (TSH)', 'TSH', 450, 'TSH screening'),
      ('20000005-0000-4000-8000-000000000005', v_clinic_id, 'HbA1c', 'HBA1C', 500, 'Glycated hemoglobin')
    ON CONFLICT (clinic_id, code) DO NOTHING;

    FOR v_slot IN 1..8 LOOP
      v_patient_id := v_patient_ids[v_slot];
      v_consult_id := ('1000' || lpad('07', 2, '0') || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid;
      IF EXISTS (SELECT 1 FROM consultations WHERE id = v_consult_id) THEN
        INSERT INTO lab_orders (id, clinic_id, patient_id, consultation_id, doctor_id, status, ordered_by, created_at)
        VALUES (
          ('200000' || lpad(v_slot::text, 2, '0') || '-0010-4000-8000-000000000001')::uuid,
          v_clinic_id, v_patient_id, v_consult_id, v_doctor_id,
          CASE WHEN v_slot <= 5 THEN 'completed'::lab_order_status WHEN v_slot <= 7 THEN 'processing'::lab_order_status ELSE 'ordered'::lab_order_status END,
          v_doctor_user, v_today::timestamptz - ((8 - v_slot) * INTERVAL '1 day')
        )
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- =========================================================================
  -- AI INSIGHTS: health risks + follow-up tasks
  -- =========================================================================
  IF v_has_health_risk THEN
    INSERT INTO health_risk_flags (id, clinic_id, patient_id, risk_type, severity, details)
    VALUES
      ('70000002-0000-4000-8000-000000000002', v_clinic_id, v_patient_raj, 'hypertension', 'high'::health_risk_severity,
        jsonb_build_object('bp_latest', '148/94', 'fasting_glucose', 126)),
      ('70000003-0000-4000-8000-000000000003', v_clinic_id, v_patient_sunita, 'diabetes', 'medium'::health_risk_severity,
        jsonb_build_object('hba1c', 6.8, 'bmi', 24.8)),
      ('70000004-0000-4000-8000-000000000004', v_clinic_id, v_patient_mohan, 'cardiac', 'high'::health_risk_severity,
        jsonb_build_object('age', 65, 'bp', '155/98')),
      ('70000005-0000-4000-8000-000000000005', v_clinic_id, v_patient_ids[8], 'obesity', 'medium'::health_risk_severity,
        jsonb_build_object('bmi', 31.2)),
      ('70000006-0000-4000-8000-000000000006', v_clinic_id, v_patient_ids[11], 'anxiety', 'low'::health_risk_severity,
        jsonb_build_object('notes', 'Reports sleep disturbance'))
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF v_has_follow_up THEN
    FOR v_slot IN 1..6 LOOP
      INSERT INTO follow_up_tasks (
        id, clinic_id, patient_id, medicine_name, scheduled_at, status, question
      )
      VALUES (
        ('700001' || lpad(v_slot::text, 2, '0') || '-0000-4000-8000-000000000001')::uuid,
        v_clinic_id,
        v_patient_ids[v_slot],
        (ARRAY['Amlodipine 5mg', 'Metformin 500mg', 'Paracetamol', 'Atorvastatin 10mg', 'Vitamin D3', 'Omeprazole'])[v_slot],
        v_today::timestamptz + ((v_slot - 3) * INTERVAL '2 days'),
        CASE WHEN v_slot <= 2 THEN 'pending'::follow_up_status WHEN v_slot <= 4 THEN 'sent'::follow_up_status ELSE 'responded'::follow_up_status END,
        'Are you taking your medication as prescribed? Any side effects?'
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  -- =========================================================================
  -- EXPENSES (owner accounting)
  -- =========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    INSERT INTO expenses (id, clinic_id, category, amount, expense_date, description, created_by)
    VALUES
      ('80000001-0000-4000-8000-000000000001', v_clinic_id, 'rent', 45000, v_month_start, 'Monthly clinic rent', v_owner_id),
      ('80000002-0000-4000-8000-000000000002', v_clinic_id, 'salary', 85000, v_month_start + 5, 'Staff salaries', v_owner_id),
      ('80000003-0000-4000-8000-000000000003', v_clinic_id, 'utilities', 6200, v_today - 3, 'Electricity + internet', v_owner_id),
      ('80000004-0000-4000-8000-000000000004', v_clinic_id, 'supplies', 3400, v_today - 1, 'Medical consumables', v_owner_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Historical EMR for returning / at-risk patient metrics
  FOR v_patient_idx IN 16..18 LOOP
    v_patient_id := v_patient_ids[v_patient_idx];
    v_consult_id := ('100099' || lpad(v_patient_idx::text, 2, '0') || '-0001-4000-8000-000000000001')::uuid;
    IF NOT EXISTS (SELECT 1 FROM consultations WHERE id = v_consult_id) THEN
      INSERT INTO consultations (id, clinic_id, doctor_id, patient_id, status, started_at, ended_at)
      VALUES (v_consult_id, v_clinic_id, v_doctor_id, v_patient_id, 'completed', v_today - 200, v_today - 200 + INTERVAL '20 minutes');
      INSERT INTO emr_records (id, clinic_id, patient_id, consultation_id, visit_number, summary, created_at)
      VALUES (
        ('100199' || lpad(v_patient_idx::text, 2, '0') || '-0001-4000-8000-000000000001')::uuid,
        v_clinic_id, v_patient_id, v_consult_id, 1,
        jsonb_build_object('diagnosis', 'Hypertension', 'plan', 'Lifestyle modification'),
        v_today - 200
      );
    END IF;
  END LOOP;

  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ City Health Clinic 14-day demo data loaded';
  RAISE NOTICE '  Clinic:      City Health Clinic (CLN-DEMO01)';
  RAISE NOTICE '  Patients:    20 | Appointments: ~140 (past 7 + today + next 7)';
  RAISE NOTICE '  Login:       owner@cityclinic.demo / ClinicOS2026!';
  RAISE NOTICE '  Dashboard:   /owner — revenue, queue, growth should be populated';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
