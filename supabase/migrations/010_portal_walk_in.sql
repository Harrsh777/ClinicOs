-- Portal walk-in production settings

ALTER TABLE clinic_branding ADD COLUMN IF NOT EXISTS portal_walk_in_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE clinic_branding ADD COLUMN IF NOT EXISTS portal_max_daily_walk_ins INT DEFAULT 200;

CREATE INDEX IF NOT EXISTS idx_portal_otp_rate
  ON portal_otp_codes(clinic_id, phone, created_at DESC);
