import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ListTodo, Plus } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import KanbanBoardsWidget from "@/components/dashboard/KanbanBoardsWidget";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


const MyBoards = () => {
  const navigate = useNavigate();
  const { events, eventTasks, getMinistryById } = useData();
  const { canCreate } = useSubscriptionStatus();

  const [isPickEventOpen, setIsPickEventOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // Get events that have tasks (active boards)
  const eventsWithTasks = events.filter(event => 
    eventTasks.some(task => task.eventId === event.id && !task.isArchived)
  );

  // Filtra apenas eventos futuros (a partir de hoje)
  const futureEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      // Considera endDate para eventos multi-dia
      if (event.endDate) {
        const endDate = new Date(event.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
      }
      return eventDate >= today;
    });
  }, [events]);

  const eventsForPicker = useMemo(() => {
    // Prioriza eventos já com tarefas no topo, depois por data
    const withTasks = new Set(eventsWithTasks.map(e => e.id));
    return [...futureEvents]
      .sort((a, b) => {
        const aHas = withTasks.has(a.id);
        const bHas = withTasks.has(b.id);
        if (aHas !== bHas) return aHas ? -1 : 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [futureEvents, eventsWithTasks]);

  const openAddTask = () => {
    setSelectedEventId(eventsForPicker[0]?.id || "");
    setIsPickEventOpen(true);
  };

  const handleGoToKanban = () => {
    if (!selectedEventId) return;
    setIsPickEventOpen(false);
    navigate(`/evento/${selectedEventId}/tarefas`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b bg-card p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
                  Tarefas
                </h1>
                <p className="text-sm text-muted-foreground">
                  {eventsWithTasks.length} {eventsWithTasks.length === 1 ? "atividade com tarefas" : "atividades com tarefas"}
                </p>
              </div>
            </div>
          </div>
          {canCreate && (
            <Button
              onClick={openAddTask}
              className="gap-2"
              data-testid="menu-tarefas-adicionar"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {eventsWithTasks.length > 0 ? (
          <KanbanBoardsWidget />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <ListTodo className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">
              Nenhuma atividade com tarefas
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Crie tarefas em uma atividade para começar a gerenciar.
            </p>
            <Button onClick={() => navigate("/agenda")}>
              Ir para Agenda
            </Button>
          </div>
        )}
      </div>

      {/* Escolher evento antes de criar tarefa (tarefas sempre vinculadas a uma atividade) */}
      <Dialog open={isPickEventOpen} onOpenChange={setIsPickEventOpen}>
        <DialogContent className="sm:max-w-[520px] w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden">
          <div className="overflow-y-auto max-h-[85vh] p-6">
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
            </DialogHeader>

            {eventsForPicker.length === 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem atividades/eventos. Crie um evento primeiro para então adicionar tarefas.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPickEventOpen(false)}>
                    Fechar
                  </Button>
                  <Button onClick={() => navigate("/evento/novo")}>Criar Evento</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pick-event">Escolha a Atividade/Evento</Label>
                  <select
                    id="pick-event"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {eventsForPicker.map((event) => {
                      const ministry = getMinistryById(event.ministryId);
                      const hasTasks = eventsWithTasks.some((e) => e.id === event.id);
                      const label = `${event.title}${ministry ? ` • ${ministry.name}` : ""}${hasTasks ? " • (com tarefas)" : ""}`;
                      return (
                        <option key={event.id} value={event.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPickEventOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGoToKanban} disabled={!selectedEventId}>
                    Ir para Quadro
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBoards;
