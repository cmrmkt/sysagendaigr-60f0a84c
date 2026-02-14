import { Archive, Copy, ArrowRight, Tag, Users, Calendar, Trash2 } from "lucide-react";
import type { EventTask, TaskStatus } from "@/hooks/useEventTasks";
import { useData } from "@/contexts/DataContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";

interface TaskContextMenuProps {
  task: EventTask;
  children: React.ReactNode;
  onOpenLabels?: () => void;
  onOpenMembers?: () => void;
  onOpenDates?: () => void;
}

const statusLabels: Record<TaskStatus, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  done: "Concluído",
};

const TaskContextMenu = ({ 
  task, 
  children, 
  onOpenLabels,
  onOpenMembers,
  onOpenDates,
}: TaskContextMenuProps) => {
  const { updateTask, addTask, deleteTask, getTasksByEventId } = useData();
  const { toast } = useToast();
  const { canEdit, canDelete, canCreate } = useSubscriptionStatus();
  const canManageTasks = canEdit && canDelete && canCreate;

  const handleMoveToStatus = (newStatus: TaskStatus) => {
    updateTask(task.id, { status: newStatus });
    toast({
      title: "Cartão movido",
      description: `Movido para "${statusLabels[newStatus]}"`,
    });
  };

  const handleCopyCard = () => {
    const existingTasks = getTasksByEventId(task.eventId);
    const maxOrder = existingTasks.length > 0 
      ? Math.max(...existingTasks.filter(t => t.status === task.status).map(t => t.order))
      : -1;

    addTask({
      eventId: task.eventId,
      title: `(Cópia) ${task.title}`,
      description: task.description,
      status: task.status,
      ministryId: task.ministryId,
      priority: task.priority,
      order: maxOrder + 1,
      assigneeIds: [],
      labelIds: task.labelIds,
      checklists: task.checklists?.map((checklist, cIndex) => ({
        ...checklist,
        id: `checklist-${Date.now()}-${cIndex}`,
        items: checklist.items.map((item, iIndex) => ({
          ...item,
          id: `item-${Date.now()}-${cIndex}-${iIndex}`,
          isCompleted: false,
        })),
      })),
    });

    toast({
      title: "Cartão copiado",
      description: "Uma cópia do cartão foi criada",
    });
  };

  const handleArchive = () => {
    updateTask(task.id, { isArchived: true });
    toast({
      title: "Cartão arquivado",
      description: "O cartão foi movido para os arquivados",
    });
  };

  const handleDelete = () => {
    deleteTask(task.id);
    toast({
      title: "Cartão excluído",
      description: "O cartão foi removido permanentemente",
    });
  };

  // Se não pode gerenciar, retorna apenas os filhos sem menu de contexto
  if (!canManageTasks) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-popover border shadow-lg z-[100]">
        {onOpenLabels && (
          <ContextMenuItem onClick={onOpenLabels}>
            <Tag className="w-4 h-4 mr-2" />
            Editar etiquetas
          </ContextMenuItem>
        )}
        {onOpenMembers && (
          <ContextMenuItem onClick={onOpenMembers}>
            <Users className="w-4 h-4 mr-2" />
            Alterar membros
          </ContextMenuItem>
        )}
        {onOpenDates && (
          <ContextMenuItem onClick={onOpenDates}>
            <Calendar className="w-4 h-4 mr-2" />
            Alterar data
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowRight className="w-4 h-4 mr-2" />
            Mover para...
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40 bg-popover border shadow-lg z-[100]">
            {(Object.keys(statusLabels) as TaskStatus[])
              .filter(status => status !== task.status)
              .map((status) => (
                <ContextMenuItem
                  key={status}
                  onClick={() => handleMoveToStatus(status)}
                  className="cursor-pointer"
                >
                  {statusLabels[status]}
                </ContextMenuItem>
              ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={handleCopyCard}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar cartão
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleArchive}>
          <Archive className="w-4 h-4 mr-2" />
          Arquivar
        </ContextMenuItem>

        <ContextMenuItem 
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default TaskContextMenu;