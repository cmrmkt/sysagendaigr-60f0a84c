
-- Add missing columns to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS postal_code text;

-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
