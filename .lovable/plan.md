
# Reestruturar Colunas da Tabela de Organizações

## Problema Atual
As colunas "Status" e "Assinatura" estão com informações misturadas. A coluna "Assinatura" mostra status de pagamento (Ativo, Trial, Inativo) em vez do tipo de plano, e a coluna "Status" mostra apenas o estado da conta sem contexto de pagamento.

## Nova Estrutura Proposta

### Coluna "Assinatura" (Tipo de Plano)
Mostra o **tipo** do plano contratado:
- **Teste (Xd)** - Período de teste com dias restantes (azul). Ex: "Teste (7d)", "Teste (3d)"
- **Teste (último dia)** - Último dia de teste (laranja)
- **Teste expirado** - Trial vencido (vermelho)
- **Mensal** - Assinatura mensal (verde)
- **Anual** - Assinatura anual (verde escuro)

Ao clicar, abre popover para alterar entre: Teste, Mensal, Anual.

### Coluna "Status" (Situação da Conta)
Mostra o **estado** da organização (sem alteração de lógica):
- **Ativo** (verde)
- **Pendente** (amarelo)
- **Suspenso** (vermelho)
- **Cancelado** (cinza)

Ao clicar, abre popover para alterar (já implementado).

## Detalhes Técnicos

### 1. Migração de Banco de Dados
Adicionar coluna `subscription_type` na tabela `organizations`:

```sql
ALTER TABLE public.organizations 
  ADD COLUMN subscription_type text NOT NULL DEFAULT 'trial';
```

Migrar dados existentes:
- Organizações com `subscription_status = 'trial'` recebem `subscription_type = 'trial'`
- Organizações com `subscription_status = 'active'` recebem `subscription_type = 'monthly'`
- Demais mantêm `subscription_type = 'trial'`

### 2. Atualizar StatusBadges.tsx
- Renomear `SubscriptionStatusBadge` para refletir o tipo de plano
- Criar novo componente `SubscriptionTypeBadge` que mostra Teste/Mensal/Anual
- Manter lógica de dias restantes do trial no badge de tipo

### 3. Atualizar Organizations.tsx
- Coluna "Assinatura": usar `subscription_type` + `trial_ends_at` para exibir tipo + dias
- Popover da coluna "Assinatura": opções Teste, Mensal, Anual
- Coluna "Status": manter como está (já mostra Ativo/Pendente/Suspenso/Cancelado)
- `handleChangeSubscription`: atualizar `subscription_type` em vez de `subscription_status`
- Ao mudar para "Mensal" ou "Anual", automaticamente setar `subscription_status = 'active'`
- Ao mudar para "Teste", manter/resetar `trial_ends_at`

### 4. Atualizar Hooks e Tipos
- Adicionar `subscription_type` ao tipo `OrganizationWithStats`
- Atualizar `useSubscriptionStatus` para considerar o novo campo
- Atualizar `SubscribersTab` e `ExpiredTrialsWidget` para usar a nova estrutura

### 5. Arquivos Afetados
- `supabase/migrations/` - nova migração
- `src/components/super-admin/StatusBadges.tsx` - novo badge de tipo
- `src/pages/super-admin/Organizations.tsx` - coluna e popover
- `src/hooks/useOrganizations.ts` - tipo atualizado
- `src/hooks/useSubscriptionStatus.ts` - lógica ajustada
- `src/components/super-admin/SubscribersTab.tsx` - badge atualizado
- `src/components/super-admin/ExpiredTrialsWidget.tsx` - badge atualizado
- `src/integrations/supabase/types.ts` - tipos regenerados
