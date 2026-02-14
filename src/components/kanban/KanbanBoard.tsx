import { useState, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, X, ZoomIn, ZoomOut } from "lucide-react";
import { isPast, isAfter, addDays } from "date-fns";
import type { EventTask, TaskStatus } from "@/hooks/useEventTasks";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDragToScroll } from "@/hooks/useDragToScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import KanbanColumn from "./KanbanColumn";
import TaskCard from "./TaskCard";
import TaskFormModal from "./TaskFormModal";
import TaskDetailsModal from "./TaskDetailsModal";
import BoardFilters, { BoardFiltersState } from "./BoardFilters";
import BoardBackgroundPicker, { KanbanBackground, getBackgroundClasses, getToolbarBackgroundClasses } from "./BoardBackgroundPicker";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import { TooltipProvider } from "@/components/ui/tooltip";

interface KanbanBoardProps {
  eventId: string;
  onBackgroundChange?: (bg: KanbanBackground) => void;
}

interface CustomColumn {
  id: string;
  status: TaskStatus;
  title: string;
  isCustom?: boolean;
}

const initialColumns: CustomColumn[] = [
  { id: "col-todo", status: "todo", title: "A Fazer" },
  { id: "col-in_progress", status: "in_progress", title: "Em Andamento" },
  { id: "col-done", status: "done", title: "Concluído" },
];

const KanbanBoard = ({ eventId, onBackgroundChange }: KanbanBoardProps) => {
  const { getTasksByEventId, updateTask, addTask, eventTasks, getEventById, ministries } = useData();
  const { canEdit, canDelete, canCreate } = useSubscriptionStatus();
  const canManageTasks = canEdit && canDelete && canCreate;

  // Get only non-archived tasks
  const allTasks = eventTasks.filter((t) => t.eventId === eventId && !t.isArchived);

  // Flag to prevent duplicate initialization
  const hasInitializedRef = useRef(false);

  // Auto-create cards for collaborator ministries on first open
  useEffect(() => {
    const event = getEventById(eventId);
    
    // Conditions to auto-create:
    // 1. Event exists and has collaborator ministries
    // 2. No existing tasks for this event
    // 3. Haven't initialized yet
    // 4. Ministries data is loaded
    if (
      event?.collaboratorMinistryIds?.length &&
      allTasks.length === 0 &&
      !hasInitializedRef.current &&
      ministries.length > 0
    ) {
      hasInitializedRef.current = true;
      
      // Create a card for each collaborator ministry
      event.collaboratorMinistryIds.forEach((ministryId, index) => {
        const ministry = ministries.find(m => m.id === ministryId);
        if (ministry) {
          addTask({
            eventId,
            title: ministry.name,
            ministryId,
            status: "todo",
            priority: "medium",
            order: index,
            assigneeIds: [],
          });
        }
      });
    }
  }, [eventId, allTasks.length, ministries, addTask, getEventById]);

  const [activeTask, setActiveTask] = useState<EventTask | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [formInitialStatus, setFormInitialStatus] = useState<TaskStatus>("todo");

  // Always derive the selected task from the latest context state
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return eventTasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, eventTasks]);

  // Filters state
  const [filters, setFilters] = useState<BoardFiltersState>({
    memberIds: [],
    labelIds: [],
    dueFilter: "all",
  });
  
  // Dynamic columns state
  const [columns, setColumns] = useState<CustomColumn[]>(initialColumns);
  
  // Add new list state
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  
  // Background color state
  const [boardBackground, setBoardBackground] = useState<KanbanBackground>("default");
  
  // Zoom state (100 = 100%, 90 = 90%, etc.)
  const [zoomLevel, setZoomLevel] = useState(100);
  const MIN_ZOOM = 60;
  const MAX_ZOOM = 130;
  const ZOOM_STEP = 10;
  
  // Notify parent when background changes
  const handleBackgroundChange = (bg: KanbanBackground) => {
    setBoardBackground(bg);
    onBackgroundChange?.(bg);
  };
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  };
  
  // Drag to scroll ref for the columns container
  const columnsContainerRef = useDragToScroll<HTMLDivElement>();
  
  // Ref for scroll-to-top button
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  // Hooks must be called unconditionally - define sensors first
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 500,
      tolerance: 10,
    },
  });
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  // Sensors: on mobile we avoid PointerSensor (touch generates pointer events) to prevent accidental drags while scrolling.
  // When the user cannot manage tasks (expired trial), sensors are disabled to prevent drag-and-drop.
  const sensors = useSensors(
    ...(canManageTasks
      ? isMobile
        ? [touchSensor]
        : [pointerSensor]
      : []),
    keyboardSensor
  );

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // Filter by members
      if (filters.memberIds.length > 0) {
        const hasMatchingMember = task.assigneeIds.some(id => filters.memberIds.includes(id));
        if (!hasMatchingMember) return false;
      }

      // Filter by labels
      if (filters.labelIds.length > 0) {
        const hasMatchingLabel = task.labelIds?.some(id => filters.labelIds.includes(id));
        if (!hasMatchingLabel) return false;
      }

      // Filter by due date
      if (filters.dueFilter !== "all") {
        const today = new Date();
        const weekFromNow = addDays(today, 7);

        switch (filters.dueFilter) {
          case "overdue":
            if (!task.dueDate || !isPast(new Date(task.dueDate))) return false;
            break;
          case "week":
            if (!task.dueDate) return false;
            const dueDate = new Date(task.dueDate);
            if (isPast(dueDate) || isAfter(dueDate, weekFromNow)) return false;
            break;
          case "none":
            if (task.dueDate) return false;
            break;
        }
      }

      return true;
    });
  }, [allTasks, filters]);

  const tasksByStatus = useMemo(() => {
    const result: Record<string, EventTask[]> = {};
    columns.forEach(col => {
      result[col.status] = filteredTasks.filter(t => t.status === col.status);
    });
    return result;
  }, [filteredTasks, columns]);

  const handleDragStart = (event: DragStartEvent) => {
    // Trial expirado/bloqueio: não permitir arrastar
    if (!canManageTasks) return;

    const task = allTasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Trial expirado/bloqueio: não permitir alterar status
    if (!canManageTasks) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = allTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping over a column
    const isOverColumn = columns.some((col) => col.status === overId);
    if (isOverColumn) {
      const newStatus = overId as TaskStatus;
      if (activeTask.status !== newStatus) {
        updateTask(activeId, { status: newStatus });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    // Trial expirado/bloqueio: não permitir alterar status
    if (!canManageTasks) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = allTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropped over a column
    const isOverColumn = columns.some((col) => col.status === overId);
    if (isOverColumn) {
      const newStatus = overId as TaskStatus;
      updateTask(activeId, { status: newStatus });
    } else {
      // Dropped over another task
      const overTask = allTasks.find((t) => t.id === overId);
      if (overTask && activeTask.status !== overTask.status) {
        updateTask(activeId, { status: overTask.status, order: overTask.order });
      }
    }
  };

  const handleAddTask = (status: TaskStatus, title?: string) => {
    if (title) {
      // Quick add from inline input
      const existingTasks = getTasksByEventId(eventId);
      const maxOrder =
        existingTasks.length > 0
          ? Math.max(...existingTasks.filter((t) => t.status === status).map((t) => t.order))
          : -1;

      addTask({
        eventId,
        title,
        status,
        priority: "medium",
        order: maxOrder + 1,
        assigneeIds: [],
      });
    } else {
      // Open modal for full form
      setSelectedTaskId(null);
      setFormInitialStatus(status);
      setIsFormOpen(true);
    }
  };

  const handleTaskClick = (task: EventTask) => {
    setSelectedTaskId(task.id);
    setIsDetailsOpen(true);
  };

  const handleMoveTask = (taskId: string, newStatus: TaskStatus) => {
    // Trial expirado/bloqueio: não permitir alterar status
    if (!canManageTasks) return;
    updateTask(taskId, { status: newStatus });
  };

  const handleEditTask = () => {
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  };

  const handleAddListSubmit = () => {
    if (!newListName.trim()) return;
    
    // Create new custom column - using 'todo' as default status for custom lists
    const newColumn: CustomColumn = {
      id: `col-custom-${Date.now()}`,
      status: "todo", // Custom columns act as 'todo' status
      title: newListName.trim(),
      isCustom: true,
    };
    
    setColumns(prev => [...prev, newColumn]);
    setNewListName("");
    setIsAddingList(false);
  };

  const handleAddListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddListSubmit();
    }
    if (e.key === "Escape") {
      setIsAddingList(false);
      setNewListName("");
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-x-hidden">
      {/* Trello-style Compact Toolbar */}
      <div className={cn("px-3 py-2 border-b transition-colors duration-500", getToolbarBackgroundClasses(boardBackground))}>
        {/* Row 1: Filters + Background picker + Zoom - responsive layout */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          {/* Filters group */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <BoardFilters filters={filters} onFiltersChange={setFilters} />
            <BoardBackgroundPicker value={boardBackground} onChange={handleBackgroundChange} />
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-foreground hover:text-foreground active:text-foreground hover:bg-muted active:bg-muted focus:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              title="Diminuir zoom"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[44px] text-center">{zoomLevel}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-foreground hover:text-foreground active:text-foreground hover:bg-muted active:bg-muted focus:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              title="Aumentar zoom"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board with custom background - Full screen workspace */}
      <div
        className={cn(
          "flex-1 relative overflow-hidden transition-colors duration-500 min-h-[800px] lg:min-h-[950px]",
          getBackgroundClasses(boardBackground)
        )}
      >
        <TooltipProvider>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
          {/* Scrollable container - this is the "blue background" that handles drag-to-scroll */}
          <div 
            ref={(el) => {
              // Assign to both refs
              (columnsContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className="absolute inset-0 overflow-x-auto overflow-y-auto scrollbar-hide"
            style={{ touchAction: 'pan-y' }}
          >
            {/* Wrapper to handle zoom scaling properly */}
            <div 
              className="inline-block min-h-full"
              style={{ 
                transformOrigin: 'top left',
              }}
            >
              {/* Inner content with padding to create blue space around columns */}
              <div 
                className="inline-flex gap-3 p-4 lg:p-6 min-h-full items-start transition-transform duration-200"
                style={{ 
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top left',
                }}
              >
              {columns.map((column) => (
                <div 
                  key={column.id} 
                  className="flex-shrink-0 w-[75vw] md:w-[260px] lg:w-[280px]"
                  data-no-drag
                >
                  <KanbanColumn
                    status={column.status}
                    title={column.title}
                    tasks={tasksByStatus[column.status] || []}
                    onAddTask={(title) => handleAddTask(column.status, title)}
                    onTaskClick={handleTaskClick}
                  />
                </div>
              ))}

              {/* Trello-style Add List Button (only if user can manage) */}
              {canManageTasks && (
                <div className="flex-shrink-0 w-[75vw] md:w-[260px] lg:w-[280px]" data-no-drag>
                  {isAddingList ? (
                    <div className="bg-muted/95 dark:bg-muted/90 rounded-xl p-2 space-y-2">
                      <Input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={handleAddListKeyDown}
                        placeholder="Digite o nome da lista..."
                        className="bg-card"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={handleAddListSubmit}>
                          Adicionar lista
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 hover:bg-accent"
                          onClick={() => {
                            setIsAddingList(false);
                            setNewListName("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background/30 dark:bg-background/20 hover:bg-background/50 dark:hover:bg-background/30 backdrop-blur-sm rounded-xl text-foreground/80 hover:text-foreground transition-colors"
                      onClick={() => setIsAddingList(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar outra lista
                    </button>
                  )}
                </div>
              )}

              {/* Extra space on the right for easier drag initiation */}
              <div className="flex-shrink-0 w-16 md:w-24 lg:w-32 h-full"></div>
            </div>
            </div>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-3 opacity-90">
                <TaskCard task={activeTask} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
          </DndContext>
        </TooltipProvider>

        {/* Scroll to Top Button */}
        <ScrollToTopButton scrollRef={scrollContainerRef} />
      </div>

      {/* Modals */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        eventId={eventId}
        task={selectedTask}
        initialStatus={formInitialStatus}
      />

      <TaskDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        task={selectedTask}
        onEdit={handleEditTask}
        event={getEventById(eventId)}
      />
    </div>
  );
};

export default KanbanBoard;
