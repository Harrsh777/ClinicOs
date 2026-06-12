-- =============================================================================
-- FIX: "Database error creating new user"
-- Run this in Supabase SQL Editor if user signup fails.
-- Root cause: auth trigger couldn't INSERT into profiles (RLS / unsafe role cast).
-- =============================================================================

-- 1. Recreate the signup trigger function (safe casts + never null full_name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role := 'patient';
  v_role_text TEXT;
BEGIN
  v_role_text := NEW.raw_user_meta_data->>'role';

  IF v_role_text IS NOT NULL AND v_role_text IN (
    'super_admin', 'clinic_owner', 'doctor', 'receptionist', 'finance_manager', 'patient'
  ) THEN
    v_role := v_role_text::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(split_part(COALESCE(NEW.email, 'user@clinicos.local'), '@', 1)), ''),
      'User'
    ),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

-- 2. Ensure correct ownership & grants (required for RLS bypass on Supabase)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- 3. Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Allow profile creation during signup (RLS was blocking INSERT)
DROP POLICY IF EXISTS profiles_insert_signup ON public.profiles;
CREATE POLICY profiles_insert_signup ON public.profiles
  FOR INSERT
  TO authenticated, service_role, supabase_auth_admin
  WITH CHECK (true);

-- 5. Users can also insert their own row if trigger was missing
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
