
-- Adicionar coluna subscription_type
ALTER TABLE public.organizations 
  ADD COLUMN subscription_type text NOT NULL DEFAULT 'trial';

-- Migrar dados existentes
UPDATE public.organizations 
SET subscription_type = 'monthly' 
WHERE subscription_status = 'active';
