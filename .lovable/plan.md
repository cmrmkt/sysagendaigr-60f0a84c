

## Melhorias no Cadastro, Login e Recuperacao de Senha

### 1. Busca automatica de endereco pelo CEP (Register.tsx)

Quando o pais selecionado for **Brasil** e o usuario digitar um CEP valido (8 digitos), o sistema consultara a API publica `viacep.com.br/ws/{cep}/json/` para preencher automaticamente os campos **Endereco**, **Cidade** e **Estado**. Para outros paises, o comportamento permanece manual.

### 2. Reorganizacao visual do formulario de registro (Register.tsx)

O formulario sera dividido em 3 secoes visuais com separadores claros:

- **Dados da Igreja**: Nome da Igreja*, Telefone da Igreja (novo campo), CNPJ, CEP, Endereco, Cidade, Estado
- **Dados do Administrador do Sistema**: Nome Completo*, CPF*, Endereco*, Telefone*, WhatsApp* (campo RG sera removido)
- **Credenciais de Acesso ao Sistema**: opcao de login por telefone OU email, senha e confirmacao

### 3. Campos obrigatorios atualizados

- **Dados da Igreja**: todos obrigatorios EXCETO CNPJ (Nome*, Telefone*, CEP*, Endereco*, Cidade*, Estado*)
- **Dados do Administrador**: todos obrigatorios (Nome*, CPF*, Endereco*, Telefone*, WhatsApp*) -- campo RG/National ID removido
- **Credenciais**: telefone ou email obrigatorio, senha obrigatoria

### 4. Login por telefone OU email (Register.tsx + Login.tsx + Edge Functions)

- No registro, o usuario escolhe se quer fazer login com **telefone** ou **email**
- Na tela de login, adicionar campo de email como alternativa ao telefone
- A Edge Function `auth-register-org` sera atualizada para aceitar `loginEmail` como campo opcional e armazena-lo no perfil
- A Edge Function `auth-phone-login` sera atualizada para aceitar login por email direto (quando o email nao segue o padrao `@phone.agendaigr.app`)
- O `AuthContext.login()` sera atualizado para suportar ambos os metodos

### 5. Recuperacao de senha via WhatsApp E email (Login.tsx + forgot-password Edge Function)

- A tela "Esqueci minha senha" permitira informar telefone OU email
- A Edge Function `forgot-password` sera atualizada para:
  - Aceitar `email` como parametro alternativo ao `phone`
  - Se o usuario tiver email cadastrado no perfil, enviar a nova senha tambem por email via Supabase Auth `resetPasswordForEmail` ou mensagem simples
  - Manter o envio via WhatsApp como canal principal
  - A mensagem de retorno indicara ambos os canais utilizados

### 6. Campo de telefone na organizacao

- Adicionar campo `phone` da igreja no formulario (ja existe na tabela `organizations`)
- A Edge Function `auth-register-org` passara a salvar o telefone da igreja

---

### Detalhes Tecnicos

**Arquivos a modificar:**
- `src/pages/Register.tsx` -- reorganizacao, CEP auto-fill, campo telefone igreja, login por email, remover RG, campos obrigatorios
- `src/pages/Login.tsx` -- suporte a login por email, recuperacao por email
- `src/contexts/AuthContext.tsx` -- metodo login aceitar email
- `supabase/functions/auth-register-org/index.ts` -- aceitar loginEmail e orgPhone
- `supabase/functions/auth-phone-login/index.ts` -- aceitar login por email direto
- `supabase/functions/forgot-password/index.ts` -- aceitar email, enviar por email

**API ViaCEP:**
- URL: `https://viacep.com.br/ws/{cep}/json/`
- Chamada feita no frontend apos o usuario digitar 8 digitos no campo CEP (Brasil apenas)
- Resposta preenche: `logradouro` -> Endereco, `localidade` -> Cidade, `uf` -> Estado

**Tabela profiles:**
- Ja possui campo `email` -- sera usado para armazenar o email de login alternativo
- Campo `national_id` deixara de ser coletado no registro (pode manter na tabela para uso futuro)

