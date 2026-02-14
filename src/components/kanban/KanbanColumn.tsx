import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Plus, X } from "lucide-react";
import type { EventTask, TaskStatus } from "@/hooks/useEventTasks";
import TaskCard from "./TaskCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: EventTask[];
  onAddTask: (title: string) => void;
  onTaskClick: (task: EventTask) => void;
}

// Trello-style neutral colors for all columns
const columnStyle = "bg-slate-100/95 dark:bg-slate-800/90 rounded-xl";

const KanbanColumn = ({ status, title, tasks, onAddTask, onTaskClick }: KanbanColumnProps) => {
  const { canCreate } = useSubscriptionStatus();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTask]);

  const handleAddTaskSubmit = () => {
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim());
      setNewTaskTitle("");
      // Keep input open for quick consecutive additions
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTaskSubmit();
    }
    if (e.key === "Escape") {
      setIsAddingTask(false);
      setNewTaskTitle("");
    }
  };

  const handleCloseAddTask = () => {
    if (newTaskTitle.trim()) {
      handleAddTaskSubmit();
    }
    setIsAddingTask(false);
    setNewTaskTitle("");
  };

  return (
    <div
      className={cn(
        "flex flex-col p-2 min-h-0 transition-colors",
        columnStyle,
        isOver && "ring-2 ring-primary/50"
      )}
    >
      {/* Trello-style Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">
            {title}
          </h3>
          <span className="text-xs text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Tasks List */}
      <div ref={setNodeRef} className="flex-1 space-y-1.5 min-h-[60px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAddingTask && (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-muted-foreground/20 rounded-lg text-muted-foreground text-sm">
            Arraste tarefas aqui
          </div>
        )}
      </div>

      {/* Trello-style Add Card Section - Only show if user can create */}
      {canCreate && (
        <>
          {isAddingTask ? (
            <div className="mt-1.5 space-y-2">
              <textarea
                ref={inputRef}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Insira um título para este cartão..."
                className="w-full p-2 text-sm rounded-lg border border-border/60 bg-card shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={2}
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={handleAddTaskSubmit}
                  disabled={!newTaskTitle.trim()}
                  className="px-3"
                >
                  Adicionar cartão
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={handleCloseAddTask}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="mt-1.5 w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar um cartão</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default KanbanColumn;