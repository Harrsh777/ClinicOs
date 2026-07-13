-- WhatsApp concierge bot: guided booking flow with menu, departments, and live slots

ALTER TABLE public.whatsapp_booking_sessions
  ADD COLUMN IF NOT EXISTS step TEXT,
  ADD COLUMN IF NOT EXISTS flow TEXT CHECK (flow IS NULL OR flow IN ('book', 'reschedule', 'ask', 'reports', 'reception')),
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_name TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'inbound',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.whatsapp_booking_sessions.step IS 'Current concierge step: menu, collect_name, select_department, select_doctor, select_date, select_slot, collect_reason, ask_question, etc.';
COMMENT ON COLUMN public.whatsapp_booking_sessions.flow IS 'Active concierge flow selected from the main menu';

CREATE INDEX IF NOT EXISTS idx_wa_booking_step
  ON public.whatsapp_booking_sessions (clinic_id, patient_phone, step)
  WHERE state = 'collecting';
