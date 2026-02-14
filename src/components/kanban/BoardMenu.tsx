import { useState } from "react";
import { Archive, BarChart3, History, Menu, RotateCcw, Search, X } from "lucide-react";
import type { EventTask } from "@/hooks/useEventTasks";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import EventProgress from "./EventProgress";

interface BoardMenuProps {
  eventId: string;
  tasks?: EventTask[];
  variant?: "default" | "header";
}

const BoardMenu = ({ eventId, tasks, variant = "default" }: BoardMenuProps) => {
  const { eventTasks, updateTask } = useData();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allTasks = tasks || eventTasks.filter(t => t.eventId === eventId);
  const activeTasks = allTasks.filter(t => !t.isArchived);
  const archivedTasks = allTasks.filter(t => t.isArchived);

  const filteredTasks = activeTasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestoreTask = (taskId: string) => {
    updateTask(taskId, { isArchived: false });
    toast({
      title: "Cartão restaurado",
      description: "O cartão foi movido de volta ao quadro",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {variant === "header" ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 h-9 w-9"
          >
            <Menu className="w-5 h-5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Menu className="w-5 h-5" />
            Menu do Quadro
          </SheetTitle>
        </SheetHeader>

        {/* Progress Section at the top */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Progresso</span>
          </div>
          <EventProgress tasks={allTasks} />
        </div>

        <Tabs defaultValue="search" className="flex-1">
          <TabsList className="w-full rounded-none border-b justify-start h-12 px-4 bg-transparent">
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="w-4 h-4" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1.5">
              <Archive className="w-4 h-4" />
              Arquivados
              {archivedTasks.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                  {archivedTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <History className="w-4 h-4" />
              Atividade
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="p-4 m-0">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cartões..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[calc(100vh-380px)]">
                {searchQuery ? (
                  filteredTasks.length > 0 ? (
                    <div className="space-y-2">
                      {filteredTasks.map((task) => (
                        <TaskSearchResult key={task.id} task={task} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum cartão encontrado
                    </p>
                  )
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Digite para buscar cartões
                  </p>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Archived Tab */}
          <TabsContent value="archived" className="p-4 m-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              {archivedTasks.length > 0 ? (
                <div className="space-y-2">
                  {archivedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1"
                        onClick={() => handleRestoreTask(task.id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum cartão arquivado
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="p-4 m-0">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="text-center py-8">
                <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Histórico de atividades
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Em desenvolvimento
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

const TaskSearchResult = ({ task }: { task: EventTask }) => {
  const statusColors: Record<string, string> = {
    todo: "bg-amber-500",
    in_progress: "bg-sky-500",
    done: "bg-emerald-500",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
      <div className={cn("w-1 h-full min-h-[40px] rounded-full", statusColors[task.status])} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{task.title}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {task.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default BoardMenu;