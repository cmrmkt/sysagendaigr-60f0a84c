
-- 1. Create organization_credentials table
CREATE TABLE public.organization_credentials (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  evolution_api_url text,
  evolution_api_key text,
  evolution_instance_name text
);

-- 2. Enable RLS
ALTER TABLE public.organization_credentials ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Only admins/super_admins can read
CREATE POLICY "Admins read own org credentials"
ON public.organization_credentials
FOR SELECT
USING (
  organization_id = get_user_org(auth.uid())
  AND is_org_admin(auth.uid())
);

-- 4. RLS: Only admins/super_admins can manage
CREATE POLICY "Admins manage own org credentials"
ON public.organization_credentials
FOR ALL
USING (
  organization_id = get_user_org(auth.uid())
  AND is_org_admin(auth.uid())
);

-- 5. Super admins manage all
CREATE POLICY "Super admins manage all credentials"
ON public.organization_credentials
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- 6. Migrate existing data
INSERT INTO public.organization_credentials (organization_id, evolution_api_url, evolution_api_key, evolution_instance_name)
SELECT id, evolution_api_url, evolution_api_key, evolution_instance_name
FROM public.organizations
WHERE evolution_api_url IS NOT NULL OR evolution_api_key IS NOT NULL OR evolution_instance_name IS NOT NULL;

-- 7. Drop sensitive columns from organizations
ALTER TABLE public.organizations DROP COLUMN IF EXISTS evolution_api_url;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS evolution_api_key;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS evolution_instance_name;

-- 8. Drop the now-unnecessary organizations_safe view
DROP VIEW IF EXISTS public.organizations_safe;

-- 9. Remove redundant "Admins see own organization" policy (all users already have SELECT via "Users see own organization")
DROP POLICY IF EXISTS "Admins see own organization" ON public.organizations;
