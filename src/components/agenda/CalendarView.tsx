import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Edit, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "./EventCard";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MobileCalendarView from "./MobileCalendarView";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
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

type ViewMode = "day" | "week" | "month";

interface CalendarViewProps {
  onEventClick: (eventId: string) => void;
}

const CalendarView = ({ onEventClick }: CalendarViewProps) => {
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const { events, getMinistryById, deleteEvent, deleteEventSeries } = useData();
  const { toast } = useToast();
  const { role } = useAuth();
  const { canCreate, canDelete } = useSubscriptionStatus();
  const navigate = useNavigate();
  
  const canManageEvents = role !== "viewer" && canCreate && canDelete;

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    return events.filter((event) => {
      if (event.date === dateStr) return true;
      if (event.endDate) {
        const eventStart = new Date(event.date);
        const eventEnd = new Date(event.endDate);
        const currentDate = new Date(dateStr);
        return currentDate >= eventStart && currentDate <= eventEnd;
      }
      return false;
    });
  };

  const navigate_ = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === "day") {
        newDate.setDate(prev.getDate() + (direction === "prev" ? -1 : 1));
      } else if (viewMode === "week") {
        newDate.setDate(prev.getDate() + (direction === "prev" ? -7 : 7));
      } else {
        if (direction === "prev") {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getHeaderTitle = () => {
    const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    
    if (viewMode === "day") {
      return `${dayNames[currentDate.getDay()]}, ${currentDate.getDate()} de ${months[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else if (viewMode === "week") {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const formatShortDate = (d: Date) => `${d.getDate()} ${months[d.getMonth()].substring(0, 3)}`;
      return `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`;
    }
    return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const handleSlotClick = (date: Date, time?: string) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams({ date: dateStr });
    if (time) {
      params.append("time", time);
    }
    navigate(`/evento/novo?${params.toString()}`);
  };

  const handleDayClick = (day: number) => {
    const dateForDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(dateForDay);
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const formatSelectedDate = (date: Date) => {
    const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return `${dayNames[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
  };

  const isEventRecurring = (event: typeof events[0]) => {
    return (event.recurrence && event.recurrence.type !== "none") || !!event.parentEventId;
  };

  const handleDeleteClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const event = events.find(ev => ev.id === eventId);
    if (!event) return;
    
    const isRecurring = isEventRecurring(event);
    if (isRecurring) {
      setEventToDelete(eventId);
      setShowDeleteDialog(true);
    } else {
      deleteEvent(eventId);
      toast({
        title: "Evento excluído",
        description: "O evento foi removido com sucesso.",
      });
    }
  };

  const handleDeleteSingle = () => {
    if (!eventToDelete) return;
    deleteEvent(eventToDelete);
    toast({
      title: "Evento excluído",
      description: "O evento foi removido com sucesso.",
    });
    setShowDeleteDialog(false);
    setEventToDelete(null);
  };

  const handleDeleteSeries = () => {
    if (!eventToDelete) return;
    const event = events.find(ev => ev.id === eventToDelete);
    const parentId = event?.parentEventId || eventToDelete;
    deleteEventSeries(parentId);
    toast({
      title: "Série excluída",
      description: "Todos os eventos da série foram removidos.",
    });
    setShowDeleteDialog(false);
    setEventToDelete(null);
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const days = [];

  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Use mobile-optimized view on small screens
  if (isMobile) {
    return <MobileCalendarView onEventClick={onEventClick} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header do Calendário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate_("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground min-w-[180px] lg:min-w-[320px] text-center">
            {getHeaderTitle()}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigate_("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
            Hoje
          </Button>
        </div>

        <div className="flex gap-1 bg-secondary p-1 rounded-lg">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode(mode)}
              className="capitalize"
            >
              {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
            </Button>
          ))}
        </div>
      </div>

      {/* Views */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "day" && (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onSlotClick={handleSlotClick}
            getMinistryById={getMinistryById}
          />
        )}

        {viewMode === "week" && (
          <WeekView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onSlotClick={handleSlotClick}
            getMinistryById={getMinistryById}
          />
        )}

        {viewMode === "month" && (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid dos dias */}
            <div className="grid grid-cols-7 gap-1 auto-rows-fr flex-1 min-h-0">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="bg-muted/30 rounded-lg min-h-[70px] lg:min-h-[90px]" />;
                }

                const dateForDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dayEvents = getEventsForDate(dateForDay);

                return (
                  <div
                    key={day}
                    className={cn(
                      "bg-card border rounded-lg p-1 lg:p-2 min-h-[70px] lg:min-h-[90px] transition-colors group cursor-pointer hover:bg-muted/50",
                      isToday(day) && "ring-2 ring-primary bg-primary/5",
                      isSelectedDay(day) && "ring-2 ring-accent-foreground bg-accent/20"
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday(day) ? "text-primary" : "text-foreground",
                          isSelectedDay(day) && "font-bold"
                        )}
                      >
                        {day}
                      </span>
                      <Plus 
                        className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSlotClick(dateForDay);
                        }}
                      />
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => {
                        const ministry = getMinistryById(event.ministryId);
                        const eventColor = event.customColor || ministry?.color || "hsl(0, 0%, 50%)";
                        return (
                          <div
                            key={event.id}
                            className="w-full h-4 rounded text-[9px] font-medium px-1 truncate text-left"
                            style={{ backgroundColor: eventColor, color: '#ffffff' }}
                            title={`${event.title} - ${ministry ? (ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name) : 'Sem ministério'}`}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          +{dayEvents.length - 3}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Seção de detalhes do dia selecionado */}
            {selectedDate && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">
                    {formatSelectedDate(selectedDate)}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSlotClick(selectedDate)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Novo Evento
                  </Button>
                </div>
                
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum evento neste dia
                  </p>
                ) : (
                  <ScrollArea className="max-h-[180px]">
                    <div className="space-y-2 pr-4">
                      {selectedDateEvents.map((event) => {
                        const ministry = getMinistryById(event.ministryId);
                        const eventColor = event.customColor || ministry?.color || "hsl(0, 0%, 50%)";
                        const recurring = isEventRecurring(event);
                        
                        return (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:bg-muted/50 cursor-pointer transition-colors group"
                            onClick={() => navigate(`/evento/editar/${event.id}`)}
                          >
                            <div
                              className="w-1.5 h-12 rounded-full flex-shrink-0"
                              style={{ backgroundColor: eventColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate">
                                  {event.title}
                                </p>
                                {recurring && (
                                  <Repeat className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {event.isAllDay ? "Dia inteiro" : `${event.startTime} - ${event.endTime}`}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{event.location}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {ministry ? (ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name) : 'Sem ministério'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {canManageEvents && (
                                <button
                                  onClick={(e) => handleDeleteClick(event.id, e)}
                                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Excluir evento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <Edit className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog de exclusão para eventos recorrentes */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              Este evento faz parte de uma série. O que você deseja excluir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSingle} className="bg-orange-600 hover:bg-orange-700">
              Apenas este evento
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDeleteSeries} className="bg-destructive hover:bg-destructive/90">
              Toda a série
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CalendarView;
