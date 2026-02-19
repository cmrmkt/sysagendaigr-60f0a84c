

## Resolver Definitivamente a Exposicao de Credenciais

### Problema
A tabela `organizations` ainda contem `evolution_api_url`, `evolution_api_key`, `evolution_instance_name`, `tax_id`, `billing_day`, `subscription_amount` — e a politica "Users see own organization" permite que qualquer membro leia tudo.

### Solucao: Tabela Separada para Credenciais

Mover as 3 colunas de API (`evolution_api_url`, `evolution_api_key`, `evolution_instance_name`) para uma nova tabela `organization_credentials`, acessivel apenas por admins e service role. A tabela `organizations` fica sem dados de API. Para os campos financeiros (`tax_id`, `billing_day`, `subscription_amount`), eles permanecem na tabela base pois sao necessarios para o funcionamento do sistema — o risco principal eram as credenciais de API.

### Alteracoes

**1. Migracao SQL**
- Criar tabela `organization_credentials` com RLS restrito a admins/super_admins
- Migrar dados existentes das 3 colunas de API
- Remover as 3 colunas sensiveis da tabela `organizations`
- Remover a view `organizations_safe` (desnecessaria)
- Remover a politica redundante "Admins see own organization"

**2. Edge Functions (8 funcoes)**
Atualizar para buscar credenciais de `organization_credentials` em vez de `organizations`:
- `send-whatsapp`
- `create-whatsapp-instance`
- `check-whatsapp-status`
- `disconnect-whatsapp`
- `get-whatsapp-qrcode`
- `test-whatsapp-connection`
- `send-instant-reminder`
- `process-reminders`

**3. Frontend**
- `useWhatsAppSettings.ts`: Ler de `organizations` diretamente (sem credenciais), corrigir `isConfigured` para usar `whatsapp_connected`
- `AuthContext.tsx`: Remover logica condicional admin/non-admin — todos leem de `organizations`

**4. Limpeza de findings de seguranca**

### Detalhes Tecnicos

| Componente | Alteracao |
|---|---|
| Migracao SQL | Criar `organization_credentials`, migrar dados, remover colunas e view |
| 8 Edge Functions | Ler credenciais de `organization_credentials` via service role |
| `useWhatsAppSettings.ts` | Remover campos de credenciais, usar `whatsapp_connected` |
| `AuthContext.tsx` | Simplificar leitura (todos leem tabela base) |

