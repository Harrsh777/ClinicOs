-- Retention dashboard: editable visit reason and manual due override per patient
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS retention_visit_reason TEXT,
  ADD COLUMN IF NOT EXISTS retention_due_override NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS retention_last_visit_override DATE;

COMMENT ON COLUMN public.patients.retention_visit_reason IS 'Staff-editable last visit reason for retention outreach';
COMMENT ON COLUMN public.patients.retention_due_override IS 'Manual due amount override when billing data is incomplete';
COMMENT ON COLUMN public.patients.retention_last_visit_override IS 'Manual last visit date for patients imported via retention CSV';
