
-- Add column to store custom message template per event
ALTER TABLE public.events ADD COLUMN custom_message_template jsonb DEFAULT NULL;

-- Update reminder column to store the channel choice (auto/whatsapp) instead of old boolean-like values
COMMENT ON COLUMN public.events.reminder IS 'Reminder channel: auto, whatsapp, or null';
