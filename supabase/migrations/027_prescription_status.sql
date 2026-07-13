-- Prescription workflow status for clinic oversight & pharmacy coordination
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'finalized'
    CHECK (status IN ('draft', 'finalized', 'dispensed'));

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic_created
  ON prescriptions(clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_status
  ON prescriptions(clinic_id, status);
