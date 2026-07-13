-- Google Meet link support for teleconsult sessions

ALTER TABLE public.teleconsult_sessions
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS meet_link_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.teleconsult_sessions.meeting_url IS 'Google Meet or other video meeting URL sent by the doctor';
COMMENT ON COLUMN public.teleconsult_sessions.meet_link_sent_at IS 'When the meeting link was sent to the patient via WhatsApp';
