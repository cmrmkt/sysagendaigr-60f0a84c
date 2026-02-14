import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Plus, Trash2, Calendar, User, X, Pencil, Check, GripVertical } from "lucide-react";
import type { TaskChecklist, EventTask, TaskChecklistItem } from "@/hooks/useEventTasks";
import { useData } from "@/contexts/DataContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Item Component
interface SortableItemProps {
  item: TaskChecklistItem;
  taskId: string;
  checklistId: string;
  getAssigneeName: (id?: string) => string | null;
  canManageTasks: boolean;
}

const SortableItem = ({ item, taskId, checklistId, getAssigneeName, canManageTasks }: SortableItemProps) => {
  const { toggleChecklistItem, deleteChecklistItem } = useData();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 group rounded-lg p-2 -mx-2 transition-all duration-200",
        "hover:bg-accent/50",
        item.isCompleted && "opacity-60",
        isDragging && "opacity-50 bg-accent shadow-lg z-50"
      )}
    >
      {/* Drag Handle - only show if user can manage */}
      {canManageTasks && (
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <Checkbox
        checked={item.isCompleted}
        onCheckedChange={() => canManageTasks && toggleChecklistItem(taskId, checklistId, item.id)}
        disabled={!canManageTasks}
        className={cn(
          "mt-0.5 h-5 w-5 transition-all duration-200",
          item.isCompleted && "data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
        )}
      />
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm block transition-all duration-200",
            item.isCompleted && "line-through text-muted-foreground"
          )}
        >
          {item.title}
        </span>
        {(item.assigneeId || item.dueDate) && (
          <div className="flex items-center gap-3 mt-1">
            {item.assigneeId && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {getAssigneeName(item.assigneeId)}
              </span>
            )}
            {item.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(item.dueDate), "dd MMM", { locale: ptBR })}
              </span>
            )}
          </div>
        )}
      </div>
      {canManageTasks && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => deleteChecklistItem(taskId, checklistId, item.id)}
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
    </div>
  );
};

interface SingleChecklistProps {
  task: EventTask;
  checklist: TaskChecklist;
}

const SingleChecklist = ({ task, checklist }: SingleChecklistProps) => {
  const { 
    users, 
    updateChecklistTitle, 
    deleteChecklist, 
    addChecklistItem, 
    reorderChecklistItems,
  } = useData();
  const { canEdit, canDelete, canCreate } = useSubscriptionStatus();
  const canManageTasks = canEdit && canDelete && canCreate;
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(checklist.title);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemAssignee, setNewItemAssignee] = useState<string | undefined>();
  const [newItemDueDate, setNewItemDueDate] = useState<Date | undefined>();
  const [hideCompleted, setHideCompleted] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const items = checklist.items || [];
  const completedItems = items.filter(item => item.isCompleted).length;
  const totalItems = items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const isAllCompleted = totalItems > 0 && completedItems === totalItems;
  
  const visibleItems = hideCompleted 
    ? items.filter(item => !item.isCompleted)
    : items;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isAddingItem && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingItem]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    if (!canManageTasks) {
      setIsEditingTitle(false);
      return;
    }
    if (editedTitle.trim() && editedTitle !== checklist.title) {
      updateChecklistTitle(task.id, checklist.id, editedTitle.trim());
    } else {
      setEditedTitle(checklist.title);
    }
    setIsEditingTitle(false);
  };

  const handleAddItem = () => {
    if (!canManageTasks || !newItemTitle.trim()) return;

    addChecklistItem(
      task.id, 
      checklist.id, 
      newItemTitle.trim(), 
      newItemAssignee,
      newItemDueDate ? format(newItemDueDate, "yyyy-MM-dd") : undefined
    );

    setNewItemTitle("");
    setNewItemAssignee(undefined);
    setNewItemDueDate(undefined);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
    if (e.key === "Escape") {
      handleCloseForm();
    }
  };

  const handleCloseForm = () => {
    setIsAddingItem(false);
    setNewItemTitle("");
    setNewItemAssignee(undefined);
    setNewItemDueDate(undefined);
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const user = users.find(u => u.id === assigneeId);
    return user?.name || null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canManageTasks) return;
    
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      const newOrder = arrayMove(items, oldIndex, newIndex);
      reorderChecklistItems(task.id, checklist.id, newOrder.map(item => item.id));
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CheckSquare className={cn(
            "w-4 h-4 shrink-0",
            isAllCompleted ? "text-emerald-600" : "text-muted-foreground"
          )} />
          
          {isEditingTitle && canManageTasks ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                ref={titleInputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setEditedTitle(checklist.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="h-7 text-sm font-medium bg-background"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleTitleSave}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <span 
              className={`font-medium text-sm ${canManageTasks ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
              onClick={() => canManageTasks && setIsEditingTitle(true)}
            >
              {checklist.title}
            </span>
          )}
        </div>

        {canManageTasks && (
          <div className="flex items-center gap-1 shrink-0">
            {!isEditingTitle && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setIsEditingTitle(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir checklist?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O checklist "{checklist.title}" será removido permanentemente. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteChecklist(task.id, checklist.id)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Progress bar - Enhanced Visual */}
      {totalItems > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className={cn(
              "font-semibold",
              isAllCompleted ? "text-emerald-600" : "text-muted-foreground"
            )}>
              {completedItems}/{totalItems} concluídos
            </span>
            <span className={cn(
              "font-bold text-sm",
              isAllCompleted ? "text-emerald-600" : progress >= 50 ? "text-primary" : "text-muted-foreground"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500 ease-out rounded-full",
                isAllCompleted 
                  ? "bg-emerald-500" 
                  : progress >= 75 
                    ? "bg-primary" 
                    : progress >= 50 
                      ? "bg-primary/80" 
                      : "bg-primary/60"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          {completedItems > 0 && (
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs px-2"
                onClick={() => setHideCompleted(!hideCompleted)}
              >
                {hideCompleted ? `Mostrar ${completedItems} concluídos` : "Ocultar concluídos"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Items with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5">
            {visibleItems.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                taskId={task.id}
                checklistId={checklist.id}
                getAssigneeName={getAssigneeName}
                canManageTasks={canManageTasks}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {hideCompleted && completedItems > 0 && (
        <div className="text-xs text-muted-foreground text-center py-2">
          {completedItems} {completedItems === 1 ? "item concluído oculto" : "itens concluídos ocultos"}
        </div>
      )}

      {/* Add item form - only if user can manage */}
      {isAddingItem && canManageTasks && (
        <div className="space-y-2 p-3 mt-2 bg-muted/30 rounded-lg border border-border/50">
          <Input
            ref={inputRef}
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicione um item..."
            className="h-10"
          />
          
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 min-w-[44px]">
                  <User className="w-4 h-4" />
                  {newItemAssignee ? getAssigneeName(newItemAssignee) : "Atribuir"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 pointer-events-auto" align="start">
                <div className="space-y-1">
                  {users.map((user) => (
                    <Button
                      key={user.id}
                      variant={newItemAssignee === user.id ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start gap-2 h-9"
                      onClick={() => setNewItemAssignee(user.id)}
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="text-[10px]">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{user.name}</span>
                    </Button>
                  ))}
                  {newItemAssignee && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs text-muted-foreground"
                      onClick={() => setNewItemAssignee(undefined)}
                    >
                      Remover atribuição
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 min-w-[44px]">
                  <Calendar className="w-4 h-4" />
                  {newItemDueDate 
                    ? format(newItemDueDate, "dd MMM", { locale: ptBR }) 
                    : "Data"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <CalendarComponent
                  mode="single"
                  selected={newItemDueDate}
                  onSelect={setNewItemDueDate}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
                {newItemDueDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => setNewItemDueDate(undefined)}
                    >
                      Remover data
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-1">
            <Button 
              size="sm" 
              onClick={handleAddItem} 
              disabled={!newItemTitle.trim()}
              className="px-4"
            >
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCloseForm}
              className="px-4"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Add item button - only if user can manage */}
      {canManageTasks && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 w-full justify-start h-8 text-muted-foreground hover:text-foreground",
          )}
          onClick={() => {
            if (!isAddingItem) {
              setIsAddingItem(true);
            } else {
              inputRef.current?.focus();
            }
          }}
        >
          <Plus className="w-4 h-4" />
          Adicionar item
        </Button>
      )}
    </div>
  );
};

// ============= MAIN COMPONENT =============
interface ChecklistSectionProps {
  task: EventTask;
  onAddChecklist?: () => void;
}

const ChecklistSection = ({ task, onAddChecklist }: ChecklistSectionProps) => {
  const { addChecklist } = useData();
  const checklists = task.checklists || [];

  // Calculate overall progress
  const totalItems = checklists.reduce((acc, c) => acc + (c.items?.length || 0), 0);
  const completedItems = checklists.reduce((acc, c) => 
    acc + (c.items?.filter(i => i.isCompleted).length || 0), 0
  );
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleAddChecklist = () => {
    addChecklist(task.id);
    onAddChecklist?.();
  };

  if (checklists.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress Summary */}
      {checklists.length > 1 && totalItems > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Progresso total:</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                overallProgress === 100 ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className={cn(
            "text-sm font-semibold",
            overallProgress === 100 ? "text-emerald-600" : "text-foreground"
          )}>
            {overallProgress}%
          </span>
        </div>
      )}

      {checklists.map((checklist) => (
        <SingleChecklist 
          key={checklist.id} 
          task={task} 
          checklist={checklist} 
        />
      ))}
    </div>
  );
};

export default ChecklistSection;
