-- Add Evolution API credentials columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS evolution_api_url text,
ADD COLUMN IF NOT EXISTS evolution_api_key text,
ADD COLUMN IF NOT EXISTS evolution_instance_name text;

-- Update the default value for reminder_settings to include send_time
ALTER TABLE public.organizations
ALTER COLUMN reminder_settings SET DEFAULT '{"enabled": true, "on_due_day": false, "before_due_days": [1], "send_time": "09:00", "interval_reminders": {"enabled": false, "interval_days": 3, "max_reminders": 3}, "after_creation_days": 1}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.evolution_api_url IS 'Evolution API base URL for WhatsApp integration';
COMMENT ON COLUMN public.organizations.evolution_api_key IS 'Evolution API key for authentication';
COMMENT ON COLUMN public.organizations.evolution_instance_name IS 'Evolution API instance name for this organization';