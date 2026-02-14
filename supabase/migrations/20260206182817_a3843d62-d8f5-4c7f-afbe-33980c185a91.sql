-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the process-reminders function to run every 5 minutes
SELECT cron.schedule(
  'process-reminders-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tlrctcvitqvwdydpcmex.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscmN0Y3ZpdHF2d2R5ZHBjbWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjM5NzgsImV4cCI6MjA4NDY5OTk3OH0.iPq1sK633wNMSRvSjqIrY7-hl5twBcyCvaLqIdiPkBM"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Add unique constraint to push_subscriptions for upsert
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_endpoint_unique 
UNIQUE (user_id, endpoint);