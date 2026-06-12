-- =============================================================================
-- ClinicOS — Executive Dashboard, Secure Visits, Franchise, Queue v2
-- Run AFTER 005_sprint_5.sql (or 003_004 if 005 not applied)
-- =============================================================================

-- Franchise / multi-branch
CREATE TABLE IF NOT EXISTS franchise_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS franchise_group_id UUID REFERENCES franchise_groups(id) ON DELETE SET NULL;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS branch_label TEXT;

-- Visit & secure QR check-in
DO $$ BEGIN
  CREATE TYPE visit_payment_status AS ENUM ('not_required', 'pending', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE visit_check_in_status AS ENUM ('scheduled', 'checked_in', 'in_queue', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE token_series AS ENUM ('regular', 'emergency', 'vip');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS clinic_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_code TEXT NOT NULL UNIQUE,
  booking_id TEXT NOT NULL UNIQUE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  queue_token_id UUID REFERENCES queue_tokens(id) ON DELETE SET NULL,
  visit_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (visit_type IN ('scheduled', 'walk_in', 'emergency')),
  payment_status visit_payment_status NOT NULL DEFAULT 'not_required',
  check_in_status visit_check_in_status NOT NULL DEFAULT 'scheduled',
  qr_signature TEXT NOT NULL,
  token_label TEXT,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Queue token enhancements
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS token_series token_series NOT NULL DEFAULT 'regular';
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS series_number INT;
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS token_label TEXT;
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS payment_status visit_payment_status NOT NULL DEFAULT 'not_required';
ALTER TABLE queue_tokens ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES clinic_visits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_visits_clinic ON clinic_visits(clinic_id, check_in_status);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_booking ON clinic_visits(booking_id);
CREATE INDEX IF NOT EXISTS idx_clinic_visits_patient ON clinic_visits(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinics_franchise ON clinics(franchise_group_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_label ON queue_tokens(clinic_id, token_label);

-- Code generators
CREATE OR REPLACE FUNCTION generate_visit_code()
RETURNS TEXT AS $$
DECLARE v_num INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_num FROM clinic_visits;
  RETURN 'VIS-' || LPAD(v_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS TEXT AS $$
DECLARE v_num INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_num FROM clinic_visits;
  RETURN 'BK-' || TO_CHAR(now(), 'YYMMDD') || '-' || LPAD(v_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_token_label(p_session_id UUID, p_series token_series)
RETURNS TEXT AS $$
DECLARE v_num INT;
  v_prefix TEXT;
BEGIN
  v_prefix := CASE p_series WHEN 'emergency' THEN 'E' WHEN 'vip' THEN 'V' ELSE 'A' END;
  SELECT COUNT(*) + 1 INTO v_num
  FROM queue_tokens
  WHERE session_id = p_session_id AND token_series = p_series;
  RETURN v_prefix || '-' || LPAD(v_num::TEXT, CASE WHEN p_series = 'emergency' THEN 2 ELSE 0 END, '0');
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinic_visits_updated ON clinic_visits;
CREATE TRIGGER trg_clinic_visits_updated BEFORE UPDATE ON clinic_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Nav module
INSERT INTO system_modules (key, name, description, icon, route_path, sort_order) VALUES
  ('franchise', 'Franchise', 'Multi-branch consolidated view', 'Building2', '/franchise', 3)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_module_defaults (role, module_key, permission_level) VALUES
  ('clinic_owner', 'franchise', 'admin')
ON CONFLICT (role, module_key) DO NOTHING;

-- RLS
ALTER TABLE franchise_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY franchise_groups_owner ON franchise_groups FOR ALL TO authenticated
  USING (
    owner_profile_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY visits_clinic_staff ON clinic_visits FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY visits_patient ON clinic_visits FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));
