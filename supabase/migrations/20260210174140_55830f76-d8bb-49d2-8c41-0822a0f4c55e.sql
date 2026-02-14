UPDATE scheduled_reminders 
SET remind_at = now() - interval '1 minute' 
WHERE id = '77ba47c9-0c35-479d-8045-629167482e49';