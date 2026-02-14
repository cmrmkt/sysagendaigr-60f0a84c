import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Repeat, Lock, MapPin, Calendar, CalendarDays, CalendarRange, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
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

interface MobileCalendarViewProps {
  onEventClick: (eventId: string) => void;
}

const MobileCalendarView = ({ onEventClick }: MobileCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const { events, getMinistryById, deleteEvent, deleteEventSeries } = useData();
  const { toast } = useToast();
  const { role } = useAuth();
  const { canCreate, canDelete } = useSubscriptionStatus();
  const navigate = useNavigate();
  
  const canManageEvents = role !== "viewer" && canCreate && canDelete;

  const daysOfWeek = ["D", "S", "T", "Q", "Q", "S", "S"];
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const shortDayNames = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];

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

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === "prev" ? -7 : 7));
      return newDate;
    });
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === "prev" ? -7 : 7));
      return newDate;
    });
  };

  const navigateDay = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -1 : 1;
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + offset);
      return newDate;
    });
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + offset);
      return newDate;
    });
  };

  const handleNavigate = (direction: "prev" | "next") => {
    switch (viewMode) {
      case "day":
        navigateDay(direction);
        break;
      case "week":
        navigateWeek(direction);
        break;
      case "month":
        navigateMonth(direction);
        break;
    }
  };

  const getWeekDays = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const days: (number | null)[] = [];

  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isToday = (day: number | Date) => {
    const today = new Date();
    if (typeof day === "number") {
      return (
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()
      );
    }
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number | Date) => {
    if (typeof day === "number") {
      return (
        day === selectedDate.getDate() &&
        currentDate.getMonth() === selectedDate.getMonth() &&
        currentDate.getFullYear() === selectedDate.getFullYear()
      );
    }
    return (
      day.getDate() === selectedDate.getDate() &&
      day.getMonth() === selectedDate.getMonth() &&
      day.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isSunday = (day: number | Date) => {
    if (typeof day === "number") {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      return date.getDay() === 0;
    }
    return day.getDay() === 0;
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const handleWeekDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const selectedDayEvents = getEventsForDate(selectedDate);

  const isEventRecurring = (event: typeof events[0]) => {
    return (event.recurrence && event.recurrence.type !== "none") || !!event.parentEventId;
  };

  const handleAddEvent = () => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    navigate(`/evento/novo?date=${dateStr}`);
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

  const getEventIndicators = (day: number | Date) => {
    const dateForDay = typeof day === "number" 
      ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      : day;
    const dayEvents = getEventsForDate(dateForDay);
    
    const uniqueColors = [...new Set(dayEvents.map(e => {
      const ministry = getMinistryById(e.ministryId);
      return e.customColor || ministry?.color || "hsl(var(--primary))";
    }))].slice(0, 3);
    
    return uniqueColors;
  };

  const formatNavigationTitle = () => {
    switch (viewMode) {
      case "day":
        return `${selectedDate.getDate()} de ${months[selectedDate.getMonth()].substring(0, 3)}.`.toUpperCase();
      case "week": {
        const weekDays = getWeekDays();
        const weekStart = weekDays[0];
        const weekEnd = weekDays[6];
        return `${weekStart.getDate()} - ${weekEnd.getDate()} ${months[weekEnd.getMonth()].substring(0, 3).toUpperCase()}.`;
      }
      case "month":
      default:
        return `${months[currentDate.getMonth()].substring(0, 3).toUpperCase()}.`;
    }
  };

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

  const getEventsForHour = (date: Date, hour: number) => {
    const dayEvents = getEventsForDate(date).filter(e => !e.isAllDay);
    return dayEvents.filter(event => {
      const eventHour = parseInt(event.startTime.split(':')[0]);
      return eventHour === hour;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* View Mode Tabs */}
      <div className="flex border-b border-border bg-muted/30">
        <button
          onClick={() => setViewMode("day")}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            viewMode === "day" 
              ? "text-primary border-b-2 border-primary bg-background" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="h-4 w-4" />
          Dia
        </button>
        <button
          onClick={() => setViewMode("week")}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            viewMode === "week" 
              ? "text-primary border-b-2 border-primary bg-background" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarRange className="h-4 w-4" />
          Semana
        </button>
        <button
          onClick={() => setViewMode("month")}
          className={cn(
            "flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            viewMode === "month" 
              ? "text-primary border-b-2 border-primary bg-background" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Mês
        </button>
      </div>

      {/* Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => handleNavigate("prev")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">{formatNavigationTitle()}</h2>
        <Button variant="ghost" size="icon" onClick={() => handleNavigate("next")}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <>
          {/* Compact Calendar Grid */}
          <div className="px-2 py-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day, index) => (
                <div
                  key={day + index}
                  className={cn(
                    "text-center text-xs font-medium py-1",
                    index === 0 ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-12" />;
                }

                const eventIndicators = getEventIndicators(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "h-12 flex flex-col items-center justify-center rounded-lg relative transition-colors",
                      isSelected(day) && "bg-secondary ring-1 ring-border",
                      !isSelected(day) && "hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        isToday(day) && "bg-destructive text-destructive-foreground",
                        isSunday(day) && !isToday(day) && "text-destructive",
                        !isToday(day) && !isSunday(day) && "text-foreground"
                      )}
                    >
                      {day}
                    </span>
                    
                    {eventIndicators.length > 0 && (
                      <div className="flex flex-col gap-0.5 mt-1 items-center w-full px-1">
                        {eventIndicators.map((color, i) => (
                          <div
                            key={i}
                            className="w-full h-1 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Events Section */}
          <div className="flex-1 bg-card border-t flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {selectedDate.getDate()}
                </span>
                <span className="text-sm text-muted-foreground uppercase">
                  {shortDayNames[selectedDate.getDay()]}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-4 py-3">
              {selectedDayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Nenhum evento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => {
                    const ministry = getMinistryById(event.ministryId);
                    const eventColor = event.customColor || ministry?.color || "hsl(var(--primary))";
                    
                      return (
                        <div
                          key={event.id}
                          className="w-full flex items-start gap-3 py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                        >
                          <button
                            onClick={() => onEventClick(event.id)}
                            className="flex-1 text-left flex items-start gap-3"
                          >
                            <div className="text-sm text-muted-foreground w-12 shrink-0 pt-0.5">
                              {event.isAllDay ? "Dia" : event.startTime}
                            </div>
                            <div
                              className="w-1 self-stretch rounded-full shrink-0"
                              style={{ backgroundColor: eventColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-semibold text-foreground truncate">
                                  {event.title}
                                </h4>
                                {isEventRecurring(event) && (
                                  <Repeat className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                                {event.visibility === "private" && (
                                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {event.isAllDay ? "Dia inteiro" : `${event.startTime} - ${event.endTime}`}
                              </p>
                              {event.location && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{event.location}</span>
                                </p>
                              )}
                            </div>
                          </button>
                          {canManageEvents && (
                            <button
                              onClick={(e) => handleDeleteClick(event.id, e)}
                              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                              title="Excluir evento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <>
          {/* Week Days Header - Fixed */}
          <div className="flex border-b border-border bg-background sticky top-0 z-10">
            <div className="w-12 flex-shrink-0" /> {/* Spacer for time column */}
            <div className="flex-1 grid grid-cols-7">
              {getWeekDays().map((date, i) => {
                const shortNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleWeekDayClick(date)}
                    className="py-2 flex flex-col items-center gap-0.5 transition-colors"
                  >
                    <span className={cn(
                      "text-[10px] font-medium uppercase",
                      isSunday(date) ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {shortNames[i]}
                    </span>
                    <span
                      className={cn(
                        "w-7 h-7 flex items-center justify-center text-base font-semibold rounded-full",
                        isToday(date) && "bg-primary text-primary-foreground",
                        !isToday(date) && isSunday(date) && "text-destructive",
                        !isToday(date) && !isSunday(date) && "text-foreground"
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week Grid Timeline */}
          <div className="flex-1 overflow-y-auto relative">
            {/* Current time indicator */}
            {(() => {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinutes = now.getMinutes();
              const weekDays = getWeekDays();
              const todayIndex = weekDays.findIndex(d => isToday(d));
              
              if (todayIndex >= 0 && currentHour >= 0 && currentHour <= 23) {
                const topPosition = (currentHour * 48) + ((currentMinutes / 60) * 48);
                const leftOffset = 48 + (todayIndex * (100 / 7));
                
                return (
                  <div 
                    className="absolute z-20 flex items-center pointer-events-none"
                    style={{ 
                      top: `${topPosition}px`,
                      left: '48px',
                      right: 0
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary -ml-1" />
                    <div 
                      className="h-0.5 bg-primary"
                      style={{ 
                        width: `calc(${((todayIndex + 1) / 7) * 100}% - ${todayIndex * 2}px)`,
                        marginLeft: `calc(${(todayIndex / 7) * 100}%)` 
                      }}
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* Hours grid */}
            {Array.from({ length: 24 }, (_, hour) => {
              const weekDays = getWeekDays();
              
              return (
                <div key={hour} className="flex min-h-[48px]">
                  {/* Time label */}
                  <div className="w-12 flex-shrink-0 text-[11px] text-muted-foreground text-right pr-2 -mt-2">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  
                  {/* Day columns */}
                  <div className="flex-1 grid grid-cols-7 border-t border-border/30">
                    {weekDays.map((date, dayIndex) => {
                      const dayEvents = getEventsForHour(date, hour);
                      
                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "relative border-l border-border/30 min-h-[48px]",
                            dayIndex === 0 && "border-l-0"
                          )}
                          onClick={() => {
                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            navigate(`/evento/novo?date=${dateStr}&time=${hour.toString().padStart(2, '0')}:00`);
                          }}
                        >
                          {dayEvents.map((event, eventIdx) => {
                            const ministry = getMinistryById(event.ministryId);
                            const eventColor = event.customColor || ministry?.color || "hsl(var(--primary))";
                            const startHour = parseInt(event.startTime.split(':')[0]);
                            const endHour = parseInt(event.endTime.split(':')[0]);
                            const duration = Math.max(1, endHour - startHour);
                            
                            return (
                              <button
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick(event.id);
                                }}
                                className="absolute inset-x-0.5 rounded text-white text-[10px] leading-tight p-0.5 overflow-hidden z-10"
                                style={{ 
                                  backgroundColor: eventColor,
                                  height: `${duration * 48 - 4}px`,
                                  top: '2px'
                                }}
                              >
                                <div className="flex items-start gap-0.5">
                                  {isEventRecurring(event) && <Repeat className="h-2.5 w-2.5 flex-shrink-0 mt-0.5" />}
                                  <span className="font-medium line-clamp-3 break-words">{event.title}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* DAY VIEW */}
      {viewMode === "day" && (
        <>
          {/* Day Header */}
          <div className="px-4 py-3 border-b border-border bg-card">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {selectedDate.getDate()}
              </span>
              <span className="text-sm text-muted-foreground uppercase">
                {shortDayNames[selectedDate.getDay()]}
              </span>
            </div>
          </div>

          {/* Day Timeline */}
          <div className="flex-1 overflow-y-auto">
            {hours.map(hour => {
              const hourEvents = getEventsForHour(selectedDate, hour);
              
              return (
                <div key={hour} className="flex border-b border-border/50 min-h-[64px]">
                  <div className="w-16 py-3 text-sm text-muted-foreground text-right pr-3 flex-shrink-0">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 py-1 border-l border-border/50">
                    {hourEvents.map(event => {
                      const ministry = getMinistryById(event.ministryId);
                      const eventColor = event.customColor || ministry?.color || "hsl(var(--primary))";
                      
                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event.id)}
                          className="w-full text-left rounded-lg p-3 mb-1 text-white"
                          style={{ backgroundColor: eventColor }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-1 h-10 rounded-full flex-shrink-0"
                              style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm flex items-center gap-1">
                                <span className="truncate">{event.title}</span>
                                {isEventRecurring(event) && <Repeat className="h-3 w-3 flex-shrink-0" />}
                                {event.visibility === "private" && <Lock className="h-3 w-3 flex-shrink-0" />}
                              </div>
                              <div className="text-xs opacity-90">
                                {event.startTime} - {event.endTime}
                              </div>
                              {event.location && (
                                <div className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
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
            })}
          </div>
        </>
      )}

      {/* Add event bar */}
      <div className="p-3 border-t border-border flex items-center gap-3 bg-background">
        <button
          onClick={handleAddEvent}
          className="flex-1 bg-secondary text-muted-foreground text-left px-4 py-3 rounded-full text-sm hover:bg-secondary/80 transition-colors"
        >
          Adic. evento em {selectedDate.getDate()} de {months[selectedDate.getMonth()].toLowerCase().substring(0, 3)}.
        </button>
        <button
          onClick={handleAddEvent}
          className="w-12 h-12 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors flex-shrink-0"
        >
          <Plus className="h-6 w-6 text-foreground" />
        </button>
      </div>
    </div>
  );
};

export default MobileCalendarView;
