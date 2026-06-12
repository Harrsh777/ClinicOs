-- =============================================================================
-- ClinicOS — Sprint 5 Migration
-- AI Platform + Telemedicine + Accounting + Commissions + White-label
-- Run AFTER 003_004_sprint_3_4.sql
-- =============================================================================

-- Extend appointment types for teleconsult
ALTER TYPE appointment_type ADD VALUE IF NOT EXISTS 'teleconsult';

-- ENUMS
DO $$ BEGIN
  CREATE TYPE teleconsult_status AS ENUM ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE follow_up_status AS ENUM ('pending', 'sent', 'responded', 'adherence_yes', 'adherence_no', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE health_risk_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM ('salary', 'rent', 'utilities', 'supplies', 'equipment', 'marketing', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TELEMEDICINE
-- =============================================================================

CREATE TABLE IF NOT EXISTS teleconsult_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL UNIQUE,
  status teleconsult_status NOT NULL DEFAULT 'scheduled',
  doctor_joined_at TIMESTAMPTZ,
  patient_joined_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  daily_room_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teleconsult_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES teleconsult_sessions(id) ON DELETE CASCADE,
  storage_path TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  duration_secs INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- AI FOLLOW-UP & HEALTH RISK
-- =============================================================================

CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  medicine_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status follow_up_status NOT NULL DEFAULT 'pending',
  question TEXT NOT NULL,
  response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL,
  severity health_risk_severity NOT NULL DEFAULT 'medium',
  details JSONB NOT NULL DEFAULT '{}',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- ACCOUNTING & COMMISSIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  category expense_category NOT NULL DEFAULT 'other',
  amount NUMERIC(12, 2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  doctor_percentage NUMERIC(5, 2) NOT NULL DEFAULT 60,
  clinic_percentage NUMERIC(5, 2) NOT NULL DEFAULT 40,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, doctor_id)
);

CREATE TABLE IF NOT EXISTS doctor_commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  doctor_share NUMERIC(12, 2) NOT NULL DEFAULT 0,
  clinic_share NUMERIC(12, 2) NOT NULL DEFAULT 0,
  adjustments NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, doctor_id, period_month)
);

-- =============================================================================
-- WHATSAPP & BRANDING
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  intent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0ea5e9',
  secondary_color TEXT DEFAULT '#14b8a6',
  custom_domain TEXT,
  white_label BOOLEAN NOT NULL DEFAULT false,
  whatsapp_number TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_teleconsult_clinic ON teleconsult_sessions(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_teleconsult_patient ON teleconsult_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_clinic ON follow_up_tasks(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_health_risk_patient ON health_risk_flags(patient_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_date ON expenses(clinic_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_commission_payouts ON doctor_commission_payouts(clinic_id, period_month);
CREATE INDEX IF NOT EXISTS idx_whatsapp_clinic ON whatsapp_messages(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_logs(clinic_id, feature, created_at DESC);

-- TRIGGERS
DROP TRIGGER IF EXISTS trg_teleconsult_updated ON teleconsult_sessions;
CREATE TRIGGER trg_teleconsult_updated BEFORE UPDATE ON teleconsult_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_branding_updated ON clinic_branding;
CREATE TRIGGER trg_branding_updated BEFORE UPDATE ON clinic_branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- SYSTEM MODULES
-- =============================================================================

INSERT INTO system_modules (key, name, description, icon, route_path, sort_order) VALUES
  ('teleconsult', 'Teleconsult', 'Video consultations', 'Video', '/teleconsult', 18),
  ('accounting', 'Accounting', 'P&L and expenses', 'Calculator', '/accounting', 80),
  ('commissions', 'Commissions', 'Doctor commission payouts', 'Percent', '/commissions', 85),
  ('ai_insights', 'AI Insights', 'AI billing and health insights', 'Sparkles', '/ai-insights', 90),
  ('branding', 'Branding', 'White-label and clinic branding', 'Palette', '/branding', 95),
  ('analytics', 'Analytics', 'Platform revenue and AI usage', 'BarChart3', '/analytics', 5)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_module_defaults (role, module_key, permission_level) VALUES
  ('clinic_owner', 'teleconsult', 'admin'),
  ('clinic_owner', 'accounting', 'admin'),
  ('clinic_owner', 'commissions', 'admin'),
  ('clinic_owner', 'ai_insights', 'admin'),
  ('clinic_owner', 'branding', 'admin'),
  ('doctor', 'teleconsult', 'write'),
  ('patient', 'teleconsult', 'read'),
  ('super_admin', 'analytics', 'admin')
ON CONFLICT (role, module_key) DO NOTHING;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE teleconsult_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teleconsult_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY teleconsult_clinic ON teleconsult_sessions FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY teleconsult_patient ON teleconsult_sessions FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY teleconsult_patient_update ON teleconsult_sessions FOR UPDATE TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY teleconsult_recordings_clinic ON teleconsult_recordings FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM teleconsult_sessions WHERE clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY follow_up_clinic ON follow_up_tasks FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY health_risk_clinic ON health_risk_flags FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY health_risk_doctor ON health_risk_flags FOR SELECT TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'read'));

CREATE POLICY expenses_clinic ON expenses FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('accounting', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('accounting', 'write'));

CREATE POLICY commission_rules_clinic ON doctor_commission_rules FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY commission_payouts_clinic ON doctor_commission_payouts FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY whatsapp_clinic ON whatsapp_messages FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY branding_clinic ON clinic_branding FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY branding_read ON clinic_branding FOR SELECT TO authenticated
  USING (true);

CREATE POLICY platform_audit_super ON platform_audit_logs FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY ai_logs_super ON ai_usage_logs FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');
