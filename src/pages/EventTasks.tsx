import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import BoardMenu from "@/components/kanban/BoardMenu";
import { KanbanBackground, getHeaderBackgroundClasses } from "@/components/kanban/BoardBackgroundPicker";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const EventTasks = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEventById, getMinistryById, getUserById, eventTasks } = useData();
  const { canEdit, canDelete, canCreate } = useSubscriptionStatus();
  const canManageTasks = canEdit && canDelete && canCreate;
  const [boardBackground, setBoardBackground] = useState<KanbanBackground>("default");

  const event = id ? getEventById(id) : null;

  if (!event) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Evento não encontrado</p>
        <Button onClick={() => navigate("/agenda")}>Voltar à Agenda</Button>
      </div>
    );
  }

  const ministry = getMinistryById(event.ministryId);
  const responsible = getUserById(event.responsibleId);

  // Get tasks for the board menu
  const allTasks = eventTasks.filter((t) => t.eventId === id && !t.isArchived);

  const formatEventDate = () => {
    const start = new Date(event.date);
    if (event.endDate) {
      const end = new Date(event.endDate);
      return `${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    return format(start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Trello-style Header */}
      <header className={cn(
        "backdrop-blur-sm px-3 py-2 flex items-center gap-3 transition-colors duration-500",
        getHeaderBackgroundClasses(boardBackground)
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 shrink-0"
          onClick={() => navigate("/meus-quadros")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <h1 className="font-semibold text-white truncate text-sm lg:text-base">
          {event.title}
        </h1>
        
        {ministry && (
          <Badge
            variant="secondary"
            className="shrink-0 text-xs font-medium"
            style={{ 
              backgroundColor: ministry.color,
              color: '#FFFFFF',
              boxShadow: `0 2px 8px ${ministry.color}50`,
            }}
          >
            {ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name}
          </Badge>
        )}
        
        {/* Secondary info - hidden on mobile for compactness */}
        <div className="hidden md:flex items-center gap-3 ml-auto text-white/80 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatEventDate()}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="max-w-[150px] truncate">{event.location}</span>
            </div>
          )}
          
          {responsible && (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{responsible.name}</span>
            </div>
          )}
        </div>

        {/* Board Menu - moved to header (only if can manage) */}
        {canManageTasks && (
          <div className="ml-auto md:ml-0">
            <BoardMenu eventId={id!} tasks={allTasks} variant="header" />
          </div>
        )}
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard eventId={id!} onBackgroundChange={setBoardBackground} />
      </div>
    </div>
  );
};

export default EventTasks;