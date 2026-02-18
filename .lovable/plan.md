

## Corrigir Exposicao de Credenciais na Tabela Organizations

### Problema
A politica RLS "Users see own organization" permite que **qualquer usuario autenticado** da organizacao leia todas as colunas da tabela `organizations`, incluindo credenciais sensiveis:
- `evolution_api_url` (URL da API do WhatsApp)
- `evolution_api_key` (Chave secreta da API)
- `evolution_instance_name` (Nome da instancia)

Isso significa que um usuario com papel "viewer" ou "leader" pode extrair essas credenciais e abusar da integracao WhatsApp.

### Solucao

Criar uma **view segura** da tabela `organizations` que exclui as colunas sensiveis, e ajustar as politicas RLS para que usuarios comuns so acessem a view.

### Alteracoes

**1. Migracao SQL**

- Criar a view `organizations_safe` com `security_invoker = on`, excluindo `evolution_api_url`, `evolution_api_key` e `evolution_instance_name`
- Remover a politica "Users see own organization" atual (que da SELECT completo)
- Criar nova politica "Users see own organization (safe)" que permite SELECT somente para admins na tabela base, e redirecionar usuarios comuns para a view
- Na pratica: manter SELECT na tabela base **apenas para admins e super_admins**, e criar politica SELECT na view para usuarios comuns

Porem, views com `security_invoker` herdam as politicas da tabela base, entao a abordagem correta e:

a) Alterar a politica SELECT existente "Users see own organization" para **apenas admins**:
```sql
DROP POLICY "Users see own organization" ON public.organizations;

CREATE POLICY "Admins see own organization"
ON public.organizations FOR SELECT
USING (
  id = get_user_org(auth.uid())
  AND is_org_admin(auth.uid())
);
```

b) Criar uma view segura para usuarios comuns (sem colunas sensiveis):
```sql
CREATE VIEW public.organizations_safe
WITH (security_invoker = false) AS
SELECT id, name, slug, email, phone, address, logo_url,
       country_code, tax_id, city, state, postal_code,
       status, subscription_status, subscription_amount,
       billing_day, trial_ends_at, suspended_at,
       suspended_reason, reminder_settings,
       whatsapp_connected, whatsapp_connected_at,
       whatsapp_phone_number, created_at, updated_at
FROM public.organizations;
```

c) Conceder acesso a view para usuarios autenticados e criar RLS via funcao ou grant.

**Nota importante:** Views em Postgres nao suportam RLS diretamente. Para a view funcionar com isolamento, usamos `security_invoker = false` (SECURITY DEFINER) e adicionamos a clausula WHERE na definicao da view usando `auth.uid()`:

```sql
CREATE VIEW public.organizations_safe
WITH (security_invoker = false) AS
SELECT id, name, slug, ...
FROM public.organizations
WHERE id = get_user_org(auth.uid());
```

Isso garante que cada usuario so ve sua propria organizacao, sem expor credenciais.

**2. Frontend - `src/hooks/useWhatsAppSettings.ts`**
- Remover a leitura de `evolution_api_url`, `evolution_api_key`, `evolution_instance_name` do cliente
- O hook ja nao precisa dessas colunas porque todas as operacoes WhatsApp sao feitas via Edge Functions (que usam service_role_key)
- Substituir `isConfigured` por verificar apenas `whatsapp_connected` ou `evolution_instance_name` via a view segura

**3. Frontend - `src/contexts/AuthContext.tsx` e outros hooks**
- Verificar se algum hook le da tabela `organizations` diretamente e ajustar para usar `organizations_safe` quando o usuario nao for admin
- O hook `useOrganizations` (super admin) continuara lendo da tabela base (a politica "Super admins manage organizations" ja permite)

**4. Edge Functions** (sem alteracao necessaria)
- Todas as edge functions ja usam `SUPABASE_SERVICE_ROLE_KEY`, que ignora RLS
- Continuarao lendo `evolution_api_url`, `evolution_api_key`, `evolution_instance_name` normalmente

### Resumo das alteracoes por arquivo

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Criar view `organizations_safe`, restringir politica SELECT da tabela base |
| `src/hooks/useWhatsAppSettings.ts` | Remover leitura de credenciais, usar apenas campos nao-sensiveis |
| `src/contexts/AuthContext.tsx` | Usar `organizations_safe` para leitura de dados da org do usuario |
| Edge Functions | Nenhuma alteracao |

