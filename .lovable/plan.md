

## Rastrear "Ultimo Acesso" dos Assinantes

### Objetivo
Adicionar uma coluna "Ultimo Acesso" na tabela de Organizacoes do Super Admin, mostrando quando (data e hora) alguem da organizacao usou o sistema pela ultima vez.

### Abordagem
Consultar a tabela `usage_logs` para obter o log mais recente de cada organizacao e exibir essa informacao diretamente na tabela existente.

### Alteracoes

**1. Hook `useOrganizations` (`src/hooks/useOrganizations.ts`)**
- Adicionar campo `last_activity_at` na interface `OrganizationWithStats`
- Dentro do loop que busca stats de cada org, adicionar uma query para buscar o `created_at` do log mais recente da organizacao na tabela `usage_logs`:
  ```
  SELECT created_at FROM usage_logs
  WHERE organization_id = org.id
  ORDER BY created_at DESC
  LIMIT 1
  ```
- Mapear o resultado para `last_activity_at`

**2. Pagina de Organizacoes (`src/pages/super-admin/Organizations.tsx`)**
- Adicionar coluna "Ultimo Acesso" no `TableHeader` (entre "Criado em" e o menu de acoes)
- No `TableBody`, exibir a data/hora formatada (ex: "14/02/2026 19:01") ou "Sem atividade" quando nao houver registros
- Usar icone `Clock` do lucide-react para acompanhar visualmente

### Detalhes Tecnicos
- A consulta usa a tabela `usage_logs` que ja possui RLS permitindo leitura para super admins
- Nenhuma migracao de banco necessaria -- os dados ja existem
- O formato de exibicao sera "dd/MM/yyyy HH:mm" usando `date-fns` (ja instalado)
- Sera exibido em texto com cor `text-muted-foreground` quando sem atividade

