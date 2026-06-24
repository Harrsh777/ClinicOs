-- =============================================================================
-- Auth & User Lifecycle — staff codes, activation, OTP, departments, lockout
-- STEP 2 of 2 — run AFTER 011a_auth_lifecycle_enums.sql
-- =============================================================================

-- Profiles: staff codes, lifecycle flags, lockout
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_code TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS first_login BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS failed_login_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_clinic_staff_code
  ON public.profiles (clinic_id, staff_code)
  WHERE staff_code IS NOT NULL AND clinic_id IS NOT NULL;

-- Clinics: setup wizard state
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS clinic_setup_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clinic_type TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS enabled_services JSONB NOT NULL DEFAULT '[]';

-- Clinic applications: extended signup fields
ALTER TABLE public.clinic_applications
  ADD COLUMN IF NOT EXISTS clinic_type TEXT,
  ADD COLUMN IF NOT EXISTS doctor_count INT,
  ADD COLUMN IF NOT EXISTS official_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_mobile TEXT,
  ADD COLUMN IF NOT EXISTS gst TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false;

-- Departments (per clinic)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_clinic ON public.departments (clinic_id);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_fk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_fk
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE TRIGGER trg_departments_updated
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS departments_clinic ON public.departments;
CREATE POLICY departments_clinic ON public.departments
  FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- Account activation tokens (one-time password setup — never email passwords)
CREATE TABLE IF NOT EXISTS public.account_activation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_tokens_profile
  ON public.account_activation_tokens (profile_id, created_at DESC);

ALTER TABLE public.account_activation_tokens ENABLE ROW LEVEL SECURITY;

-- Signup OTP (email + mobile verification during clinic application)
CREATE TABLE IF NOT EXISTS public.signup_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'mobile')),
  target TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_otp_target
  ON public.signup_otp_codes (channel, target, created_at DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_profile
  ON public.password_resets (profile_id, created_at DESC);

-- Active sessions (owner can view / revoke)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_label TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_profile
  ON public.user_sessions (profile_id, last_active_at DESC);

-- Staff code generator (TEXT arg avoids enum commit ordering issues at CREATE time)
CREATE OR REPLACE FUNCTION public.staff_code_prefix(p_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'clinic_owner' THEN 'OWN'
    WHEN 'doctor' THEN 'DOC'
    WHEN 'receptionist' THEN 'REC'
    WHEN 'finance_manager' THEN 'FIN'
    WHEN 'nurse' THEN 'NUR'
    WHEN 'pharmacist' THEN 'PHA'
    WHEN 'lab_technician' THEN 'LAB'
    WHEN 'hr' THEN 'HR'
    WHEN 'administrator' THEN 'ADM'
    ELSE 'STF'
  END;
$$;

CREATE OR REPLACE FUNCTION public.generate_staff_code(
  p_clinic_id UUID,
  p_role public.user_role
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_num INT;
BEGIN
  v_prefix := public.staff_code_prefix(p_role::text);
  SELECT COALESCE(
    MAX(CAST(NULLIF(regexp_replace(staff_code, '^[A-Z]+-', ''), '') AS INT)),
    0
  ) + 1
  INTO v_num
  FROM public.profiles
  WHERE clinic_id = p_clinic_id
    AND staff_code ~ ('^' || v_prefix || '-[0-9]+$');

  RETURN v_prefix || '-' || lpad(v_num::text, 4, '0');
END;
$$;

-- Default role permissions for new staff roles
INSERT INTO public.role_module_defaults (role, module_key, permission_level) VALUES
  ('nurse', 'patients', 'read'),
  ('nurse', 'appointments', 'read'),
  ('nurse', 'queue', 'write'),
  ('pharmacist', 'pharmacy', 'write'),
  ('pharmacist', 'inventory', 'read'),
  ('pharmacist', 'patients', 'read'),
  ('lab_technician', 'lab', 'write'),
  ('lab_technician', 'patients', 'read'),
  ('hr', 'staff', 'write'),
  ('hr', 'settings', 'read'),
  ('administrator', 'dashboard', 'admin'),
  ('administrator', 'staff', 'admin'),
  ('administrator', 'settings', 'admin'),
  ('administrator', 'permissions', 'admin')
ON CONFLICT (role, module_key) DO NOTHING;

-- Super admin nav: clinic-requests alias module
INSERT INTO public.system_modules (key, name, description, icon, route_path, sort_order) VALUES
  ('clinic_requests', 'Clinic Requests', 'Pending clinic registration requests', 'Inbox', '/clinic-requests', 64)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_module_defaults (role, module_key, permission_level) VALUES
  ('super_admin', 'clinic_requests', 'admin')
ON CONFLICT (role, module_key) DO NOTHING;

-- Backfill staff codes for existing profiles
UPDATE public.profiles p
SET staff_code = public.generate_staff_code(p.clinic_id, p.role)
WHERE p.clinic_id IS NOT NULL
  AND p.staff_code IS NULL
  AND p.role NOT IN ('super_admin', 'patient');

-- Mark demo clinic as setup complete
UPDATE public.clinics
SET clinic_setup_completed = true
WHERE id = 'a0000001-0000-4000-8000-000000000001';
