-- =============================================
-- TABELA DE FATURAS (invoices)
-- =============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_month DATE NOT NULL, -- Mês de referência da fatura
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_invoice_status CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'))
);

-- Índices para performance
CREATE INDEX idx_invoices_organization ON public.invoices(organization_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

-- Trigger para updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerenciar todas as faturas
CREATE POLICY "Super admins manage all invoices"
  ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Admins da org podem VER suas próprias faturas (somente leitura)
CREATE POLICY "Org admins view own invoices"
  ON public.invoices FOR SELECT
  USING (organization_id = get_user_org(auth.uid()) AND is_org_admin(auth.uid()));

-- =============================================
-- TABELA DE LOGS DE USO (usage_logs)
-- =============================================
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_usage_logs_organization ON public.usage_logs(organization_id);
CREATE INDEX idx_usage_logs_user ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_action ON public.usage_logs(action);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_resource ON public.usage_logs(resource_type, resource_id);

-- RLS para usage_logs
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Super admins podem ver todos os logs
CREATE POLICY "Super admins view all logs"
  ON public.usage_logs FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

-- Super admins podem inserir logs (via edge functions)
CREATE POLICY "Super admins insert logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Usuários autenticados podem inserir logs da própria organização
CREATE POLICY "Users insert own org logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (organization_id = get_user_org(auth.uid()));

-- =============================================
-- FUNÇÃO PARA REGISTRAR LOGS
-- =============================================
CREATE OR REPLACE FUNCTION public.log_action(
  _action TEXT,
  _resource_type TEXT DEFAULT NULL,
  _resource_id UUID DEFAULT NULL,
  _resource_name TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
  _org_id UUID;
BEGIN
  -- Obter organização do usuário
  SELECT get_user_org(auth.uid()) INTO _org_id;
  
  IF _org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.usage_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    metadata
  ) VALUES (
    _org_id,
    auth.uid(),
    _action,
    _resource_type,
    _resource_id,
    _resource_name,
    _metadata
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- =============================================
-- ADICIONAR CAMPO subscription_amount em organizations
-- =============================================
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2) DEFAULT 99.90,
ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;