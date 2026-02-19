

## Adicionar coluna "Ultimo Login" na tabela de Organizacoes

### Problema
Atualmente, o "Ultimo Acesso" e obtido da tabela `usage_logs`, que rastreia qualquer acao no sistema. O usuario quer uma coluna especifica para registrar a data e hora do ultimo login de cada organizacao.

### Solucao

**1. Adicionar coluna `last_login_at` na tabela `organizations`**
- Nova coluna `last_login_at` do tipo `timestamp with time zone`, nullable, sem valor padrao.

**2. Atualizar a Edge Function `auth-phone-login`**
- Apos login bem-sucedido, atualizar o campo `last_login_at` da organizacao do usuario com `NOW()` usando o client com service role.

**3. Atualizar a interface do Super Admin**
- Substituir a coluna "Ultimo Acesso" (baseada em `usage_logs`) pela coluna "Ultimo Login" (baseada em `last_login_at`).
- Remover a consulta a `usage_logs` no hook `useOrganizations`, pois o dado agora vem diretamente da tabela `organizations`.

### Detalhes Tecnicos

**Migracao SQL:**
```sql
ALTER TABLE public.organizations
ADD COLUMN last_login_at timestamptz;
```

**Edge Function `auth-phone-login`** - adicionar apos login bem-sucedido:
```typescript
if (profile?.organization_id) {
  await supabaseAdmin
    .from("organizations")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", profile.organization_id);
}
```

**Hook `useOrganizations`:**
- Remover a consulta individual a `usage_logs` para cada organizacao (melhora performance).
- Usar `org.last_login_at` diretamente do campo da organizacao.

**Interface `Organizations.tsx`:**
- Renomear header "Ultimo Acesso" para "Ultimo Login".
- Usar `org.last_login_at` no lugar de `org.last_activity_at`.

### Beneficios
- Elimina N+1 queries na tabela `usage_logs` (uma por organizacao).
- Dado mais preciso: registra especificamente o login, nao qualquer acao.
- Performance melhorada no carregamento da lista de organizacoes.

