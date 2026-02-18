
-- Drop the existing permissive SELECT policy for all users
DROP POLICY IF EXISTS "Users see own organization" ON public.organizations;

-- Create restricted SELECT policy: only admins/super_admins can see the base table
CREATE POLICY "Admins see own organization"
ON public.organizations FOR SELECT
USING (
  id = get_user_org(auth.uid())
  AND is_org_admin(auth.uid())
);

-- Create a secure view that excludes sensitive credentials
-- Uses security_invoker = false (SECURITY DEFINER) so it bypasses RLS on the base table
-- but filters by the calling user's organization via get_user_org(auth.uid())
CREATE OR REPLACE VIEW public.organizations_safe
WITH (security_invoker = false) AS
SELECT 
  id, name, slug, email, phone, address, logo_url,
  country_code, tax_id, city, state, postal_code,
  status, subscription_status, subscription_amount,
  billing_day, trial_ends_at, suspended_at,
  suspended_reason, reminder_settings,
  whatsapp_connected, whatsapp_connected_at,
  whatsapp_phone_number, created_at, updated_at
FROM public.organizations
WHERE id = get_user_org(auth.uid());

-- Grant access to the view for authenticated and anon users
GRANT SELECT ON public.organizations_safe TO authenticated;
GRANT SELECT ON public.organizations_safe TO anon;
