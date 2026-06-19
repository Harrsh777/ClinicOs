-- =============================================================================
-- FIX: Login loop / "profile_missing" / infinite recursion on profiles RLS
-- Run in Supabase SQL Editor
-- Error: "infinite recursion detected in policy for relation profiles"
-- =============================================================================

-- Helper functions (SECURITY DEFINER bypasses RLS — safe for policy checks)
CREATE OR REPLACE FUNCTION public.my_profile_clinic_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_profile_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_profile_role() TO authenticated;

-- Replace recursive profiles SELECT policies
DROP POLICY IF EXISTS profiles_self ON public.profiles;
CREATE POLICY profiles_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_clinic_read ON public.profiles;
CREATE POLICY profiles_clinic_read ON public.profiles
  FOR SELECT TO authenticated
  USING (
    clinic_id IS NOT NULL
    AND clinic_id = public.my_profile_clinic_id()
  );

DROP POLICY IF EXISTS profiles_super_admin_read ON public.profiles;
CREATE POLICY profiles_super_admin_read ON public.profiles
  FOR SELECT TO authenticated
  USING (public.my_profile_role() = 'super_admin');

-- Fix owner manage policy (was also self-referential)
DROP POLICY IF EXISTS profiles_owner_manage ON public.profiles;
CREATE POLICY profiles_owner_manage ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.my_profile_role() = 'clinic_owner'
    AND clinic_id = public.my_profile_clinic_id()
  )
  WITH CHECK (
    public.my_profile_role() = 'clinic_owner'
    AND clinic_id = public.my_profile_clinic_id()
  );

-- Verify (should return your profile row, not 500)
-- SELECT id, email, role, clinic_id FROM public.profiles WHERE id = auth.uid();
