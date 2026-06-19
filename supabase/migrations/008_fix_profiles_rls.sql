-- Fix infinite recursion in profiles RLS (blocks login / middleware profile reads)

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
