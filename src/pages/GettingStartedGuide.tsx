import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Church,
  CalendarClock,
  Calendar,
  MessageCircle,
  Settings,
  Megaphone,
  ListTodo,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Rocket,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";

type Lang = "pt" | "en";

interface GuideStep {
  number: number;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  why: Record<Lang, string>;
  icon: React.ElementType;
  path: string;
  buttonLabel: Record<Lang, string>;
  image: Record<Lang, string>;
  instructions: Record<Lang, string[]>;
}

const steps: GuideStep[] = [
  {
    number: 1,
    title: {
      pt: "Cadastrar Membros",
      en: "Register Members",
    },
    description: {
      pt: "Comece registrando os membros da sua congregação no sistema.",
      en: "Start by registering your congregation members in the system.",
    },
    why: {
      pt: "Os membros são a base de tudo. Você precisará deles para atribuir líderes de ministérios, voluntários e responsáveis por atividades.",
      en: "Members are the foundation of everything. You'll need them to assign ministry leaders, volunteers, and activity coordinators.",
    },
    icon: Users,
    path: "/membros",
    buttonLabel: { pt: "Acessar Membros", en: "Go to Members" },
    image: { pt: "/guide/pt/step1-membros.png", en: "/guide/step1-membros.png" },
    instructions: {
      pt: [
        "Acesse o menu 'Membros' na barra lateral esquerda",
        "Clique no botão '+ Novo Membro' no topo da página",
        "Preencha o nome, telefone (com WhatsApp) e perfil do membro",
        "Escolha o nível de acesso: Administrador, Líder ou Visualizador",
        "Repita para todos os membros da liderança",
      ],
      en: [
        "Go to 'Members' in the left sidebar menu",
        "Click the '+ New Member' button at the top of the page",
        "Fill in the name, phone number (with WhatsApp) and member profile",
        "Choose the access level: Administrator, Leader, or Viewer",
        "Repeat for all leadership members",
      ],
    },
  },
  {
    number: 2,
    title: {
      pt: "Criar Ministérios",
      en: "Create Ministries",
    },
    description: {
      pt: "Organize sua congregação em ministérios e atribua líderes responsáveis.",
      en: "Organize your congregation into ministries and assign responsible leaders.",
    },
    why: {
      pt: "Os ministérios estruturam as atividades e determinam quem recebe lembretes automáticos. Cada atividade será vinculada a um ministério.",
      en: "Ministries structure activities and determine who receives automatic reminders. Each activity will be linked to a ministry.",
    },
    icon: Church,
    path: "/ministerios",
    buttonLabel: { pt: "Acessar Ministérios", en: "Go to Ministries" },
    image: { pt: "/guide/pt/step2-ministerios.png", en: "/guide/step2-ministerios.png" },
    instructions: {
      pt: [
        "Acesse o menu 'Ministérios' na barra lateral esquerda",
        "Clique em '+ Novo Ministério'",
        "Digite o nome (exemplos: Louvor, Infantil, Oração)",
        "Selecione uma cor para identificação visual rápida",
        "Adicione os líderes (membros já registrados no Passo 1)",
      ],
      en: [
        "Go to 'Ministries' in the left sidebar menu",
        "Click '+ New Ministry'",
        "Enter the name (examples: Worship, Children, Prayer)",
        "Select a color for quick visual identification",
        "Add leaders (members already registered in Step 1)",
      ],
    },
  },
  {
    number: 3,
    title: {
      pt: "Criar Modelos de Atividades",
      en: "Create Activity Templates",
    },
    description: {
      pt: "Configure templates para atividades que se repetem regularmente.",
      en: "Set up templates for activities that repeat regularly.",
    },
    why: {
      pt: "Os modelos agilizam a criação de atividades recorrentes, como cultos semanais e ensaios. Configure uma vez e use quantas vezes precisar.",
      en: "Templates speed up the creation of recurring activities, like weekly services and rehearsals. Set up once and use as many times as needed.",
    },
    icon: CalendarClock,
    path: "/eventos-padroes",
    buttonLabel: { pt: "Acessar Modelos", en: "Go to Templates" },
    image: { pt: "/guide/pt/step3-templates.png", en: "/guide/step3-templates.png" },
    instructions: {
      pt: [
        "Acesse 'Modelos de Atividades' no menu lateral",
        "Clique em '+ Novo Modelo'",
        "Digite o título (exemplos: 'Culto de Domingo', 'Ensaio do Louvor')",
        "Configure o horário padrão de início e encerramento",
        "Vincule ao ministério responsável",
        "Adicione local e observações padrão",
      ],
      en: [
        "Go to 'Activity Templates' in the sidebar menu",
        "Click '+ New Template'",
        "Enter the title (examples: 'Sunday Service', 'Worship Rehearsal')",
        "Set the default start and end times",
        "Link to the responsible ministry",
        "Add default location and notes",
      ],
    },
  },
  {
    number: 4,
    title: {
      pt: "Criar Atividades na Agenda",
      en: "Create Activities in the Calendar",
    },
    description: {
      pt: "Registre suas primeiras atividades usando os modelos que configurou.",
      en: "Register your first activities using the templates you set up.",
    },
    why: {
      pt: "A agenda é o coração do sistema. Aqui você registra todas as atividades da congregação e o sistema gerencia os lembretes automáticos.",
      en: "The calendar is the heart of the system. Here you register all congregation activities and the system manages automatic reminders.",
    },
    icon: Calendar,
    path: "/agenda",
    buttonLabel: { pt: "Acessar Agenda", en: "Go to Calendar" },
    image: { pt: "/guide/pt/step4-agenda.png", en: "/guide/step4-agenda.png" },
    instructions: {
      pt: [
        "Acesse a 'Agenda' no menu lateral esquerdo",
        "Clique no botão '+ Nova Atividade'",
        "Selecione um modelo para preenchimento automático",
        "Ajuste a data, horário e local conforme necessário",
        "Configure repetição semanal ou mensal, se aplicável",
        "Salve a atividade — ela aparecerá no calendário",
      ],
      en: [
        "Go to 'Calendar' in the left sidebar menu",
        "Click the '+ New Activity' button",
        "Select a template for auto-fill",
        "Adjust date, time, and location as needed",
        "Set up weekly or monthly recurrence if applicable",
        "Save the activity — it will appear on the calendar",
      ],
    },
  },
  {
    number: 5,
    title: {
      pt: "Conectar WhatsApp",
      en: "Connect WhatsApp",
    },
    description: {
      pt: "Integre o WhatsApp da congregação para envio automático de lembretes.",
      en: "Integrate your congregation's WhatsApp for automatic reminder delivery.",
    },
    why: {
      pt: "Com o WhatsApp conectado, o sistema envia lembretes automáticos aos membros sobre todas as atividades. Sem isso, os lembretes não funcionam.",
      en: "With WhatsApp connected, the system automatically sends reminders to members about all activities. Without it, reminders won't work.",
    },
    icon: MessageCircle,
    path: "/configuracoes/whatsapp",
    buttonLabel: { pt: "Configurar WhatsApp", en: "Set Up WhatsApp" },
    image: { pt: "/guide/pt/step5-whatsapp.png", en: "/guide/step5-whatsapp.png" },
    instructions: {
      pt: [
        "Acesse 'Configurar WhatsApp' no menu de seu perfil (rodapé lateral)",
        "Clique em 'Conectar WhatsApp'",
        "Um código QR aparecerá na tela",
        "Abra o WhatsApp no celular → Configurações → Aparelhos conectados",
        "Digitalize o código QR usando o celular",
        "Aguarde a confirmação de conexão (indicador verde)",
      ],
      en: [
        "Go to 'WhatsApp Settings' in your profile menu (sidebar footer)",
        "Click 'Connect WhatsApp'",
        "A QR code will appear on the screen",
        "Open WhatsApp on your phone → Settings → Linked Devices",
        "Scan the QR code with your phone",
        "Wait for the connection confirmation (green indicator)",
      ],
    },
  },
  {
    number: 6,
    title: {
      pt: "Configurar Lembretes Automáticos",
      en: "Set Up Automatic Reminders",
    },
    description: {
      pt: "Defina quando e como os lembretes automáticos serão disparados.",
      en: "Define when and how automatic reminders will be triggered.",
    },
    why: {
      pt: "Os lembretes garantem que ninguém esqueça suas responsabilidades. Configure os horários e frequências de envio de acordo com suas necessidades.",
      en: "Reminders ensure no one forgets their responsibilities. Configure sending times and frequencies according to your needs.",
    },
    icon: Settings,
    path: "/configuracoes/lembretes",
    buttonLabel: { pt: "Configurar Lembretes", en: "Set Up Reminders" },
    image: { pt: "/guide/pt/step6-lembretes.png", en: "/guide/step6-lembretes.png" },
    instructions: {
      pt: [
        "Acesse 'Configurar Lembretes' no menu de seu perfil",
        "Ative os tipos de lembrete desejados",
        "Configure o tempo de antecedência (1 hora, 1 dia, etc.)",
        "Personalize o modelo de mensagem, se desejar",
        "Escolha quem recebe lembretes (líderes, voluntários, todos)",
        "Salve as configurações",
      ],
      en: [
        "Go to 'Reminder Settings' in your profile menu",
        "Enable the desired reminder types",
        "Set the advance time (1 hour, 1 day, etc.)",
        "Customize the message template if desired",
        "Choose who receives reminders (leaders, volunteers, everyone)",
        "Save the settings",
      ],
    },
  },
  {
    number: 7,
    title: {
      pt: "Publicar no Mural",
      en: "Post on the Board",
    },
    description: {
      pt: "Use o mural para comunicar avisos importantes à equipe de forma centralizada.",
      en: "Use the board to communicate important announcements to the team in a centralized way.",
    },
    why: {
      pt: "O mural é o canal de comunicação interna. Publique avisos, mudanças de última hora e informações gerais para toda a congregação.",
      en: "The board is the internal communication channel. Post announcements, last-minute changes, and general information for the entire congregation.",
    },
    icon: Megaphone,
    path: "/mural",
    buttonLabel: { pt: "Acessar Mural", en: "Go to Board" },
    image: { pt: "/guide/pt/step7-mural.png", en: "/guide/step7-mural.png" },
    instructions: {
      pt: [
        "Acesse o 'Mural' no menu lateral esquerdo",
        "Clique em '+ Novo Aviso'",
        "Escreva o título e o conteúdo do aviso",
        "Defina a prioridade (Normal, Importante ou Urgente)",
        "Escolha as cores de destaque visual",
        "Publique — todos verão o aviso ao acessar o sistema",
      ],
      en: [
        "Go to 'Board' in the left sidebar menu",
        "Click '+ New Announcement'",
        "Write the title and content of the announcement",
        "Set the priority (Normal, Important, or Urgent)",
        "Choose the highlight colors",
        "Publish — everyone will see the announcement when accessing the system",
      ],
    },
  },
  {
    number: 8,
    title: {
      pt: "Gerenciar Tarefas do Quadro",
      en: "Manage Board Tasks",
    },
    description: {
      pt: "Organize as tarefas das atividades usando quadros tipo Kanban.",
      en: "Organize activity tasks using Kanban-style boards.",
    },
    why: {
      pt: "Os quadros Kanban facilitam a distribuição e acompanhamento de tarefas para cada atividade, garantindo que nenhuma responsabilidade seja esquecida.",
      en: "Kanban boards make it easy to distribute and track tasks for each activity, ensuring no responsibility is forgotten.",
    },
    icon: ListTodo,
    path: "/meus-quadros",
    buttonLabel: { pt: "Acessar Quadros", en: "Go to Boards" },
    image: { pt: "/guide/pt/step8-tarefas.png", en: "/guide/step8-tarefas.png" },
    instructions: {
      pt: [
        "Acesse 'Tarefas' no menu lateral esquerdo",
        "Selecione uma atividade para visualizar seu quadro de tarefas",
        "Crie colunas como 'A Fazer', 'Em Andamento' e 'Concluído'",
        "Adicione tarefas e designe responsáveis a cada uma",
        "Arraste os cards entre as colunas conforme o progresso",
        "Acompanhe o andamento geral pelo indicador de progresso",
      ],
      en: [
        "Go to 'Tasks' in the left sidebar menu",
        "Select an activity to view its task board",
        "Create columns like 'To Do', 'In Progress', and 'Done'",
        "Add tasks and assign responsible members to each one",
        "Drag cards between columns as progress is made",
        "Track overall progress using the progress indicator",
      ],
    },
  },
];

const i18n = {
  pt: {
    title: "Guia de Início",
    subtitle: "Siga os passos abaixo na ordem para configurar seu sistema",
    progress: "Progresso da configuração",
    completed: "concluídos",
    completedBadge: "Concluído",
    whyImportant: "Por que é importante:",
    stepByStep: "Passo a passo:",
  },
  en: {
    title: "Getting Started Guide",
    subtitle: "Follow the steps below in order to set up your system",
    progress: "Setup Progress",
    completed: "completed",
    completedBadge: "Completed",
    whyImportant: "Why it matters:",
    stepByStep: "Step by step:",
  },
};

const GettingStartedGuide = () => {
  const [openSteps, setOpenSteps] = useState<number[]>([1]);
  const [lang, setLang] = useState<Lang>("pt");
  const navigate = useNavigate();
  const { role } = useAuth();
  const { users, ministries, events } = useData();
  const t = i18n[lang];
  const isSuperAdmin = role === "super_admin";

  const getStepCompleted = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1: return (users?.length || 0) > 1;
      case 2: return (ministries?.length || 0) > 0;
      case 3: return false;
      case 4: return (events?.length || 0) > 0;
      default: return false;
    }
  };

  const completedCount = steps.filter((s) => getStepCompleted(s.number)).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const toggleStep = (num: number) => {
    setOpenSteps((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-shrink-0">
          <Button
            variant={lang === "pt" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs font-semibold gap-1.5"
            onClick={() => setLang("pt")}
          >
            <Globe className="w-3.5 h-3.5" />
            PT
          </Button>
          <Button
            variant={lang === "en" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs font-semibold gap-1.5"
            onClick={() => setLang("en")}
          >
            <Globe className="w-3.5 h-3.5" />
            EN
          </Button>
        </div>
      </div>

      {/* Progress - only for regular users with org data */}
      {!isSuperAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{t.progress}</span>
              <Badge variant="secondary">{completedCount}/{steps.length} {t.completed}</Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = getStepCompleted(step.number);
          const isOpen = openSteps.includes(step.number);
          const Icon = step.icon;

          return (
            <Collapsible
              key={step.number}
              open={isOpen}
              onOpenChange={() => toggleStep(step.number)}
            >
              <Card className={cn(
                "transition-all",
                isCompleted && "border-green-500/30 bg-green-50/50 dark:bg-green-950/10"
              )}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                        isCompleted
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-primary/10 text-primary"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          step.number
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {step.title[lang]}
                          {isCompleted && (
                            <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                              {t.completedBadge}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">{step.description[lang]}</CardDescription>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Why section */}
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{t.whyImportant} </span>
                        {step.why[lang]}
                      </p>
                    </div>

                    {/* Image */}
                    <div className="rounded-lg overflow-hidden border bg-muted/30">
                      <img
                        src={step.image[lang]}
                        alt={`${lang === "pt" ? "Ilustração" : "Screenshot"}: ${step.title[lang]}`}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-foreground">{t.stepByStep}</h4>
                      <ol className="space-y-1.5">
                        {step.instructions[lang].map((instruction, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="bg-primary/10 text-primary text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Action button */}
                    <Button
                      onClick={() => navigate(step.path)}
                      className="w-full sm:w-auto"
                    >
                      {step.buttonLabel[lang]}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default GettingStartedGuide;
