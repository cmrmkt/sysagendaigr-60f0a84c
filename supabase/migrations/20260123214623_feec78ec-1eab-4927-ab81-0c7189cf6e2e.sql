-- Create event_templates table for storing default event configurations
CREATE TABLE public.event_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE SET NULL,
  default_start_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00',
  default_end_time TIME WITHOUT TIME ZONE DEFAULT '10:00:00',
  default_location TEXT,
  is_all_day BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'public',
  observations TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's templates
CREATE POLICY "Users see own org templates"
ON public.event_templates
FOR SELECT
USING (organization_id = get_user_org(auth.uid()));

-- Policy: Admins and leaders can manage templates
CREATE POLICY "Admins and leaders manage templates"
ON public.event_templates
FOR ALL
USING (
  organization_id = get_user_org(auth.uid()) 
  AND (is_org_admin(auth.uid()) OR has_role(auth.uid(), 'leader'))
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_event_templates_updated_at
BEFORE UPDATE ON public.event_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_event_templates_org ON public.event_templates(organization_id);
CREATE INDEX idx_event_templates_active ON public.event_templates(organization_id, is_active);