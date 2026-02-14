-- Create notification_logs table for tracking all push notifications
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  recipient_name TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can view notification logs
CREATE POLICY "Super admins view notification logs"
ON public.notification_logs
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Service role can insert logs (via edge functions)
CREATE POLICY "Service role inserts notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_recipient_id ON public.notification_logs(recipient_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);