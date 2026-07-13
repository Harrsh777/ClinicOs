-- Per-clinic module enablement (platform admin controls which modules a clinic can use)

CREATE TABLE IF NOT EXISTS public.clinic_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES public.system_modules(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_clinic_modules_clinic_id ON public.clinic_modules(clinic_id);

ALTER TABLE public.clinic_modules ENABLE ROW LEVEL SECURITY;

-- Platform admin uses service role; clinic users read their own clinic's modules
CREATE POLICY clinic_modules_read ON public.clinic_modules
  FOR SELECT TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.profiles WHERE id = auth.uid()
    )
  );
