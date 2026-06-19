-- Public patient portal: OTP verification + branding access

CREATE TABLE IF NOT EXISTS portal_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_otp_lookup
  ON portal_otp_codes(phone, clinic_id, created_at DESC);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES clinic_visits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_visit ON payments(visit_id);

CREATE INDEX IF NOT EXISTS idx_clinic_branding_domain
  ON clinic_branding(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Public read for portal pages (branding + custom domain routing)
DROP POLICY IF EXISTS branding_public_read ON clinic_branding;
CREATE POLICY branding_public_read ON clinic_branding FOR SELECT TO anon
  USING (true);

-- Anon can read active clinic public fields (already exists on clinics)
-- Anon can read accepting doctors for booking widget
DROP POLICY IF EXISTS doctors_public_read ON doctors;
CREATE POLICY doctors_public_read ON doctors FOR SELECT TO anon
  USING (
    is_accepting_appointments = true
    AND clinic_id IN (SELECT id FROM clinics WHERE status = 'active')
  );

DROP POLICY IF EXISTS doctor_schedules_public_read ON doctor_schedules;
CREATE POLICY doctor_schedules_public_read ON doctor_schedules FOR SELECT TO anon
  USING (
    clinic_id IN (SELECT id FROM clinics WHERE status = 'active')
  );

DROP POLICY IF EXISTS appointments_public_slots ON appointments;
CREATE POLICY appointments_public_slots ON appointments FOR SELECT TO anon
  USING (
    clinic_id IN (SELECT id FROM clinics WHERE status = 'active')
  );

DROP POLICY IF EXISTS doctor_blocked_dates_public ON doctor_blocked_dates;
CREATE POLICY doctor_blocked_dates_public ON doctor_blocked_dates FOR SELECT TO anon
  USING (
    clinic_id IN (SELECT id FROM clinics WHERE status = 'active')
  );

-- Patients can look up their own visit by booking ID (via service role in API)
-- Portal OTP table: service role only (no RLS policies for anon)

ALTER TABLE portal_otp_codes ENABLE ROW LEVEL SECURITY;
