-- Demo booking requests from the public landing page

DO $$ BEGIN
  CREATE TYPE public.demo_request_status AS ENUM ('new', 'contacted', 'scheduled', 'closed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  clinic_type TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  notes TEXT,
  status public.demo_request_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  accept_language TEXT,
  client_metadata JSONB NOT NULL DEFAULT '{}',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_status_created
  ON public.demo_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_demo_requests_email
  ON public.demo_requests (lower(email), created_at DESC);

CREATE TRIGGER trg_demo_requests_updated
  BEFORE UPDATE ON public.demo_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_requests_super_admin ON public.demo_requests;
CREATE POLICY demo_requests_super_admin ON public.demo_requests
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- Public insert via service role only (server actions)
DROP POLICY IF EXISTS demo_requests_public_insert ON public.demo_requests;
CREATE POLICY demo_requests_public_insert ON public.demo_requests
  FOR INSERT TO anon
  WITH CHECK (true);

INSERT INTO public.system_modules (key, name, description, icon, route_path, sort_order) VALUES
  ('demo_requests', 'Demo Requests', 'Book-a-demo leads from the landing page', 'CalendarClock', '/demo-requests', 66)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_module_defaults (role, module_key, permission_level) VALUES
  ('super_admin', 'demo_requests', 'admin')
ON CONFLICT (role, module_key) DO NOTHING;
