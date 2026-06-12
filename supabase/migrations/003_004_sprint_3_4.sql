-- =============================================================================
-- ClinicOS — Sprint 3 + Sprint 4 Migration
-- Run in Supabase SQL Editor AFTER schema.sql (or fix_auth_trigger.sql)
-- =============================================================================

-- ENUMS
CREATE TYPE consultation_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE bill_status AS ENUM ('draft', 'unpaid', 'partial', 'paid', 'cancelled');
CREATE TYPE bill_line_type AS ENUM ('consultation', 'lab', 'medicine', 'procedure', 'other');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'insurance', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE lab_order_status AS ENUM ('ordered', 'sample_collected', 'processing', 'completed', 'cancelled');
CREATE TYPE claim_status AS ENUM ('draft', 'submitted', 'processing', 'approved', 'rejected', 'paid');
CREATE TYPE inventory_tx_type AS ENUM ('in', 'out', 'adjustment');
CREATE TYPE alert_type AS ENUM ('low_stock', 'expiry', 'insurance_expiry');

-- =============================================================================
-- SPRINT 3 — CLINICAL CORE
-- =============================================================================

CREATE TABLE clinic_billing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  payment_methods JSONB NOT NULL DEFAULT '{"cash":true,"upi":true,"card":true,"insurance":true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  queue_token_id UUID REFERENCES queue_tokens(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status consultation_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  symptoms TEXT,
  diagnosis TEXT,
  clinical_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE emr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  visit_number INT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}',
  vitals_snapshot JSONB,
  is_immutable BOOLEAN NOT NULL DEFAULT true,
  addendum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  notes TEXT,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  allergy_acknowledged BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  referred_to TEXT NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status bill_status NOT NULL DEFAULT 'unpaid',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  insurance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  patient_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, invoice_number)
);

CREATE TABLE bill_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  item_type bill_line_type NOT NULL DEFAULT 'other',
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  gateway_ref TEXT,
  receipt_number TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- SPRINT 4 — OPERATIONS
-- =============================================================================

CREATE TABLE lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, code)
);

CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  status lab_order_status NOT NULL DEFAULT 'ordered',
  ordered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lab_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_path TEXT,
  file_name TEXT,
  result_values JSONB,
  ai_summary TEXT,
  ai_abnormal_flags JSONB,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  member_id TEXT,
  coverage_percent NUMERIC(5, 2) DEFAULT 80,
  expiry_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  claim_amount NUMERIC(12, 2) NOT NULL,
  approved_amount NUMERIC(12, 2),
  status claim_status NOT NULL DEFAULT 'draft',
  documents JSONB DEFAULT '[]',
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pharmacy_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  unit TEXT NOT NULL DEFAULT 'tablet',
  reorder_level INT NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, name)
);

CREATE TABLE pharmacy_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES pharmacy_medicines(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  purchase_price NUMERIC(10, 2),
  selling_price NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medicine_id, batch_number)
);

CREATE TABLE pharmacy_dispense (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  prescription_item_id UUID REFERENCES prescription_items(id) ON DELETE SET NULL,
  medicine_id UUID NOT NULL REFERENCES pharmacy_medicines(id) ON DELETE CASCADE,
  stock_id UUID REFERENCES pharmacy_stock(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  dispensed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'supplies',
  unit TEXT NOT NULL DEFAULT 'piece',
  quantity INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, name)
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  tx_type inventory_tx_type NOT NULL,
  quantity INT NOT NULL,
  reason TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES pharmacy_medicines(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES insurance_policies(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  cost_estimate NUMERIC(10, 4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_consultations_patient ON consultations(patient_id, started_at DESC);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id, started_at DESC);
CREATE INDEX idx_emr_patient ON emr_records(patient_id, visit_number DESC);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id, created_at DESC);
CREATE INDEX idx_bills_clinic_status ON bills(clinic_id, status);
CREATE INDEX idx_bills_patient ON bills(patient_id);
CREATE INDEX idx_payments_bill ON payments(bill_id);
CREATE INDEX idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX idx_insurance_policies_patient ON insurance_policies(patient_id);
CREATE INDEX idx_pharmacy_stock_expiry ON pharmacy_stock(expiry_date);
CREATE INDEX idx_inventory_alerts_clinic ON inventory_alerts(clinic_id, is_resolved);

-- TRIGGERS
CREATE TRIGGER trg_billing_settings_updated BEFORE UPDATE ON clinic_billing_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_consultations_updated BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_consultation_notes_updated BEFORE UPDATE ON consultation_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lab_orders_updated BEFORE UPDATE ON lab_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON insurance_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Invoice number generator
CREATE OR REPLACE FUNCTION generate_invoice_number(p_clinic_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_count INT;
BEGIN
  SELECT COALESCE(invoice_prefix, 'INV') INTO v_prefix
  FROM clinic_billing_settings WHERE clinic_id = p_clinic_id;
  IF v_prefix IS NULL THEN v_prefix := 'INV'; END IF;

  SELECT COUNT(*) + 1 INTO v_count FROM bills WHERE clinic_id = p_clinic_id;
  RETURN v_prefix || '-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Visit number generator
CREATE OR REPLACE FUNCTION get_next_visit_number(p_patient_id UUID)
RETURNS INT AS $$
DECLARE v_max INT;
BEGIN
  SELECT COALESCE(MAX(visit_number), 0) + 1 INTO v_max FROM emr_records WHERE patient_id = p_patient_id;
  RETURN v_max;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- NEW SYSTEM MODULES
-- =============================================================================

INSERT INTO system_modules (key, name, description, icon, route_path, sort_order) VALUES
  ('consultations', 'Consultations', 'Live consultation workflow', 'Stethoscope', '/consultations', 15),
  ('prescriptions', 'Prescriptions', 'E-prescriptions', 'Pill', '/prescriptions', 16),
  ('billing', 'Billing', 'Invoices and payments', 'Receipt', '/billing', 25),
  ('lab', 'Lab', 'Lab orders and reports', 'FlaskConical', '/lab', 35),
  ('insurance', 'Insurance', 'Policies and claims', 'ShieldCheck', '/insurance', 45),
  ('pharmacy', 'Pharmacy', 'Medicine stock and dispensing', 'PillBottle', '/pharmacy', 55),
  ('inventory', 'Inventory', 'Clinic supplies', 'Package', '/inventory', 65),
  ('revenue', 'Revenue', 'Revenue analytics', 'TrendingUp', '/revenue', 75)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_module_defaults (role, module_key, permission_level) VALUES
  ('clinic_owner', 'consultations', 'admin'),
  ('clinic_owner', 'prescriptions', 'admin'),
  ('clinic_owner', 'billing', 'admin'),
  ('clinic_owner', 'lab', 'admin'),
  ('clinic_owner', 'insurance', 'admin'),
  ('clinic_owner', 'pharmacy', 'admin'),
  ('clinic_owner', 'inventory', 'admin'),
  ('clinic_owner', 'revenue', 'admin'),
  ('doctor', 'consultations', 'write'),
  ('doctor', 'prescriptions', 'write'),
  ('doctor', 'lab', 'write'),
  ('receptionist', 'billing', 'write'),
  ('receptionist', 'lab', 'write'),
  ('receptionist', 'insurance', 'write'),
  ('receptionist', 'pharmacy', 'write'),
  ('finance_manager', 'billing', 'write'),
  ('finance_manager', 'revenue', 'read'),
  ('finance_manager', 'insurance', 'write'),
  ('patient', 'billing', 'read'),
  ('patient', 'prescriptions', 'read'),
  ('patient', 'lab', 'read')
ON CONFLICT (role, module_key) DO NOTHING;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE clinic_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE emr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_dispense ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Clinic-scoped staff access helper macro pattern
CREATE POLICY billing_settings_clinic ON clinic_billing_settings FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY consultations_clinic ON consultations FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('consultations', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('consultations', 'write'));

CREATE POLICY consultations_patient ON consultations FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY consultation_notes_clinic ON consultation_notes FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY emr_clinic ON emr_records FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('patients', 'read'));

CREATE POLICY emr_patient ON emr_records FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY prescriptions_clinic ON prescriptions FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('prescriptions', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('prescriptions', 'write'));

CREATE POLICY prescriptions_patient ON prescriptions FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY prescription_items_via_rx ON prescription_items FOR ALL TO authenticated
  USING (prescription_id IN (SELECT id FROM prescriptions WHERE clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())));

CREATE POLICY referrals_clinic ON referrals FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY bills_clinic ON bills FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('billing', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('billing', 'write'));

CREATE POLICY bills_patient ON bills FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY bill_items_clinic ON bill_line_items FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY payments_clinic ON payments FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('billing', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('billing', 'write'));

CREATE POLICY payments_patient ON payments FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY lab_tests_clinic ON lab_tests FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('lab', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('lab', 'write'));

CREATE POLICY lab_orders_clinic ON lab_orders FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('lab', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('lab', 'write'));

CREATE POLICY lab_orders_patient ON lab_orders FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY lab_order_items_clinic ON lab_order_items FOR ALL TO authenticated
  USING (lab_order_id IN (SELECT id FROM lab_orders WHERE clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY lab_reports_clinic ON lab_reports FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('lab', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('lab', 'write'));

CREATE POLICY lab_reports_patient ON lab_reports FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY insurance_policies_clinic ON insurance_policies FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('insurance', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('insurance', 'write'));

CREATE POLICY insurance_policies_patient ON insurance_policies FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY insurance_claims_clinic ON insurance_claims FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('insurance', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('insurance', 'write'));

CREATE POLICY pharmacy_medicines_clinic ON pharmacy_medicines FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('pharmacy', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('pharmacy', 'write'));

CREATE POLICY pharmacy_stock_clinic ON pharmacy_stock FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('pharmacy', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('pharmacy', 'write'));

CREATE POLICY pharmacy_dispense_clinic ON pharmacy_dispense FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('pharmacy', 'write'));

CREATE POLICY inventory_items_clinic ON inventory_items FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('inventory', 'read'))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('inventory', 'write'));

CREATE POLICY inventory_tx_clinic ON inventory_transactions FOR ALL TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()) AND has_module_permission('inventory', 'write'));

CREATE POLICY inventory_alerts_clinic ON inventory_alerts FOR SELECT TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY ai_logs_owner ON ai_usage_logs FOR SELECT TO authenticated
  USING (clinic_id = (SELECT clinic_id FROM profiles WHERE id = auth.uid()));

-- Storage bucket for lab reports & prescriptions PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clinical-documents', 'clinical-documents', false, 15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_clinical_docs ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'clinical-documents' AND (storage.foldername(name))[1] = (SELECT clinic_id::text FROM profiles WHERE id = auth.uid()))
  WITH CHECK (bucket_id = 'clinical-documents' AND (storage.foldername(name))[1] = (SELECT clinic_id::text FROM profiles WHERE id = auth.uid()));

-- Realtime for bills
ALTER PUBLICATION supabase_realtime ADD TABLE bills;
ALTER PUBLICATION supabase_realtime ADD TABLE lab_reports;

-- Seed default lab tests for new clinics (run per clinic via app or trigger - optional)
-- Default billing settings created when owner opens settings
