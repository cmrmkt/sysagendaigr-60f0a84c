import { useState } from "react";
import type { EventTask } from "@/hooks/useEventTasks";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EventProgressProps {
  tasks: EventTask[];
}

const EventProgress = ({ tasks }: EventProgressProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;
  const todo = tasks.filter(t => t.status === "todo").length;
  
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  if (total === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full bg-card border rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium text-foreground text-sm">Progresso do Evento</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Compact progress info */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                <Circle className="w-3 h-3 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400">{todo}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60">
                <Clock className="w-3 h-3 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">{inProgress}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-950/60">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-green-600 dark:text-green-400">{done}</span>
              </div>
            </div>
            
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              percentage === 100 
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                : "bg-muted text-muted-foreground"
            )}>
              {percentage}%
            </span>
            
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3">
        <div className="bg-card border rounded-xl p-4 space-y-4">
          {/* Progress Bar with gradient */}
          <div className="relative">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* To Do */}
            <div className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
              "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
            )}>
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700">
                  <Circle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{todo}</span>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">A Fazer</span>
            </div>
            
            {/* In Progress */}
            <div className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
              "bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800"
            )}>
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-blue-200 dark:bg-blue-800">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{inProgress}</span>
              </div>
              <span className="text-xs font-medium text-blue-500 dark:text-blue-400">Em Andamento</span>
            </div>
            
            {/* Done */}
            <div className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all",
              "bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800"
            )}>
              <div className="flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-green-200 dark:bg-green-800">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">{done}</span>
              </div>
              <span className="text-xs font-medium text-green-500 dark:text-green-400">Concluído</span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default EventProgress;