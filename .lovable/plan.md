

## Notificacoes de Fatura para Admins + Correcao de Build

### 1. Corrigir erro de build no chart.tsx
O componente `chart.tsx` tem erros de tipo com a versao atual do Recharts. Sera atualizado para usar tipagem compativel com `recharts v3`.

### 2. Criar hook `useInvoiceAlerts`
Novo hook que consulta faturas da organizacao do admin logado e retorna alertas:
- Faturas com vencimento em ate 2 dias (status `pending`)
- Faturas vencidas (status `pending` ou `overdue`)
- Faturas ja pagas (`paid`) ou canceladas (`cancelled`) sao ignoradas

**Logica:**
```typescript
// Busca faturas da org do usuario logado (nao super_admin)
// Filtra: status != 'paid' && status != 'cancelled'
// Classifica: 'near_due' (2 dias ou menos) ou 'overdue' (vencida)
```

**Permissao necessaria:** Atualmente, apenas super_admins e org_admins podem ver faturas (RLS). O hook so sera habilitado para admins da organizacao.

### 3. Criar componente `InvoiceBanner`
Banner exibido no `AppLayout`, abaixo do `SubscriptionBanner`, visivel apenas para admins de organizacao (nao super_admin).

**Comportamento:**
- Fatura proxima do vencimento (2 dias): banner amarelo/amber com icone de relogio
  - Texto: "Fatura de R$ XX,XX vence em X dia(s) - DD/MM/YYYY"
- Fatura vencida: banner vermelho com icone de alerta
  - Texto: "Fatura de R$ XX,XX vencida em DD/MM/YYYY"
- Link para WhatsApp de suporte em ambos os casos
- Quando o super admin marca como paga, a fatura muda de status para `paid` e o banner desaparece automaticamente (a query e reativa via React Query)

### 4. Adicionar RLS para admins verem faturas da propria org
Atualmente, a politica `Org admins view own invoices` ja existe na tabela `invoices`, permitindo que admins vejam faturas de sua organizacao. Nao e necessaria migracao de RLS.

### Fluxo

```text
Admin faz login
  -> useInvoiceAlerts busca faturas pendentes/vencidas da org
  -> Se encontrar faturas near_due ou overdue:
     -> InvoiceBanner aparece no topo
  -> Super Admin marca fatura como paga
  -> React Query invalida cache de "invoices"
  -> Banner desaparece automaticamente
```

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `src/hooks/useInvoiceAlerts.ts` | Criar - hook que busca e classifica faturas |
| `src/components/layout/InvoiceBanner.tsx` | Criar - banner de alerta de fatura |
| `src/components/layout/AppLayout.tsx` | Modificar - adicionar InvoiceBanner |
| `src/components/ui/chart.tsx` | Modificar - corrigir erros de tipagem do Recharts v3 |

### Detalhes Tecnicos

**useInvoiceAlerts.ts:**
- Usa `useAuth()` para obter `organization` e `role`
- Habilitado apenas quando `role === 'admin'` e `organization` existe
- Query: `supabase.from('invoices').select('*').eq('organization_id', org.id).in('status', ['pending', 'overdue'])`
- Calcula `differenceInDays(parseISO(due_date), today)` para classificar

**InvoiceBanner.tsx:**
- Prioriza fatura vencida sobre proxima do vencimento (mostra a mais urgente)
- Design compacto similar ao SubscriptionBanner existente
- Inclui link para WhatsApp de suporte

**chart.tsx:**
- Adicionar type assertions para `payload` e `label` nas props do tooltip
- Corrigir tipagem do `ChartLegendContent` para compatibilidade com Recharts v3

