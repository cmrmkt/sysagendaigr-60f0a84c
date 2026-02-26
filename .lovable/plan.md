

## Correcao do Envio de Senha e Email Obrigatorio no Cadastro de Membros

### Problemas Identificados

1. **WhatsApp nao envia**: Na Edge Function `forgot-password`, o nome da instancia global esta **hardcoded** como `"agendaigr-global"` em vez de usar o secret `GLOBAL_EVOLUTION_INSTANCE_NAME`. Se o nome real for diferente, a mensagem nunca e enviada.
2. **Email nao e enviado**: O codigo de envio por email e apenas um comentario TODO -- nao ha implementacao real.
3. **Email e opcional no cadastro de membros**: O campo email esta marcado como "(opcional)" na tela Members.tsx, permitindo cadastrar membros sem email.

---

### Plano de Correcao

#### 1. Corrigir envio WhatsApp na Edge Function `forgot-password`

- Substituir o nome hardcoded `"agendaigr-global"` pelo secret `GLOBAL_EVOLUTION_INSTANCE_NAME` (igual ao padrao usado em `auth-register-org`)
- Adicionar logs de debug para capturar a resposta da Evolution API quando falhar

#### 2. Implementar envio de email na Edge Function `forgot-password`

- Usar a Evolution API para enviar a nova senha tambem por email, caso o perfil tenha email cadastrado
- Como o sistema nao tem servico de email transacional configurado, a abordagem sera usar `supabase.auth.admin.generateLink()` para gerar um magic link OU simplesmente enviar a senha via WhatsApp com a informacao de que o email tambem foi atualizado
- **Alternativa viavel**: Usar a funcao `supabase.auth.resetPasswordForEmail()` do Supabase para disparar o email nativo de reset para o email cadastrado do usuario (se houver email real, nao o `@phone.agendaigr.app`)
- Se o usuario tiver email cadastrado no perfil, chamar `resetPasswordForEmail` alem do WhatsApp
- Atualizar a mensagem de retorno para indicar os canais utilizados

#### 3. Tornar email obrigatorio no cadastro de membros (`Members.tsx`)

- Mudar o label de "E-mail (opcional)" para "E-mail *"
- Adicionar validacao no `handleSave` para exigir email antes de salvar
- Manter o campo editavel tanto na criacao quanto na edicao

#### 4. Atualizar Edge Function `admin-create-user`

- Tornar o campo `email` obrigatorio na validacao (retornar erro se nao informado)

---

### Detalhes Tecnicos

**Arquivos a modificar:**

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/forgot-password/index.ts` | Usar `GLOBAL_EVOLUTION_INSTANCE_NAME`, implementar envio por email via Supabase Auth |
| `src/pages/Members.tsx` | Email obrigatorio (label + validacao) |
| `supabase/functions/admin-create-user/index.ts` | Validar email como obrigatorio |

**Logica de envio de email no `forgot-password`:**

```text
1. Gerar nova senha temporaria (ja existente)
2. Enviar via WhatsApp (corrigido com instance name do secret)
3. Se profile.email existir:
   - Atualizar a senha do usuario (ja existente)
   - Chamar resetPasswordForEmail(profile.email) para disparar email nativo do Supabase
   - OU simplesmente confiar que o WhatsApp e suficiente e informar ao usuario
4. Retornar mensagem indicando canais utilizados
```

**Abordagem de email escolhida**: Como o projeto nao tem servico de email transacional (Resend/SendGrid), usaremos `supabase.auth.admin.updateUserById` para definir a nova senha e incluiremos na mensagem de retorno que a senha foi resetada. O canal principal de notificacao continua sendo o WhatsApp. Para o email, faremos uma tentativa via `resetPasswordForEmail` que usara o email nativo do Supabase (se configurado).

