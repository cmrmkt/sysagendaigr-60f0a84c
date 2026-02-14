-- Create table for event collaborator ministries
CREATE TABLE public.event_collaborator_ministries (
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, ministry_id)
);

-- Enable RLS
ALTER TABLE public.event_collaborator_ministries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users see own org event collaborator ministries" 
ON public.event_collaborator_ministries 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM events e 
  WHERE e.id = event_collaborator_ministries.event_id 
  AND e.organization_id = get_user_org(auth.uid())
));

CREATE POLICY "Event managers can manage collaborator ministries" 
ON public.event_collaborator_ministries 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM events e 
  WHERE e.id = event_collaborator_ministries.event_id 
  AND e.organization_id = get_user_org(auth.uid()) 
  AND (is_org_admin(auth.uid()) OR e.responsible_id = auth.uid())
));