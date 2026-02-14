import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, CheckSquare, Pencil, Trash2 } from "lucide-react";
import type { EventTask } from "@/hooks/useEventTasks";
import { defaultTaskLabels } from "@/contexts/DataContext";
import { useData } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";
import TaskContextMenu from "./TaskContextMenu";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskCardProps {
  task: EventTask;
  onClick: () => void;
  onOpenLabels?: () => void;
  onOpenMembers?: () => void;
  onOpenDates?: () => void;
  onDelete?: () => void;
}

const TaskCard = ({ task, onClick, onOpenLabels, onOpenMembers, onOpenDates, onDelete }: TaskCardProps) => {
  const { getMinistryById, getUserById, deleteTask } = useData();
  const { toast } = useToast();
  const { canEdit, canDelete } = useSubscriptionStatus();
  const ministry = task.ministryId ? getMinistryById(task.ministryId) : null;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "done";
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));
  const isCompleted = task.status === "done";

  const assignees = task.assigneeIds.map(id => getUserById(id)).filter(Boolean);
  const labels = task.labelIds?.map(id => defaultTaskLabels.find(l => l.id === id)).filter(Boolean) || [];

  // Checklist progress - conta todos os itens de todos os checklists
  const allChecklistItems = task.checklists?.flatMap(c => c.items) || [];
  const completedItems = allChecklistItems.filter(item => item.isCompleted).length;
  const totalItems = allChecklistItems.length;
  const hasChecklist = totalItems > 0;
  const isChecklistComplete = hasChecklist && completedItems === totalItems;

   const handleDelete = (e: React.MouseEvent) => {
     e.stopPropagation();
     if (onDelete) {
       onDelete();
     } else {
       deleteTask(task.id);
       toast({
         title: "Cartão excluído",
         description: "O cartão foi removido permanentemente",
       });
     }
   };

  return (
    <TaskContextMenu 
      task={task}
      onOpenLabels={onOpenLabels}
      onOpenMembers={onOpenMembers}
      onOpenDates={onOpenDates}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "bg-card rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all group touch-none",
          "border border-border/40",
          isDragging && "opacity-50 shadow-lg rotate-2 scale-105",
          isOverdue && "ring-1 ring-destructive/40"
        )}
        onClick={onClick}
      >
        <div className="p-2 relative">
          {/* Action buttons - ALWAYS VISIBLE (only if user can manage) */}
          {(canEdit || canDelete) && (
            <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
              {/* Edit button */}
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 bg-background/90 hover:bg-primary hover:text-primary-foreground border border-border/50 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Editar tarefa
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Delete button */}
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 bg-background/90 hover:bg-destructive hover:text-destructive-foreground border border-border/50 shadow-sm"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Excluir tarefa
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Trello-style Labels - small colored bars */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {labels.map((label) => (
                <div
                  key={label!.id}
                  className="h-2 w-10 rounded-sm transition-all hover:h-4 group/label relative"
                  style={{ backgroundColor: label!.color }}
                  title={label!.name}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white opacity-0 group-hover/label:opacity-100 truncate px-0.5">
                    {label!.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          <h4 className={cn(
            "text-sm text-foreground leading-snug",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h4>

          {/* Indicators Row - Trello style */}
          {(task.dueDate || (hasChecklist && !isChecklistComplete) || assignees.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Due Date */}
              {task.dueDate && (
                <div className={cn(
                  "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                  isOverdue && "bg-destructive/15 text-destructive",
                  isDueToday && !isOverdue && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
                  isCompleted && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                  !isOverdue && !isDueToday && !isCompleted && "text-muted-foreground"
                )}>
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(task.dueDate), "d MMM", { locale: ptBR })}</span>
                </div>
              )}

              {/* Checklist indicator - inline when NOT complete */}
              {hasChecklist && !isChecklistComplete && (
                <div className="flex items-center gap-1.5 flex-1">
                  <CheckSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs shrink-0 text-muted-foreground">
                    {completedItems}/{totalItems} ({Math.round((completedItems / totalItems) * 100)}%)
                  </span>
                  <Progress 
                    value={(completedItems / totalItems) * 100} 
                    className="h-1.5 flex-1"
                  />
                </div>
              )}

              {/* Assignees - show short name with tooltip */}
              {assignees.length > 0 && (
                 <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
                  {assignees.slice(0, 2).map((user) => {
                    const nameParts = user!.name.split(' ');
                    const shortName = nameParts.length > 1 
                      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
                      : nameParts[0];
                    return (
                      <Tooltip key={user!.id}>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full truncate max-w-[70px]">
                            {shortName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {user!.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {assignees.length > 2 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          +{assignees.length - 2}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {assignees.slice(2).map(u => u!.name).join(', ')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Checklist 100% complete - full width row */}
          {hasChecklist && isChecklistComplete && (
            <div className="flex items-center gap-1.5 mt-2">
              <CheckSquare className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-400" />
              <span className="text-xs shrink-0 text-green-600 dark:text-green-400">
                {completedItems}/{totalItems} (100%)
              </span>
              <Progress 
                value={100} 
                className="h-1.5 flex-1 [&>div]:bg-green-600 dark:[&>div]:bg-green-400"
              />
            </div>
          )}
        </div>
      </div>
    </TaskContextMenu>
  );
};

export default TaskCard;