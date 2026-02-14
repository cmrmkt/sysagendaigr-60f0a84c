import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  Circle,
  MoreHorizontal,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { EventTask, TaskStatus } from "@/hooks/useEventTasks";
import type { Event } from "@/contexts/DataContext";
import { defaultTaskLabels } from "@/contexts/DataContext";
import { useData } from "@/contexts/DataContext";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useEventPermissions } from "@/hooks/useEventPermissions";
import ChecklistSection from "./ChecklistSection";
import DatePickerPopover from "./DatePickerPopover";
import MembersPopover from "./MembersPopover";
import LabelsPopover from "./LabelsPopover";
import RichTextEditor from "./RichTextEditor";
import ActivitySection from "./ActivitySection";

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: EventTask | null;
  onEdit: () => void;
  event?: Event | null;
}

const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  done: "Concluído",
};

const TaskDetailsModal = ({ isOpen, onClose, task, onEdit, event }: TaskDetailsModalProps) => {
  const { getMinistryById, getUserById, deleteTask, updateTask, addChecklist, getEventById } = useData();
  const { toast } = useToast();
  const { canEdit, canDelete, canCreate } = useSubscriptionStatus();
  const { canEditTask, isAdmin } = useEventPermissions();
  
  // Get the parent event for permission checking
  const parentEvent = event || (task?.eventId ? getEventById(task.eventId) : null);
  
  // Combine subscription status with involvement permissions
  const canManageTasks = canEdit && canDelete && canCreate && canEditTask(task, parentEvent);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const descriptionRef = useRef<HTMLDivElement>(null);
  const checklistRef = useRef<HTMLDivElement>(null);

  const addMenuItems = useMemo(
    () => [
      {
        key: "checklist",
        label: "Checklist",
        action: () => {
          checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          if (task) {
            addChecklist(task.id);
          }
        },
      },
      {
        key: "description",
        label: "Descrição",
        action: () => {
          descriptionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          setIsEditingDescription(true);
        },
      },
    ],
    [task, addChecklist],
  );

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setIsEditingTitle(false);
      setIsEditingDescription(false);
    }
  }, [task]);

  if (!task) return null;

  const ministry = task.ministryId ? getMinistryById(task.ministryId) : null;
  const assignees = task.assigneeIds.map(id => getUserById(id)).filter(Boolean);

  const handleDelete = () => {
    if (!canManageTasks) {
      toast({
        title: "Ação bloqueada",
        description: "Sua conta está em modo somente leitura. Regularize sua assinatura para excluir tarefas.",
        variant: "destructive",
      });
      return;
    }
    deleteTask(task.id);
    toast({
      title: "Tarefa excluída",
      description: "A tarefa foi removida do quadro",
    });
    setShowDeleteDialog(false);
    onClose();
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!canManageTasks) return;
    updateTask(task.id, { status: newStatus });
  };

  const handleTitleSave = () => {
    if (!canManageTasks) {
      setIsEditingTitle(false);
      return;
    }
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = () => {
    if (!canManageTasks) {
      setIsEditingDescription(false);
      return;
    }
    const newDesc = description.trim() || undefined;
    if (newDesc !== task.description) {
      updateTask(task.id, { description: newDesc });
    }
    setIsEditingDescription(false);
  };

  const handleDateChange = (dueDate?: string, startDate?: string) => {
    if (!canManageTasks) return;
    updateTask(task.id, { dueDate, startDate });
  };

  const handleLabelsChange = (labelIds: string[]) => {
    if (!canManageTasks) return;
    updateTask(task.id, { labelIds });
  };

  const handleMembersChange = (assigneeIds: string[]) => {
    if (!canManageTasks) return;
    updateTask(task.id, { assigneeIds });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col gap-0">
          {/* Trello-style Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          {/* Status Dropdown - Left (disabled if no edit permission) */}
          <Select 
            value={task.status} 
            onValueChange={handleStatusChange}
            disabled={!canManageTasks}
          >
            <SelectTrigger className="w-auto h-8 px-3 bg-secondary border-0 text-sm font-medium gap-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">{statusLabels.todo}</SelectItem>
              <SelectItem value="in_progress">{statusLabels.in_progress}</SelectItem>
              <SelectItem value="done">{statusLabels.done}</SelectItem>
            </SelectContent>
          </Select>

            {/* Actions - Right */}
            <div className="flex items-center gap-1">
              {canManageTasks && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {addMenuItems.map((item) => (
                      <DropdownMenuItem key={item.key} onClick={item.action}>
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-4 space-y-4">
              {/* Title with Circle Indicator */}
              <div className="flex items-start gap-3">
                <Circle className="w-5 h-5 mt-1 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  {isEditingTitle && canManageTasks ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                      className="text-lg font-semibold bg-background h-auto py-1"
                      autoFocus
                    />
                  ) : (
                    <h2 
                      className={`text-lg font-semibold rounded px-2 py-1 -mx-2 transition-colors ${canManageTasks ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                      onClick={() => canManageTasks && setIsEditingTitle(true)}
                    >
                      {task.title}
                    </h2>
                  )}
                </div>
              </div>

              {/* Action Buttons - Trello Style Pills (only if user can edit) */}
              {canManageTasks && (
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="sm" className="h-8 px-3 gap-1.5 border-0">
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {addMenuItems.map((item) => (
                        <DropdownMenuItem key={item.key} onClick={item.action}>
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <MembersPopover 
                        selectedIds={task.assigneeIds} 
                        onSelectionChange={handleMembersChange}
                      >
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          Membros
                        </DropdownMenuItem>
                      </MembersPopover>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <LabelsPopover
                    selectedIds={task.labelIds || []}
                    onSelectionChange={handleLabelsChange}
                  >
                    <Button variant="secondary" size="sm" className="h-8 px-3 gap-1.5 border-0">
                      <Tag className="w-4 h-4" />
                      Etiquetas
                    </Button>
                  </LabelsPopover>

                  <DatePickerPopover
                    dueDate={task.dueDate}
                    startDate={task.startDate}
                    onDateChange={handleDateChange}
                  >
                    <Button variant="secondary" size="sm" className="h-8 px-3 gap-1.5 border-0">
                      <Calendar className="w-4 h-4" />
                      Datas
                    </Button>
                  </DatePickerPopover>

                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 px-3 gap-1.5 border-0"
                    onClick={() => {
                      checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      if (task) {
                        addChecklist(task.id);
                      }
                    }}
                  >
                    <CheckSquare className="w-4 h-4" />
                    Checklist
                  </Button>
                </div>
              )}

              {/* Labels Display */}
              {task.labelIds && task.labelIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-8">
                  {task.labelIds.map((labelId) => {
                    const label = defaultTaskLabels.find(l => l.id === labelId);
                    if (!label) return null;
                    return (
                      <span
                        key={labelId}
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Dates Display */}
              {(task.dueDate || task.startDate) && (
                <div className="flex items-center gap-3 text-sm pl-8">
                  {task.startDate && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(task.startDate), "dd MMM", { locale: ptBR })}</span>
                    </div>
                  )}
                  {task.startDate && task.dueDate && (
                    <span className="text-muted-foreground">→</span>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(task.dueDate), "dd MMM yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Assignees Display - Full Names */}
              {assignees.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pl-8">
                  {assignees.map((user) => (
                    <div key={user!.id} className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-full">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                          {user!.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user!.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Description Section - Trello Style */}
              <div ref={descriptionRef}>
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Descrição</span>
                </div>
                <div className="pl-6">
                  {isEditingDescription && canManageTasks ? (
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      onSave={handleDescriptionSave}
                      onCancel={() => {
                        setDescription(task.description || "");
                        setIsEditingDescription(false);
                      }}
                    />
                  ) : (
                    <div
                      className={`min-h-[56px] p-3 rounded-lg bg-muted/80 border border-border transition-all text-sm shadow-sm ${canManageTasks ? 'cursor-pointer hover:bg-muted hover:border-primary/50' : ''}`}
                      onClick={() => canManageTasks && setIsEditingDescription(true)}
                    >
                      {task.description ? (
                        <p className="whitespace-pre-wrap text-foreground">{task.description}</p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          {canManageTasks ? "Clique para adicionar uma descrição..." : "Nenhuma descrição"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div ref={checklistRef}>
                <ChecklistSection task={task} />
              </div>

              {/* Activity Section - Integrated */}
              <ActivitySection task={task} />

              {/* Created Date */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                Criado em {format(new Date(task.createdAt), "d 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
              </div>
            </div>
          </div>

          {/* Footer with Delete/Cancel/Save buttons */}
          <div className="flex justify-between p-4 border-t border-border bg-muted/30">
            {canManageTasks ? (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            ) : (
              <div /> // Placeholder para manter layout
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {canManageTasks ? "Cancelar" : "Fechar"}
              </Button>
              {canManageTasks && (
                <Button onClick={onClose}>
                  Salvar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskDetailsModal;
