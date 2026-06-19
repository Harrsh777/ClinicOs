-- =============================================================================
-- FIX: "Your account has been deactivated" on login
-- Cause: auth.users exists but profiles row is missing or is_active = false
-- Run in Supabase SQL Editor
-- =============================================================================

-- 1. Activate all demo accounts
UPDATE public.profiles
SET is_active = true
WHERE email IN (
  'admin@clinicos.demo',
  'owner@cityclinic.demo',
  'doctor@cityclinic.demo',
  'reception@cityclinic.demo',
  'patient@cityclinic.demo'
);

-- 2. Create missing profiles for auth users that have no profile row
INSERT INTO public.profiles (id, email, full_name, role, clinic_id, is_active)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1),
    'User'
  ),
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'role', '')::public.user_role,
    'patient'::public.user_role
  ),
  CASE
    WHEN COALESCE(u.raw_user_meta_data->>'role', '') = 'super_admin' THEN NULL
    ELSE 'a0000001-0000-4000-8000-000000000001'::uuid  -- City Health Clinic
  END,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.email IS NOT NULL;

-- 3. Ensure demo clinic code (for login)
UPDATE public.clinics
SET clinic_code = 'CLN-DEMO01'
WHERE id = 'a0000001-0000-4000-8000-000000000001'
   OR slug = 'city-health-clinic';

-- 4. Re-link demo staff to City Health Clinic
UPDATE public.profiles
SET
  clinic_id = 'a0000001-0000-4000-8000-000000000001',
  is_active = true,
  role = CASE email
    WHEN 'owner@cityclinic.demo'      THEN 'clinic_owner'::public.user_role
    WHEN 'doctor@cityclinic.demo'     THEN 'doctor'::public.user_role
    WHEN 'reception@cityclinic.demo'  THEN 'receptionist'::public.user_role
    WHEN 'patient@cityclinic.demo'    THEN 'patient'::public.user_role
    WHEN 'admin@clinicos.demo'        THEN 'super_admin'::public.user_role
    ELSE role
  END
WHERE email LIKE '%@cityclinic.demo' OR email = 'admin@clinicos.demo';

-- 5. Ensure clinic is active
UPDATE public.clinics
SET status = 'active'
WHERE slug = 'city-health-clinic' OR id = 'a0000001-0000-4000-8000-000000000001';

-- Verify
SELECT id, email, role, clinic_id, is_active
FROM public.profiles
WHERE email LIKE '%@cityclinic.demo' OR email = 'admin@clinicos.demo'
ORDER BY email;
