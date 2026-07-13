-- Platform admin credential vault (service role only — no RLS policies)
CREATE TABLE IF NOT EXISTS public.platform_clinic_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_code TEXT NOT NULL,
  staff_code TEXT NOT NULL,
  email TEXT NOT NULL,
  initial_password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'clinic_owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_clinic_credentials_clinic
  ON public.platform_clinic_credentials (clinic_id);

ALTER TABLE public.platform_clinic_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_audit_logs
  ALTER COLUMN admin_id DROP NOT NULL;
