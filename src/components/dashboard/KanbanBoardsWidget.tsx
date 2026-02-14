import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ListTodo, 
  ArrowRight, 
  CheckCircle2, 
  Circle, 
  Clock,
  Calendar,
  Pencil,
  Trash2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BoardSummary {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  ministryColor: string;
  ministryName: string;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  totalTasks: number;
}

const KanbanBoardsWidget = () => {
  const navigate = useNavigate();
  const { events, eventTasks, ministries, deleteTask } = useData();
  const { toast } = useToast();
  const { canEdit, canDelete } = useSubscriptionStatus();

  const canManageTasks = canEdit && canDelete;

  // Agrupa tarefas por evento e calcula estatísticas
  const boardSummaries: BoardSummary[] = events
    .map(event => {
      const tasks = eventTasks.filter(t => t.eventId === event.id && !t.isArchived);
      if (tasks.length === 0) return null;

      const ministry = ministries.find(m => m.id === event.ministryId);
      
      return {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        ministryColor: ministry?.color || "hsl(var(--primary))",
        ministryName: ministry ? (ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name) : "Sem ministério",
        todoCount: tasks.filter(t => t.status === "todo").length,
        inProgressCount: tasks.filter(t => t.status === "in_progress").length,
        doneCount: tasks.filter(t => t.status === "done").length,
        totalTasks: tasks.length,
      };
    })
    .filter((summary): summary is BoardSummary => summary !== null)
    .sort((a, b) => {
      // Prioriza quadros com tarefas em progresso
      if (a.inProgressCount !== b.inProgressCount) {
        return b.inProgressCount - a.inProgressCount;
      }
      // Depois por tarefas pendentes
      return b.todoCount - a.todoCount;
    })
    .slice(0, 4); // Mostra apenas os 4 mais relevantes

  if (boardSummaries.length === 0) {
    return null; // Não exibe widget se não houver quadros
  }

  const getProgressPercentage = (board: BoardSummary) => {
    if (board.totalTasks === 0) return 0;
    return Math.round((board.doneCount / board.totalTasks) * 100);
  };

  const handleEdit = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    navigate(`/evento/${eventId}`);
  };

  const handleDeleteTasks = (e: React.MouseEvent, eventId: string, eventTitle: string) => {
    e.stopPropagation();

    // Trial expirado / assinatura bloqueada: não permitir CRUD
    if (!canManageTasks) {
      toast({
        title: "Ação bloqueada",
        description: "Sua conta está em modo somente leitura. Regularize sua assinatura para gerenciar tarefas.",
        variant: "destructive",
      });
      return;
    }

    // Busca todas as tarefas do evento
    const tasksToDelete = eventTasks.filter((t) => t.eventId === eventId && !t.isArchived);

    if (tasksToDelete.length === 0) {
      toast({
        title: "Nenhuma tarefa",
        description: "Este evento não possui tarefas para excluir",
      });
      return;
    }

    // Exclui todas as tarefas
    tasksToDelete.forEach((task) => {
      deleteTask(task.id);
    });

    toast({
      title: "Tarefas excluídas",
      description: `${tasksToDelete.length} tarefa(s) de "${eventTitle}" foram removidas`,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-primary" />
          Atividades em Andamento
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/meus-quadros")}
          className="text-muted-foreground hover:text-foreground"
        >
          Ver todas
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boardSummaries.map((board) => {
            const progress = getProgressPercentage(board);
            const isComplete = progress === 100;
            
            return (
              <div
                key={board.eventId}
                onClick={() => navigate(`/evento/${board.eventId}/tarefas`)}
                className={cn(
                  "group relative p-3 rounded-lg border cursor-pointer transition-all",
                  "hover:shadow-md hover:border-primary/30 hover:bg-accent/30",
                  "bg-card"
                )}
              >
                {/* Barra de cor do ministério */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                  style={{ backgroundColor: board.ministryColor }}
                />

                {/* Action buttons - sempre visíveis (somente quando permitido) */}
                {canManageTasks && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-background/90 hover:bg-primary hover:text-primary-foreground border border-border/50 shadow-sm"
                          onClick={(e) => handleEdit(e, board.eventId)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Editar evento
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 bg-background/90 hover:bg-destructive hover:text-destructive-foreground border border-border/50 shadow-sm"
                          onClick={(e) => handleDeleteTasks(e, board.eventId, board.eventTitle)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Excluir tarefas
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
                
                <div className="pl-2">
                  {/* Título e badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm text-foreground line-clamp-1 flex-1 pr-14">
                      {board.eventTitle}
                    </h4>
                  </div>
                  
                  {/* Badge do ministério */}
                  <Badge 
                    variant="secondary"
                    className="text-xs mb-2 font-medium"
                    style={{ 
                      backgroundColor: board.ministryColor,
                      color: '#FFFFFF',
                      boxShadow: `0 2px 8px ${board.ministryColor}50`
                    }}
                  >
                    {board.ministryName}
                  </Badge>

                  {/* Data e horário do evento */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{format(parseISO(board.eventDate), "dd/MM/yyyy")}</span>
                    <span className="mx-0.5">•</span>
                    <Clock className="w-3 h-3" />
                    <span>{board.startTime} - {board.endTime}</span>
                  </div>

                  {/* Contadores de status */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1" title="A fazer">
                      <Circle className="w-3 h-3 text-amber-500" />
                      <span>{board.todoCount}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Em andamento">
                      <Clock className="w-3 h-3 text-sky-500" />
                      <span>{board.inProgressCount}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Concluído">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{board.doneCount}</span>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          isComplete ? "bg-emerald-500" : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      isComplete ? "text-emerald-600" : "text-muted-foreground"
                    )}>
                      {progress}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão para criar nova atividade se houver poucas */}
        {boardSummaries.length < 2 && (
          <Button
            variant="outline"
            className="w-full mt-3 border-dashed"
            onClick={() => navigate("/evento/novo")}
          >
            <ListTodo className="w-4 h-4 mr-2" />
            Criar nova atividade
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default KanbanBoardsWidget;
