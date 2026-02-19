

## Resolver Definitivamente a Exposicao de Credenciais

### Problema Raiz
A abordagem anterior com view segura criou um ciclo impossivel:
- `security_invoker = true` exige SELECT na tabela base para funcionar
- Mas se o usuario tem SELECT na tabela base, ele pode consultar diretamente e ver TODAS as colunas, incluindo credenciais

### Solucao Definitiva: Tabela Separada para Credenciais

Mover `evolution_api_url`, `evolution_api_key` e `evolution_instance_name` para uma tabela separada `organization_credentials`, acessivel apenas por admins e service role. Assim a tabela `organizations` fica segura para leitura por todos.

### Alteracoes

**1. Migracao SQL**

```text
+-------------------------------+
|    organization_credentials   |
+-------------------------------+
| organization_id (PK, FK)      |
| evolution_api_url             |
| evolution_api_key             |
| evolution_instance_name       |
+-------------------------------+
  RLS: apenas admins e super_admins
```

- Criar tabela `organization_credentials` com RLS restrito a admins
- Migrar dados existentes das 3 colunas de `organizations` para a nova tabela
- Remover as 3 colunas sensiveis da tabela `organizations`
- Remover a view `organizations_safe` (desnecessaria agora)
- Remover a politica "Admins see own organization" (redundante)
- Manter apenas "Users see own organization" na tabela base (agora segura)

**2. Edge Functions (8 funcoes)**
Atualizar as funcoes que leem credenciais para buscar de `organization_credentials` em vez de `organizations`:
- `send-whatsapp`
- `create-whatsapp-instance`
- `check-whatsapp-status`
- `disconnect-whatsapp`
- `get-whatsapp-qrcode`
- `test-whatsapp-connection`
- `send-instant-reminder`
- `process-reminders`

**3. Frontend - `src/hooks/useWhatsAppSettings.ts`**
- Remover campos de credenciais da interface `WhatsAppSettings`
- Ler diretamente da tabela `organizations` (agora segura, sem credenciais)
- Corrigir `isConfigured` para usar `whatsapp_connected` em vez de verificar credenciais vazias

**4. Frontend - `src/contexts/AuthContext.tsx`**
- Remover logica condicional admin/non-admin para leitura de organizacao
- Todos os usuarios podem ler de `organizations` diretamente (sem dados sensiveis)

**5. Limpeza de Findings**
- Deletar finding `organizations_table_sensitive_exposure`
- Deletar/ignorar finding `organizations_safe_no_rls` (view sera removida)

### Resumo

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Criar `organization_credentials`, migrar dados, remover colunas e view |
| 8 Edge Functions | Ler credenciais de `organization_credentials` |
| `useWhatsAppSettings.ts` | Remover campos de credenciais, corrigir `isConfigured` |
| `AuthContext.tsx` | Simplificar leitura de organizacao (todos leem da tabela base) |

