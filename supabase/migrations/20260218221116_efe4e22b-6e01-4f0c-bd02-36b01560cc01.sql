
-- 1. Drop the current SECURITY DEFINER view
DROP VIEW IF EXISTS public.organizations_safe;

-- 2. Add back a SELECT policy for ALL authenticated org users on the base table
-- (needed so the SECURITY INVOKER view can inherit this RLS)
CREATE POLICY "Users see own organization"
ON public.organizations FOR SELECT
USING (id = get_user_org(auth.uid()));

-- 3. Recreate the view with security_invoker = true (SECURITY INVOKER)
-- The view inherits the caller's RLS, and only exposes non-sensitive columns
CREATE VIEW public.organizations_safe
WITH (security_invoker = true) AS
SELECT 
  id, name, slug, email, phone, address, logo_url,
  country_code, tax_id, city, state, postal_code,
  status, subscription_status, subscription_amount,
  billing_day, trial_ends_at, suspended_at,
  suspended_reason, reminder_settings,
  whatsapp_connected, whatsapp_connected_at,
  whatsapp_phone_number, created_at, updated_at
FROM public.organizations;

-- 4. Grant access to the view
GRANT SELECT ON public.organizations_safe TO authenticated;
GRANT SELECT ON public.organizations_safe TO anon;
