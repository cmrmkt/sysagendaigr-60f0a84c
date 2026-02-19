
-- Fix 1: Drop overly permissive INSERT policy on notification_logs
-- Edge functions use service_role_key which bypasses RLS, so no INSERT policy needed
DROP POLICY IF EXISTS "Service role inserts notification logs" ON public.notification_logs;

-- Fix 2: Restrict organization UPDATE to safe columns only
-- Drop the broad policy
DROP POLICY IF EXISTS "Org admins can update own organization" ON public.organizations;

-- Revoke UPDATE on sensitive columns from authenticated role
REVOKE UPDATE ON public.organizations FROM authenticated;

-- Grant UPDATE only on safe columns
GRANT UPDATE (name, phone, email, address, city, state, postal_code, logo_url, 
              reminder_settings, whatsapp_connected, whatsapp_connected_at, 
              whatsapp_phone_number, evolution_instance_name, evolution_api_url, 
              evolution_api_key, country_code) 
ON public.organizations TO authenticated;

-- Re-create the policy with the same USING but restricted columns enforced at GRANT level
CREATE POLICY "Org admins can update own organization"
ON public.organizations FOR UPDATE
USING (id = get_user_org(auth.uid()) AND is_org_admin(auth.uid()))
WITH CHECK (id = get_user_org(auth.uid()) AND is_org_admin(auth.uid()));
