-- Add collaborator_ministry_ids and volunteer_user_ids columns to event_templates
ALTER TABLE public.event_templates
ADD COLUMN collaborator_ministry_ids uuid[] DEFAULT '{}',
ADD COLUMN volunteer_user_ids uuid[] DEFAULT '{}';