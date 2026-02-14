-- Adicionar coluna de configuracoes de lembretes na organizacao
ALTER TABLE organizations 
ADD COLUMN reminder_settings JSONB DEFAULT '{
  "enabled": true,
  "after_creation_days": 1,
  "before_due_days": [1],
  "on_due_day": false,
  "interval_reminders": {
    "enabled": false,
    "interval_days": 3,
    "max_reminders": 3
  }
}'::jsonb;

-- Criar tabela de lembretes agendados
CREATE TABLE scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('event', 'task', 'announcement')),
  resource_id UUID NOT NULL,
  resource_title TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('after_creation', 'before_due', 'on_due', 'interval')),
  recipient_ids UUID[] NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE INDEX idx_reminders_pending ON scheduled_reminders (remind_at) 
  WHERE sent_at IS NULL;
CREATE INDEX idx_reminders_resource ON scheduled_reminders (resource_type, resource_id);

-- RLS
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Policy para usuarios verem lembretes da propria organizacao
CREATE POLICY "Users see own org reminders" ON scheduled_reminders
  FOR SELECT USING (organization_id = get_user_org(auth.uid()));

-- Policy para admins e sistema gerenciarem lembretes
CREATE POLICY "Admins manage org reminders" ON scheduled_reminders
  FOR ALL USING (organization_id = get_user_org(auth.uid()) AND is_org_admin(auth.uid()));

-- Trigger para atualizar updated_at (se adicionar coluna futuramente)
COMMENT ON TABLE scheduled_reminders IS 'Tabela para armazenar lembretes agendados para eventos, tarefas e avisos';