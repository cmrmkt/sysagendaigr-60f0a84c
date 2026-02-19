

## Resolver Problemas de Seguranca Pendentes

Existem 3 itens pendentes, ordenados por prioridade:

---

### 1. [CRITICO] Chave Hardcoded no setup-super-admin

A Edge Function `setup-super-admin` usa uma chave fixa no codigo (`"SETUP_SUPER_ADMIN_2024"`). Qualquer pessoa com acesso ao codigo pode criar um Super Admin.

**Solucao:** Mover a chave para uma variavel de ambiente (Supabase Secret) e adicionar proteção extra.

**Alteracoes:**
- Criar secret `SUPER_ADMIN_SETUP_KEY` com valor aleatorio forte
- Atualizar `supabase/functions/setup-super-admin/index.ts` para ler de `Deno.env.get("SUPER_ADMIN_SETUP_KEY")`

---

### 2. [MEDIO] Validacao de Input no auth-register-org

A funcao `auth-register-org` aceita dados sem validacao adequada (nome da org, tax ID, etc).

**Solucao:** Adicionar validacao de comprimento e formato para os campos de entrada.

**Alteracoes:**
- Atualizar `supabase/functions/auth-register-org/index.ts` com validacoes de:
  - Nome da organizacao (max 100 chars, nao vazio)
  - Telefone (formato numerico, tamanho valido)
  - Country code (whitelist de paises suportados)
  - Nome do admin (max 100 chars)
  - Senha (min 6 chars)

---

### 3. [MEDIO] Leaked Password Protection (Config externa)

Esta configuracao fica no painel do Supabase, nao no codigo. Precisa ser ativada manualmente.

**Acao:** Acessar Supabase Dashboard > Authentication > Settings > Security e ativar "Leaked Password Protection". Isso impede que usuarios usem senhas ja vazadas em brechas de dados.

---

### Resumo

| Item | Severidade | Tipo | Esforco |
|---|---|---|---|
| Setup key hardcoded | Error | Codigo (Edge Function + Secret) | Baixo |
| Input validation auth-register-org | Warn | Codigo (Edge Function) | Baixo |
| Leaked password protection | Warn | Config externa (Supabase Dashboard) | Manual |

Os itens 1 e 2 serao resolvidos via codigo. O item 3 requer acao manual no painel do Supabase.

