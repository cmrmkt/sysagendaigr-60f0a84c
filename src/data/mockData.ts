// Dados mock realistas para demonstração do sistema

export interface Ministry {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface UserMinistryAssociation {
  ministryId: string;
  role: "leader" | "member";
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string; // Telefone do usuário
  role: "admin" | "leader" | "viewer";
  canCreateEvents: boolean;
  ministryAssociations: UserMinistryAssociation[]; // Ministérios associados ao usuário com papel
  isVolunteer?: boolean; // Voluntário da igreja (disponível para ajudar)
}

export interface RecurrenceConfig {
  type: "none" | "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  endType: "never" | "after" | "on";
  endAfterOccurrences?: number;
  endOnDate?: string;
}

// Membro adicional do evento (cadastrado manualmente)
export interface EventMember {
  id: string;
  name: string;
  phone: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  ministryId: string;
  responsibleId: string;
  responsibleIds?: string[]; // Múltiplos responsáveis (usuários do sistema)
  collaboratorMinistryIds?: string[]; // Ministérios colaboradores do evento
  volunteerIds?: string[]; // Voluntários do evento
  members?: EventMember[]; // Membros adicionais cadastrados manualmente
  observations: string;
  reminder: "none" | "1h" | "1d";
  // Novos campos
  endDate?: string;
  location?: string;
  isAllDay?: boolean;
  visibility?: "public" | "private";
  recurrence?: RecurrenceConfig;
  parentEventId?: string;
  customColor?: string; // Cor personalizada do evento
}

// Paleta de cores disponíveis para eventos
export const EVENT_COLORS = [
  "#EF4444", // Vermelho
  "#F97316", // Laranja
  "#F59E0B", // Âmbar
  "#EAB308", // Amarelo
  "#84CC16", // Lima
  "#22C55E", // Verde
  "#10B981", // Esmeralda
  "#14B8A6", // Teal
  "#06B6D4", // Ciano
  "#0EA5E9", // Azul claro
  "#3B82F6", // Azul
  "#6366F1", // Índigo
  "#8B5CF6", // Violeta
  "#A855F7", // Roxo
  "#D946EF", // Fúcsia
  "#EC4899", // Rosa
  "#F43F5E", // Rosa escuro
  "#78716C", // Cinza
  "#713F12", // Marrom
  "#1E3A5F", // Azul marinho
];

export interface Announcement {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  status: "published" | "draft";
  priority: "normal" | "high" | "urgent";
  publishDate: string;
  unpublishDate?: string;
  externalLink?: string;
  createdAt: string;
  createdBy: string;
}

// ============= KANBAN TASKS =============
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

// Sistema de Etiquetas (Labels) - similar ao Trello
export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export const defaultTaskLabels: TaskLabel[] = [
  { id: "label-1", name: "Urgente", color: "#B91C1C" },      // Vermelho tijolo
  { id: "label-2", name: "Importante", color: "#92400E" },   // Marrom âmbar
  { id: "label-3", name: "Revisar", color: "#A16207" },      // Dourado escuro
  { id: "label-4", name: "Em Espera", color: "#155E75" },    // Azul petróleo
  { id: "label-5", name: "Aprovado", color: "#065F46" },     // Verde musgo
  { id: "label-6", name: "Bloqueado", color: "#5B21B6" },    // Roxo índigo
];

// Item individual de checklist
export interface TaskChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  assigneeId?: string;
  dueDate?: string;
}

// Checklist completo (múltiplos por tarefa)
export interface TaskChecklist {
  id: string;
  title: string; // "CHECKLIST (1)", "CHECKLIST (2)" ou nome personalizado
  items: TaskChecklistItem[];
  order: number;
}

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  ministryId?: string;
  priority: TaskPriority;
  dueDate?: string;
  startDate?: string;
  order: number;
  createdAt: string;
  assigneeIds: string[]; // IDs dos usuários responsáveis
  checklists?: TaskChecklist[]; // Múltiplos checklists
  labelIds?: string[]; // IDs das etiquetas
  isArchived?: boolean; // Para arquivar tarefas
}

export const initialEventTasks: EventTask[] = [
  // Tarefas para o Retiro de Casais (evento 3)
  {
    id: "task-1",
    eventId: "3",
    title: "Reservar hotel",
    description: "Confirmar reserva para 30 casais no Hotel Fazenda Boa Vista",
    status: "done",
    ministryId: "6",
    priority: "high",
    dueDate: "2026-01-10",
    order: 0,
    createdAt: "2026-01-02",
    assigneeIds: ["5"],
  },
  {
    id: "task-2",
    eventId: "3",
    title: "Preparar materiais",
    description: "Apostilas, crachás e kits para os casais",
    status: "in_progress",
    ministryId: "6",
    priority: "medium",
    dueDate: "2026-01-20",
    order: 1,
    createdAt: "2026-01-03",
    assigneeIds: ["2", "5"],
  },
  {
    id: "task-3",
    eventId: "3",
    title: "Organizar transporte",
    description: "Alugar ônibus para translado",
    status: "todo",
    ministryId: "6",
    priority: "medium",
    dueDate: "2026-01-22",
    order: 2,
    createdAt: "2026-01-03",
    assigneeIds: ["5"],
  },
];

export const initialMinistries: Ministry[] = [
  { id: "1", name: "Louvor", color: "hsl(231, 48%, 48%)", isActive: true },
  { id: "2", name: "Infantil", color: "hsl(142, 52%, 45%)", isActive: true },
  { id: "3", name: "Jovens", color: "hsl(25, 95%, 53%)", isActive: true },
  { id: "4", name: "Mulheres", color: "hsl(330, 65%, 50%)", isActive: true },
  { id: "5", name: "Homens", color: "hsl(200, 70%, 45%)", isActive: true },
  { id: "6", name: "Casais", color: "hsl(280, 60%, 50%)", isActive: true },
];

export const initialUsers: User[] = [
  { id: "1", name: "Pastor João Silva", email: "admin@igreja.com", role: "admin", canCreateEvents: true, ministryAssociations: [
    { ministryId: "1", role: "leader" }, { ministryId: "2", role: "leader" }, { ministryId: "3", role: "leader" },
    { ministryId: "4", role: "leader" }, { ministryId: "5", role: "leader" }, { ministryId: "6", role: "leader" }
  ]},
  { id: "2", name: "Maria Santos", email: "maria@igreja.com", role: "leader", canCreateEvents: true, ministryAssociations: [
    { ministryId: "2", role: "leader" }, { ministryId: "4", role: "member" }
  ]},
  { id: "3", name: "Carlos Oliveira", email: "carlos@igreja.com", role: "leader", canCreateEvents: true, ministryAssociations: [
    { ministryId: "1", role: "member" }, { ministryId: "3", role: "leader" }
  ]},
  { id: "4", name: "Ana Costa", email: "ana@igreja.com", role: "viewer", canCreateEvents: false, ministryAssociations: [
    { ministryId: "4", role: "member" }
  ]},
  { id: "5", name: "Pedro Souza", email: "pedro@igreja.com", role: "leader", canCreateEvents: true, ministryAssociations: [
    { ministryId: "5", role: "leader" }, { ministryId: "6", role: "member" }
  ]},
  { id: "6", name: "Juliana Lima", email: "juliana@igreja.com", role: "viewer", canCreateEvents: false, ministryAssociations: [
    { ministryId: "2", role: "member" }
  ], isVolunteer: true},
];

// Gerar eventos para o mês atual
const currentDate = new Date(2026, 0, 4); // Janeiro 2026
const currentMonth = currentDate.getMonth();
const currentYear = currentDate.getFullYear();

export const initialEvents: Event[] = [
  // Modelo 1: Evento com recorrência semanal
  { 
    id: "1", 
    title: "Culto de Domingo", 
    date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`, 
    startTime: "09:00", 
    endTime: "12:00", 
    ministryId: "1", 
    responsibleId: "1", 
    observations: "Preparar projetor e microfones antes do culto.", 
    reminder: "1h",
    location: "Templo Principal",
    visibility: "public",
    recurrence: { type: "weekly", interval: 1, endType: "never" }
  },
  // Modelo 2: Evento simples (sem recorrência)
  { 
    id: "2", 
    title: "Reunião de Jovens", 
    date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-11`, 
    startTime: "19:30", 
    endTime: "21:30", 
    ministryId: "3", 
    responsibleId: "3", 
    observations: "Tema: Propósito de vida", 
    reminder: "1h",
    location: "Salão Social",
    visibility: "public"
  },
  // Modelo 3: Evento multi-dias
  { 
    id: "3", 
    title: "Retiro de Casais", 
    date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-24`, 
    endDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-26`,
    startTime: "19:00", 
    endTime: "22:00", 
    ministryId: "6", 
    responsibleId: "5", 
    observations: "Jantar especial - confirmar presença. Hotel Fazenda Boa Vista.", 
    reminder: "1d",
    location: "Hotel Fazenda Boa Vista",
    visibility: "public",
    isAllDay: false
  },
];

export const initialAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Culto Especial de Ano Novo",
    content: "Venha celebrar o novo ano conosco! Teremos uma noite especial de louvor e adoração. Traga sua família e amigos para este momento único.",
    backgroundColor: "hsl(231, 48%, 48%)",
    textColor: "hsl(0, 0%, 100%)",
    status: "published",
    priority: "high",
    publishDate: "2026-01-01",
    createdAt: "2025-12-28",
    createdBy: "1",
  },
  {
    id: "2",
    title: "Inscrições Abertas - Retiro de Casais",
    content: "As inscrições para o Retiro de Casais 2026 estão abertas! Serão dias de renovação e fortalecimento do seu relacionamento. Vagas limitadas.",
    backgroundColor: "hsl(280, 60%, 50%)",
    textColor: "hsl(0, 0%, 100%)",
    status: "published",
    priority: "urgent",
    publishDate: "2026-01-02",
    unpublishDate: "2026-01-20",
    externalLink: "https://forms.example.com/retiro-casais",
    createdAt: "2026-01-02",
    createdBy: "1",
  },
  {
    id: "3",
    title: "Novo Horário das Reuniões de Jovens",
    content: "A partir deste mês, as reuniões de jovens serão às sextas-feiras, às 19h30. Não perca!",
    backgroundColor: "hsl(25, 95%, 53%)",
    textColor: "hsl(0, 0%, 100%)",
    status: "published",
    priority: "normal",
    publishDate: "2026-01-03",
    createdAt: "2026-01-03",
    createdBy: "3",
  },
  {
    id: "4",
    title: "Manutenção do Templo",
    content: "Informamos que haverá manutenção no sistema de ar condicionado do templo no dia 15/01. O culto acontecerá normalmente.",
    backgroundColor: "hsl(200, 70%, 45%)",
    textColor: "hsl(0, 0%, 100%)",
    status: "draft",
    priority: "normal",
    publishDate: "2026-01-10",
    createdAt: "2026-01-04",
    createdBy: "1",
  },
];

// Credenciais de demonstração
export const DEMO_CREDENTIALS = {
  email: "admin@igreja.com",
  password: "demo123",
};
