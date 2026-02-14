-- Create enum for ministry participation type
CREATE TYPE public.ministry_role AS ENUM ('leader', 'member');

-- Add role column to user-ministry association
ALTER TABLE public.user_ministries 
ADD COLUMN role public.ministry_role NOT NULL DEFAULT 'member';

-- Add comment for documentation
COMMENT ON COLUMN public.user_ministries.role IS 
  'Tipo de participação: leader (líder do ministério) ou member (participante)';