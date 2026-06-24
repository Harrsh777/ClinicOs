-- Live Queue Module: doctor availability, token ordering, disposition tracking

DO $$ BEGIN
  CREATE TYPE doctor_queue_status AS ENUM (
    'not_arrived', 'available', 'consulting', 'break', 'emergency', 'finished'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE token_status ADD VALUE IF NOT EXISTS 'no_show';
ALTER TYPE token_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS queue_status doctor_queue_status NOT NULL DEFAULT 'not_arrived',
  ADD COLUMN IF NOT EXISTS queue_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_consultation_mins INT;

ALTER TABLE queue_tokens
  ADD COLUMN IF NOT EXISTS sort_order INT,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reason_for_visit TEXT,
  ADD COLUMN IF NOT EXISTS disposition TEXT,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

UPDATE queue_tokens SET sort_order = token_number WHERE sort_order IS NULL;
UPDATE queue_tokens SET checked_in_at = created_at WHERE checked_in_at IS NULL;

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS daily_patient_capacity INT DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_queue_tokens_sort ON queue_tokens (session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_doctor_status ON queue_tokens (doctor_id, status);

-- Enable realtime on doctors for live status panel
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE doctors;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
