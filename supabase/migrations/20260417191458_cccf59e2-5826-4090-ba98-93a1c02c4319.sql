CREATE OR REPLACE FUNCTION public.get_org_last_logins()
RETURNS TABLE(organization_id uuid, last_login_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.organization_id,
    MAX(u.last_sign_in_at) AS last_login_at
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'super_admin'::app_role)
  GROUP BY p.organization_id;
$$;

REVOKE ALL ON FUNCTION public.get_org_last_logins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_last_logins() TO authenticated;