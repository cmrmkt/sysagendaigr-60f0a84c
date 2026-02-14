# Documentação de Funcionalidades - Sistema de Agenda para Igrejas

## Visão Geral

Sistema SaaS multi-tenant para gestão de agendas e atividades de igrejas. Cada igreja é uma "organização" isolada com seus próprios dados, usuários e configurações.

---

## 1. Autenticação e Controle de Acesso

### 1.1 Login
- Autenticação via número de telefone
- Integração com Supabase Auth
- Sessões seguras com tokens JWT

### 1.2 Registro de Organizações
- Cadastro de novas igrejas com período de teste de 14 dias
- Criação automática do usuário administrador
- Configuração inicial da organização (nome, slug, país)

### 1.3 Níveis de Permissão (Roles)

| Role | Descrição | Permissões |
|------|-----------|------------|
| `super_admin` | Dono do sistema | Acesso total a todas as organizações |
| `admin` | Gestor da igreja | Gerencia eventos, membros, ministérios |
| `leader` | Líder de ministério | Cria e edita eventos, gerencia tarefas |
| `viewer` | Visualizador | Apenas visualização, sem edição |

---

## 2. Dashboard

### 2.1 Estatísticas
- Total de eventos do mês
- Total de membros cadastrados
- Total de ministérios ativos
- Avisos publicados

### 2.2 Widgets
- **Próximos Eventos**: Lista os eventos mais próximos
- **Mural de Avisos**: Exibe avisos publicados com prioridade
- **Quadros Kanban**: Acesso rápido aos quadros de tarefas
- **Gráfico de Eventos por Ministério**: Distribuição de eventos por dia da semana

### 2.3 Navegação Rápida
- Cards clicáveis para navegação direta às seções
- Botão de criação rápida (desabilitado para viewers)

---

## 3. Agenda de Eventos

### 3.1 Visualizações do Calendário
- **Mês**: Visão geral com barras coloridas por evento
- **Semana**: Grade semanal com eventos posicionados por horário
- **Dia**: Visualização detalhada com detecção de colisão para eventos simultâneos

### 3.2 Criação de Eventos
- Título e descrição
- Data e horário (início/fim)
- Opção de evento "Dia Inteiro"
- Localização
- Ministério responsável (define a cor do evento)
- Ministérios colaboradores
- Voluntários designados
- Visibilidade (público/privado)
- Observações

### 3.3 Eventos Recorrentes
- Frequência: Diária, Semanal, Mensal, Anual
- Configuração de intervalo
- Data de término da recorrência
- Edição individual ou de toda a série

### 3.4 Eventos com Múltiplos Dias
- Suporte a eventos que se estendem por vários dias
- Exibição contínua no calendário

### 3.5 Interação
- Clique para ver detalhes do evento
- Modal com informações completas
- Navegação direta para edição
- Lista de eventos do dia selecionado abaixo do calendário

---

## 4. Eventos Padrões (Templates)

### 4.1 Gerenciamento de Templates
- Criação de modelos pré-configurados
- Título padrão
- Ministério responsável
- Ministérios colaboradores
- Voluntários pré-selecionados
- Ordenação personalizada (drag & drop)
- Ativação/desativação de templates

### 4.2 Uso na Criação de Eventos
- Seleção de template ao criar novo evento
- Auto-preenchimento de campos
- Apenas a data precisa ser definida

---

## 5. Tarefas (Quadro Kanban)

### 5.1 Estrutura
- Vinculadas a eventos específicos
- Três colunas: A Fazer, Em Andamento, Concluído
- Drag & drop entre colunas e para reordenação

### 5.2 Detalhes da Tarefa
- Título e descrição (editor rich text)
- Responsáveis (múltiplos)
- Data de início e vencimento
- Prioridade (Baixa, Média, Alta)
- Labels coloridas personalizáveis
- Ministério associado

### 5.3 Checklists
- Múltiplas checklists por tarefa
- Itens com responsáveis e datas
- Marcação de conclusão
- Reordenação de itens
- Barra de progresso visual

### 5.4 Filtros
- Por responsável
- Por label
- Por vencimento
- Busca por texto

### 5.5 Recursos Adicionais
- Menu de contexto (clique direito)
- Arquivamento de tarefas
- Seção de atividades/histórico
- Background personalizado do quadro

---

## 6. Meus Quadros

- Listagem de todos os eventos com tarefas do usuário
- Progresso visual de conclusão
- Acesso rápido ao quadro kanban de cada evento

---

## 7. Próximos Eventos

- Lista cronológica de eventos futuros
- Informações resumidas (data, horário, local)
- Indicador de ministério responsável
- Filtros por período

---

## 8. Mural de Avisos

### 8.1 Gerenciamento
- Criação de avisos com título e conteúdo
- Cores personalizadas (fundo e texto)
- Prioridade: Normal, Alta, Urgente
- Status: Rascunho ou Publicado
- Data de publicação e despublicação automática
- Link externo opcional

### 8.2 Exibição
- Widget no dashboard
- Ordenação por prioridade e data
- Cards coloridos com visual destacado

---

## 9. Membros

### 9.1 Cadastro
- Nome completo
- Telefone (com seletor de país)
- Email (opcional)
- Foto de perfil (avatar)
- Marcação como voluntário

### 9.2 Associação a Ministérios
- Seletor de role por ministério: Líder, Participante ou Nenhum
- Líderes marcados com estrela (★)
- Badges coloridas com a cor do ministério

### 9.3 Permissões
- Definição de role no sistema (Admin, Leader, Viewer)
- Controle de permissão para criar eventos

### 9.4 Gerenciamento
- Lista paginada
- Busca por nome
- Edição via modal
- Visualização somente leitura para viewers

---

## 10. Ministérios

### 10.1 Cadastro
- Nome do ministério
- Cor identificadora (seletor visual)
- Status ativo/inativo

### 10.2 Uso no Sistema
- Cor aplicada em eventos, tarefas e badges
- Filtro de colaboradores em eventos
- Associação de membros como líderes ou participantes

---

## 11. Painel Super Admin

### 11.1 Organizações
- Lista de todas as igrejas cadastradas
- Status: Ativa, Trial, Suspensa
- Detalhes da assinatura
- Acesso aos dados de cada organização

### 11.2 Sistema de Impersonação
- Visualização como qualquer organização
- Gestão de ministérios e membros de clientes
- Sidebar adaptada com seção "Gestão da Igreja"

### 11.3 Faturas
- Gerenciamento de cobranças
- Status: Pendente, Paga, Atrasada, Cancelada
- Registro de pagamentos

### 11.4 Logs de Uso
- Registro de ações dos usuários
- Filtros por ação, usuário e data
- Metadados detalhados

---

## 12. Recursos de UX

### 12.1 Responsividade
- Layout adaptado para desktop e mobile
- Calendário mobile com visualização otimizada
- Sidebar colapsável

### 12.2 Temas
- Suporte a tema claro e escuro
- Toggle no header

### 12.3 Navegação
- Breadcrumbs
- Botão de voltar em todas as páginas
- Scroll to top automático

### 12.4 Feedback
- Toasts de sucesso/erro
- Loading states
- Validações em tempo real

---

## 13. Integrações Técnicas

### 13.1 Supabase
- Autenticação (Auth)
- Banco de dados PostgreSQL
- Row Level Security (RLS) para isolamento multi-tenant
- Edge Functions para operações administrativas

### 13.2 Stack Tecnológica
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- TanStack Query (gerenciamento de estado)
- React Router (navegação)
- date-fns (manipulação de datas)
- dnd-kit (drag & drop)

---

## 14. Segurança

### 14.1 Isolamento de Dados
- Cada organização tem dados completamente separados
- RLS policies garantem que usuários só acessem sua organização
- Super admins têm políticas especiais para acesso global

### 14.2 Controle de Acesso
- Verificação de role em todas as rotas
- Componentes `ProtectedRoute`, `ManageRoute` e `SuperAdminRoute`
- Botões e ações condicionais baseadas em permissões

### 14.3 Autenticação
- Tokens JWT seguros
- Sessões com expiração
- Edge functions protegidas com service role

---

## 15. Funcionalidades Futuras (Roadmap)

- [ ] Notificações push
- [ ] Integração com Google Calendar
- [ ] Relatórios e analytics
- [ ] Exportação de dados
- [ ] App mobile nativo

---

*Documento gerado em: Fevereiro de 2026*
*Versão do Sistema: 1.0*
