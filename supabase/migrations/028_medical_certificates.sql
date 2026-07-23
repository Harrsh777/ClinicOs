-- Migration: 028_medical_certificates.sql
-- Module: Medical Certificates for ClinicOS

CREATE TYPE public.certificate_category AS ENUM (
  'sick_leave',
  'fitness',
  'medical_leave',
  'return_to_work',
  'hospitalization',
  'vaccination',
  'disability',
  'pregnancy',
  'travel_fitness',
  'sports_fitness',
  'custom'
);

CREATE TYPE public.certificate_status AS ENUM (
  'draft',
  'issued',
  'revoked',
  'expired'
);

-- Certificate Templates
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category public.certificate_category NOT NULL DEFAULT 'custom',
  description TEXT,
  content_html TEXT NOT NULL,
  fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Certificate Doctor Signatures & Stamps
CREATE TABLE IF NOT EXISTS public.certificate_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('digital_signature', 'handwritten_signature', 'clinic_stamp', 'header_logo', 'footer_logo')),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Issued Certificates
CREATE TABLE IF NOT EXISTS public.issued_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code TEXT UNIQUE NOT NULL,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  template_version INT NOT NULL DEFAULT 1,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date DATE,
  status public.certificate_status NOT NULL DEFAULT 'issued',
  revoked_reason TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  diagnosis TEXT,
  rest_duration_days INT,
  custom_fields_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NOT NULL,
  signature_url TEXT,
  stamp_url TEXT,
  header_url TEXT,
  qr_verification_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expiring_share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  share_token_expiry TIMESTAMPTZ,
  watermark_text TEXT DEFAULT 'OFFICIAL MEDICAL CERTIFICATE',
  pdf_storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Certificate Audit Logs
CREATE TABLE IF NOT EXISTS public.certificate_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.issued_certificates(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_certificate_templates_clinic ON public.certificate_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_clinic ON public.issued_certificates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_patient ON public.issued_certificates(patient_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_doctor ON public.issued_certificates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_token ON public.issued_certificates(qr_verification_token);
CREATE INDEX IF NOT EXISTS idx_certificate_audit_cert ON public.certificate_audit_logs(certificate_id);

-- Certificate Code Generator Function
CREATE OR REPLACE FUNCTION public.generate_certificate_code(p_clinic_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT := to_char(now(), 'YYYY');
  v_count INT;
  v_code TEXT;
BEGIN
  SELECT count(*) + 1 INTO v_count
  FROM public.issued_certificates
  WHERE clinic_id = p_clinic_id AND to_char(created_at, 'YYYY') = v_year;
  
  v_code := 'CERT-' || v_year || '-' || lpad(v_count::text, 5, '0');
  RETURN v_code;
END;
$$;

-- RLS Policies
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_audit_logs ENABLE ROW LEVEL SECURITY;

-- Certificate Templates RLS
DROP POLICY IF EXISTS templates_select ON public.certificate_templates;
CREATE POLICY templates_select ON public.certificate_templates
  FOR SELECT USING (is_system = true OR clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS templates_insert ON public.certificate_templates;
CREATE POLICY templates_insert ON public.certificate_templates
  FOR INSERT WITH CHECK (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS templates_update ON public.certificate_templates;
CREATE POLICY templates_update ON public.certificate_templates
  FOR UPDATE USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- Certificate Signatures RLS
DROP POLICY IF EXISTS signatures_all ON public.certificate_signatures;
CREATE POLICY signatures_all ON public.certificate_signatures
  FOR ALL USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- Issued Certificates RLS
DROP POLICY IF EXISTS issued_certs_select ON public.issued_certificates;
CREATE POLICY issued_certs_select ON public.issued_certificates
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    OR auth.role() = 'anon'
  );

DROP POLICY IF EXISTS issued_certs_insert ON public.issued_certificates;
CREATE POLICY issued_certs_insert ON public.issued_certificates
  FOR INSERT WITH CHECK (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS issued_certs_update ON public.issued_certificates;
CREATE POLICY issued_certs_update ON public.issued_certificates
  FOR UPDATE USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- Certificate Audit Logs RLS
DROP POLICY IF EXISTS cert_logs_select ON public.certificate_audit_logs;
CREATE POLICY cert_logs_select ON public.certificate_audit_logs
  FOR SELECT USING (
    certificate_id IN (
      SELECT id FROM public.issued_certificates
      WHERE clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Seed System Certificate Templates
INSERT INTO public.certificate_templates (title, category, description, is_system, content_html)
VALUES
(
  'Medical Sick Leave Certificate',
  'sick_leave',
  'Standard medical certificate advising sick leave and rest for a patient.',
  true,
  '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 20px;">
    <h2 style="text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 24px;">MEDICAL SICK LEAVE CERTIFICATE</h2>
    <p>This is to certify that <strong>{{patient_name}}</strong>, aged <strong>{{patient_age}}</strong> years, <strong>{{patient_gender}}</strong>, residing at {{patient_address}}, was examined by me on <strong>{{issue_date}}</strong>.</p>
    <p>The patient has been diagnosed with <strong>{{diagnosis}}</strong> and is suffering from an illness that renders them unfit for work/school duties.</p>
    <p>In my medical opinion, a period of medical absence and strict rest is advised for <strong>{{rest_days}} day(s)</strong> starting from <strong>{{issue_date}}</strong> to <strong>{{expiry_date}}</strong>.</p>
    <p style="margin-top: 30px;">The patient is expected to be fit to resume normal duties on <strong>{{expiry_date}}</strong>, subject to further clinical evaluation if symptoms persist.</p>
  </div>'
),
(
  'Medical Fitness Certificate',
  'fitness',
  'Standard certificate confirming physical and mental fitness after recovery or for employment/school.',
  true,
  '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 20px;">
    <h2 style="text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 24px;">MEDICAL FITNESS CERTIFICATE</h2>
    <p>This is to certify that I have clinically examined <strong>{{patient_name}}</strong>, aged <strong>{{patient_age}}</strong> years, <strong>{{patient_gender}}</strong> on <strong>{{issue_date}}</strong>.</p>
    <p>Based on physical examination and clinical history, the individual is found to be in good health, free from any contagious illness or debilitating physical condition that would interfere with their duties.</p>
    <p>I hereby certify that <strong>{{patient_name}}</strong> is medically <strong>FIT</strong> to resume regular activities / duty / academic attendance starting <strong>{{issue_date}}</strong>.</p>
  </div>'
),
(
  'Hospitalization & Discharge Certificate',
  'hospitalization',
  'Certificate documenting inpatient admission, treatment duration, and discharge fitness.',
  true,
  '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 20px;">
    <h2 style="text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 24px;">HOSPITALIZATION & DISCHARGE CERTIFICATE</h2>
    <p>This is to certify that <strong>{{patient_name}}</strong>, aged <strong>{{patient_age}}</strong> years, <strong>{{patient_gender}}</strong>, was admitted as an inpatient at <strong>{{clinic_name}}</strong> from <strong>{{issue_date}}</strong>.</p>
    <p><strong>Primary Diagnosis:</strong> {{diagnosis}}</p>
    <p>The patient underwent active clinical management and treatment under my supervision. Upon satisfactory clinical stability, the patient is discharged on <strong>{{expiry_date}}</strong> with advice for home convalescence of <strong>{{rest_days}} day(s)</strong>.</p>
  </div>'
),
(
  'Travel Fitness Certificate',
  'travel_fitness',
  'Certificate confirming patient fitness to travel by air, rail, or road.',
  true,
  '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 20px;">
    <h2 style="text-align: center; text-transform: uppercase; color: #0f172a; margin-bottom: 24px;">FITNESS TO TRAVEL CERTIFICATE</h2>
    <p>This is to certify that <strong>{{patient_name}}</strong>, Passport / ID: <strong>{{patient_id}}</strong>, aged <strong>{{patient_age}}</strong> years, was examined by me on <strong>{{issue_date}}</strong>.</p>
    <p>I confirm that the individual displays no symptoms of acute infectious disease and has been evaluated as <strong>FIT TO TRAVEL</strong> by air/land/sea for their scheduled journey.</p>
  </div>'
)
ON CONFLICT DO NOTHING;

-- Register Certificates module in system_modules table
INSERT INTO public.system_modules (key, name, description, icon, route_path, sort_order)
VALUES ('certificates', 'Medical Certificates', 'Issue and verify patient medical certificates', 'FileCheck', '/certificates', 35)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_active = true;

