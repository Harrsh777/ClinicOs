-- =============================================================================
-- ClinicOS AI — Unified Database Schema (Sprint 1 + Sprint 2 + RBAC)
-- Run this entire file in Supabase SQL Editor (or via `supabase db push`)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'clinic_owner',
  'doctor',
  'receptionist',
  'finance_manager',
  'patient'
);

CREATE TYPE clinic_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
CREATE TYPE allergy_severity AS ENUM ('mild', 'moderate', 'severe');
CREATE TYPE document_type AS ENUM ('report', 'xray', 'mri', 'prescription', 'insurance', 'other');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show');
CREATE TYPE appointment_type AS ENUM ('scheduled', 'walk_in', 'emergency', 'vip');
CREATE TYPE appointment_priority AS ENUM ('normal', 'vip', 'emergency');
CREATE TYPE token_status AS ENUM ('waiting', 'called', 'serving', 'completed', 'skipped');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE permission_level AS ENUM ('read', 'write', 'admin');

-- =============================================================================
-- PLATFORM & TENANT
-- =============================================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  status clinic_status NOT NULL DEFAULT 'trial',
  consultation_fee_default NUMERIC(10, 2) DEFAULT 500,
  opening_hours JSONB DEFAULT '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"},"sat":{"open":"09:00","close":"14:00"},"sun":null}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id)
);

-- =============================================================================
-- RBAC — MODULE PERMISSIONS
-- =============================================================================

CREATE TABLE system_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_module_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  module_key TEXT NOT NULL REFERENCES system_modules(key) ON DELETE CASCADE,
  permission_level permission_level NOT NULL DEFAULT 'read',
  UNIQUE (role, module_key)
);

CREATE TABLE staff_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES system_modules(key) ON DELETE CASCADE,
  permission_level permission_level NOT NULL DEFAULT 'read',
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, module_key)
);

-- =============================================================================
-- USERS & PROFILES
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  specialization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_module_permissions
  ADD CONSTRAINT staff_module_permissions_profile_fk
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE staff_module_permissions
  ADD CONSTRAINT staff_module_permissions_granted_by_fk
  FOREIGN KEY (granted_by) REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status invite_status NOT NULL DEFAULT 'pending',
  module_keys TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- PATIENTS (Sprint 1)
-- =============================================================================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  patient_code TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  aadhaar_encrypted TEXT,
  aadhaar_last_four TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, phone)
);

CREATE TABLE patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  height_cm NUMERIC(5, 2),
  weight_kg NUMERIC(5, 2),
  bmi NUMERIC(5, 2),
  temperature_c NUMERIC(4, 1),
  bp_systolic INT,
  bp_diastolic INT,
  pulse INT,
  spo2 INT,
  blood_sugar NUMERIC(5, 1),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  severity allergy_severity NOT NULL DEFAULT 'moderate',
  reaction TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  illnesses TEXT,
  surgeries TEXT,
  family_history TEXT,
  smoking_status TEXT,
  alcohol_status TEXT,
  chronic_conditions TEXT,
  notes TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id)
);

CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type document_type NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- APPOINTMENTS & QUEUE (Sprint 2)
-- =============================================================================

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  specialization TEXT,
  consultation_fee NUMERIC(10, 2),
  slot_duration_mins INT NOT NULL DEFAULT 15,
  is_accepting_appointments BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, day_of_week)
);

CREATE TABLE doctor_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, blocked_date)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  type appointment_type NOT NULL DEFAULT 'scheduled',
  priority appointment_priority NOT NULL DEFAULT 'normal',
  rejection_reason TEXT,
  notes TEXT,
  is_late BOOLEAN NOT NULL DEFAULT false,
  booked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE queue_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_token INT NOT NULL DEFAULT 0,
  avg_consultation_mins INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, session_date)
);

CREATE TABLE queue_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES queue_sessions(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  token_number INT NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  status token_status NOT NULL DEFAULT 'waiting',
  priority appointment_priority NOT NULL DEFAULT 'normal',
  called_at TIMESTAMPTZ,
  serving_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, token_number)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_profiles_clinic ON profiles(clinic_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_phone ON patients(clinic_id, phone);
CREATE INDEX idx_patients_user ON patients(user_id);
CREATE INDEX idx_patient_vitals_patient ON patient_vitals(patient_id, recorded_at DESC);
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, appointment_date);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_queue_tokens_session ON queue_tokens(session_id, status);
CREATE INDEX idx_staff_permissions_profile ON staff_module_permissions(profile_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_doctors_updated BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_queue_sessions_updated BEFORE UPDATE ON queue_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_staff_permissions_updated BEFORE UPDATE ON staff_module_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_medical_history_updated BEFORE UPDATE ON patient_medical_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate BMI on vitals insert/update
CREATE OR REPLACE FUNCTION calc_bmi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 AND NEW.weight_kg IS NOT NULL THEN
    NEW.bmi := ROUND((NEW.weight_kg / POWER(NEW.height_cm / 100.0, 2))::NUMERIC, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vitals_bmi BEFORE INSERT OR UPDATE ON patient_vitals FOR EACH ROW EXECUTE FUNCTION calc_bmi();

-- Sync profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role := 'patient';
  v_role_text TEXT;
BEGIN
  v_role_text := NEW.raw_user_meta_data->>'role';

  IF v_role_text IS NOT NULL AND v_role_text IN (
    'super_admin', 'clinic_owner', 'doctor', 'receptionist', 'finance_manager', 'patient'
  ) THEN
    v_role := v_role_text::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(split_part(COALESCE(NEW.email, 'user@clinicos.local'), '@', 1)), ''),
      'User'
    ),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Get next token number for a queue session
CREATE OR REPLACE FUNCTION get_next_token_number(p_session_id UUID)
RETURNS INT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(token_number), 0) + 1 INTO next_num
  FROM queue_tokens WHERE session_id = p_session_id;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Helper: get current user's profile
CREATE OR REPLACE FUNCTION auth_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check module permission
CREATE OR REPLACE FUNCTION has_module_permission(p_module_key TEXT, p_level permission_level DEFAULT 'read')
RETURNS BOOLEAN AS $$
DECLARE
  v_profile profiles;
  v_perm permission_level;
  v_default permission_level;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF v_profile IS NULL THEN RETURN false; END IF;

  IF v_profile.role = 'super_admin' THEN RETURN true; END IF;
  IF v_profile.role = 'clinic_owner' AND v_profile.clinic_id IS NOT NULL THEN RETURN true; END IF;

  SELECT permission_level INTO v_perm
  FROM staff_module_permissions
  WHERE profile_id = auth.uid() AND module_key = p_module_key;

  IF v_perm IS NOT NULL THEN
    IF p_level = 'read' THEN RETURN true; END IF;
    IF p_level = 'write' AND v_perm IN ('write', 'admin') THEN RETURN true; END IF;
    IF p_level = 'admin' AND v_perm = 'admin' THEN RETURN true; END IF;
    RETURN false;
  END IF;

  SELECT permission_level INTO v_default
  FROM role_module_defaults
  WHERE role = v_profile.role AND module_key = p_module_key;

  IF v_default IS NULL THEN RETURN false; END IF;
  IF p_level = 'read' THEN RETURN true; END IF;
  IF p_level = 'write' AND v_default IN ('write', 'admin') THEN RETURN true; END IF;
  IF p_level = 'admin' AND v_default = 'admin' THEN RETURN true; END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Plans: everyone authenticated can read; super admin manages via service role
CREATE POLICY plans_read ON plans FOR SELECT TO authenticated USING (is_active = true);

-- System modules: all authenticated users can read
CREATE POLICY modules_read ON system_modules FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY role_defaults_read ON role_module_defaults FOR SELECT TO authenticated USING (true);

-- Clinics
CREATE POLICY clinics_super_admin ON clinics FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY clinics_staff_read ON clinics FOR SELECT TO authenticated
  USING (id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY clinics_owner_update ON clinics FOR UPDATE TO authenticated
  USING (
    id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'clinic_owner'
  );

-- Public read for check-in (slug lookup only via anon policy on specific function)
CREATE POLICY clinics_public_slug ON clinics FOR SELECT TO anon
  USING (status = 'active');

-- Profiles
CREATE POLICY profiles_self ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_signup ON profiles FOR INSERT
  TO authenticated, service_role, supabase_auth_admin
  WITH CHECK (true);

CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_owner_manage ON profiles FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'clinic_owner'
  );

-- Staff module permissions
CREATE POLICY staff_perms_read ON staff_module_permissions FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR (
      clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
      AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('clinic_owner', 'super_admin')
    )
  );

CREATE POLICY staff_perms_owner_manage ON staff_module_permissions FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'clinic_owner'
  );

-- Staff invites
CREATE POLICY invites_owner ON staff_invites FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'clinic_owner'
  );

CREATE POLICY invites_accept ON staff_invites FOR SELECT TO authenticated
  USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Patients
CREATE POLICY patients_staff ON patients FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('patients', 'read')
  )
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('patients', 'write')
  );

CREATE POLICY patients_self ON patients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY patients_self_update ON patients FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Patient vitals, allergies, history, documents (same pattern)
CREATE POLICY vitals_access ON patient_vitals FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'read')
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'write')
  );

CREATE POLICY allergies_access ON patient_allergies FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'read')
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'write'));

CREATE POLICY history_access ON patient_medical_history FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'read')
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'write'));

CREATE POLICY documents_access ON patient_documents FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'read')
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'write'));

-- Doctors
CREATE POLICY doctors_clinic ON doctors FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) OR profile_id = auth.uid());

CREATE POLICY schedules_clinic ON doctor_schedules FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY blocked_dates_clinic ON doctor_blocked_dates FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

-- Appointments
CREATE POLICY appointments_staff ON appointments FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('appointments', 'read')
  )
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('appointments', 'write')
  );

CREATE POLICY appointments_patient ON appointments FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY appointments_patient_book ON appointments FOR INSERT TO authenticated
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- Queue
CREATE POLICY queue_sessions_staff ON queue_sessions FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('queue', 'read')
  )
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('queue', 'write')
  );

CREATE POLICY queue_sessions_public_read ON queue_sessions FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY queue_tokens_staff ON queue_tokens FOR ALL TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('queue', 'read')
  )
  WITH CHECK (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND has_module_permission('queue', 'write')
  );

CREATE POLICY queue_tokens_patient ON queue_tokens FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY queue_tokens_public_read ON queue_tokens FOR SELECT TO anon
  USING (true);

-- Notifications
CREATE POLICY notifications_own ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Subscriptions
CREATE POLICY subscriptions_read ON subscriptions FOR SELECT TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Audit logs
CREATE POLICY audit_clinic ON audit_logs FOR SELECT TO authenticated
  USING (
    clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('clinic_owner', 'super_admin')
  );

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-documents',
  'patient-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/dicom']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-assets',
  'clinic-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_patient_docs ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = (SELECT clinic_id::text FROM profiles WHERE id = auth.uid()))
  WITH CHECK (bucket_id = 'patient-documents' AND (storage.foldername(name))[1] = (SELECT clinic_id::text FROM profiles WHERE id = auth.uid()));

CREATE POLICY storage_clinic_assets ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'clinic-assets')
  WITH CHECK (bucket_id = 'clinic-assets');

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE queue_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =============================================================================
-- SEED DATA
-- =============================================================================

INSERT INTO plans (name, slug, price_monthly, features, limits) VALUES
  ('Free', 'free', 0, '{"patients":true,"appointments":true,"queue":true}', '{"max_staff":3,"max_patients":100}'),
  ('Pro', 'pro', 2999, '{"patients":true,"appointments":true,"queue":true,"analytics":true}', '{"max_staff":15,"max_patients":5000}'),
  ('Enterprise', 'enterprise', 9999, '{"patients":true,"appointments":true,"queue":true,"analytics":true,"white_label":true}', '{"max_staff":100,"max_patients":50000}')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO system_modules (key, name, description, icon, route_path, sort_order) VALUES
  ('dashboard', 'Dashboard', 'Overview and quick stats', 'LayoutDashboard', '', 0),
  ('patients', 'Patients', 'Patient registration and records', 'Users', '/patients', 10),
  ('appointments', 'Appointments', 'Booking and scheduling', 'Calendar', '/appointments', 20),
  ('queue', 'Live Queue', 'Token queue management', 'ListOrdered', '/queue', 30),
  ('staff', 'Staff', 'Team management and invites', 'UserCog', '/staff', 40),
  ('permissions', 'Permissions', 'Module access control', 'Shield', '/permissions', 50),
  ('settings', 'Clinic Settings', 'Clinic configuration', 'Settings', '/settings', 60),
  ('clinics', 'Clinics', 'Platform clinic management', 'Building2', '/clinics', 70),
  ('plans', 'Plans', 'Subscription plans', 'CreditCard', '/plans', 80),
  ('finance', 'Finance', 'Billing and revenue', 'IndianRupee', '/finance', 90)
ON CONFLICT (key) DO NOTHING;

-- Default module permissions per role
INSERT INTO role_module_defaults (role, module_key, permission_level) VALUES
  ('clinic_owner', 'dashboard', 'admin'),
  ('clinic_owner', 'patients', 'admin'),
  ('clinic_owner', 'appointments', 'admin'),
  ('clinic_owner', 'queue', 'admin'),
  ('clinic_owner', 'staff', 'admin'),
  ('clinic_owner', 'permissions', 'admin'),
  ('clinic_owner', 'settings', 'admin'),
  ('clinic_owner', 'finance', 'admin'),
  ('doctor', 'dashboard', 'read'),
  ('doctor', 'patients', 'read'),
  ('doctor', 'appointments', 'write'),
  ('receptionist', 'dashboard', 'read'),
  ('receptionist', 'patients', 'write'),
  ('receptionist', 'appointments', 'write'),
  ('receptionist', 'queue', 'write'),
  ('finance_manager', 'dashboard', 'read'),
  ('finance_manager', 'finance', 'write'),
  ('finance_manager', 'patients', 'read'),
  ('patient', 'dashboard', 'read'),
  ('patient', 'appointments', 'write'),
  ('patient', 'patients', 'read'),
  ('super_admin', 'dashboard', 'admin'),
  ('super_admin', 'clinics', 'admin'),
  ('super_admin', 'plans', 'admin')
ON CONFLICT (role, module_key) DO NOTHING;

-- =============================================================================
-- POST-SETUP: Create Super Admin (run AFTER creating auth user in Supabase Dashboard)
-- =============================================================================
-- 1. Go to Authentication → Users → Add user (email + password)
-- 2. Copy the user's UUID and run:
--
-- UPDATE profiles
-- SET role = 'super_admin', full_name = 'Platform Admin', is_active = true, clinic_id = NULL
-- WHERE id = 'PASTE-USER-UUID-HERE';
