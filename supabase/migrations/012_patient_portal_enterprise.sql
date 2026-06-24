-- Patient portal RLS, plan features, and enterprise multi-tenant support

-- Patients can read their follow-up tasks
CREATE POLICY follow_up_patient_read ON follow_up_tasks FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY follow_up_patient_update ON follow_up_tasks FOR UPDATE TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- Patients can read their pharmacy dispense records
CREATE POLICY pharmacy_dispense_patient_read ON pharmacy_dispense FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- Expand plan feature flags for middleware gating
UPDATE plans SET features = features || '{"teleconsult":false,"ai_insights":false,"pharmacy":true,"lab":true,"billing":true}'::jsonb
WHERE slug = 'free';

UPDATE plans SET features = features || '{"teleconsult":true,"ai_insights":false,"pharmacy":true,"lab":true,"billing":true}'::jsonb
WHERE slug = 'pro';

UPDATE plans SET features = features || '{"teleconsult":true,"ai_insights":true,"pharmacy":true,"lab":true,"billing":true}'::jsonb
WHERE slug = 'enterprise';

-- Administrator module defaults for day-to-day ops
INSERT INTO role_module_defaults (role, module_key, permission_level) VALUES
  ('administrator', 'patients', 'write'),
  ('administrator', 'appointments', 'admin'),
  ('administrator', 'queue', 'admin'),
  ('administrator', 'billing', 'read'),
  ('patient', 'pharmacy', 'read'),
  ('patient', 'queue', 'read')
ON CONFLICT (role, module_key) DO NOTHING;
