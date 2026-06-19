-- =============================================================================
-- Sprint 7: Platform onboarding — clinic applications, clinic codes, admin nav
-- =============================================================================

-- Human-readable Clinic ID for login (e.g. CLN-A3F9K2)
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS clinic_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_clinic_code
  ON public.clinics (clinic_code)
  WHERE clinic_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_clinic_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'CLN-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.clinics WHERE clinic_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Backfill existing clinics
UPDATE public.clinics
SET clinic_code = public.generate_clinic_code()
WHERE clinic_code IS NULL;

ALTER TABLE public.clinics
  ALTER COLUMN clinic_code SET NOT NULL;

-- Clinic signup applications (pending platform admin approval)
DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.clinic_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  plan_slug TEXT NOT NULL DEFAULT 'pro',
  status public.application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_applications_status
  ON public.clinic_applications (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_applications_pending_email
  ON public.clinic_applications (lower(owner_email))
  WHERE status = 'pending';

CREATE TRIGGER trg_clinic_applications_updated
  BEFORE UPDATE ON public.clinic_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.clinic_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applications_super_admin ON public.clinic_applications;
CREATE POLICY applications_super_admin ON public.clinic_applications
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- Platform admin nav: applications + patients overview
INSERT INTO public.system_modules (key, name, description, icon, route_path, sort_order) VALUES
  ('applications', 'Applications', 'Clinic signup requests', 'Inbox', '/applications', 65),
  ('analytics', 'Analytics', 'Platform-wide analytics', 'BarChart3', '/analytics', 85)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_module_defaults (role, module_key, permission_level) VALUES
  ('super_admin', 'applications', 'admin'),
  ('super_admin', 'analytics', 'admin')
ON CONFLICT (role, module_key) DO NOTHING;
