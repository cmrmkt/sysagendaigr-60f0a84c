-- Adicionar colunas de status de conexão WhatsApp à tabela organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS whatsapp_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_connected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS whatsapp_phone_number text;