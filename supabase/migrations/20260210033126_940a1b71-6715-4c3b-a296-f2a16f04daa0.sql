-- Add custom_reminder_templates column for per-event template overrides
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS custom_reminder_templates JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.events.custom_reminder_templates IS 'Per-event override templates. Structure: { "after_creation": { "title": "...", "body": "..." }, "before_due": { "title": "...", "body": "..." }, "on_due": { "title": "...", "body": "..." } }';