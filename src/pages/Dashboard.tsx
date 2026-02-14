import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Church, Clock, Megaphone, ArrowRight, ChevronRight, Plus, CalendarPlus, ListTodo, X } from "lucide-react";
import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isWithinInterval, parseISO, eachDayOfInterval, startOfDay, endOfDay, max, min } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import EventPreviewModal from "@/components/dashboard/EventPreviewModal";
import KanbanBoardsWidget from "@/components/dashboard/KanbanBoardsWidget";
import type { Event } from "@/hooks/useEvents";

const Dashboard = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { canCreate, canEdit, canDelete } = useSubscriptionStatus();
  const canManage = role !== "viewer" && canCreate;
  const { events, ministries, users, getPublishedAnnouncements, eventTasks, getEventById, getUserById, getMinistryById } = useData();
  const today = new Date();
  const publishedAnnouncements = getPublishedAnnouncements().slice(0, 3);
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  // Close quick menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setIsQuickMenuOpen(false);
      }
    };

    if (isQuickMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isQuickMenuOpen]);

  const quickActions = [
    {
      label: "Novo Evento",
      icon: CalendarPlus,
      onClick: () => navigate("/evento/novo"),
      color: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Novo Aviso",
      icon: Megaphone,
      onClick: () => navigate("/mural/novo"),
      color: "bg-amber-500 hover:bg-amber-600",
    },
  ];
  
  // Events this month
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const eventsThisMonth = events.filter(event => {
    const eventDate = parseISO(event.date);
   const eventEndDate = event.endDate ? parseISO(event.endDate) : eventDate;
   // Event is in this month if it overlaps with the month interval
   return eventEndDate >= monthStart && eventDate <= monthEnd;
  });

  // Upcoming events (next 7 days - include multi-day events on every day they occur)
  const rangeStart = startOfDay(today);
  const rangeEnd = endOfDay(addDays(today, 14));

  const upcomingEventInstances = events
    .flatMap((event) => {
      const eventStart = startOfDay(parseISO(event.date));
      const eventEndRaw = startOfDay(parseISO(event.endDate ?? event.date));
      // Protection against invalid data where end_date < date
      const eventEnd = eventEndRaw >= eventStart ? eventEndRaw : eventStart;

      // If it doesn't overlap the 14-day window, ignore.
      if (eventEnd < rangeStart || eventStart > rangeEnd) return [];

      const instanceStart = max([eventStart, rangeStart]);
      const instanceEnd = min([eventEnd, startOfDay(rangeEnd)]);

      return eachDayOfInterval({ start: instanceStart, end: instanceEnd }).map((d) => ({
        event,
        instanceDate: d,
      }));
    })
    .sort((a, b) => a.instanceDate.getTime() - b.instanceDate.getTime());

  const upcomingEventsCount = new Set(upcomingEventInstances.map((i) => i.event.id)).size;

  // Upcoming tasks grouped by event (next 14 days)
  const upcomingTasksRaw = eventTasks
    .filter((task) => {
      if (task.isArchived || task.status === "done") return false;
      
      // Se tem dueDate, verificar se está no range
      if (task.dueDate) {
        const dueDate = parseISO(task.dueDate);
        return isWithinInterval(dueDate, { start: rangeStart, end: rangeEnd });
      }
      
      // Se não tem dueDate, usar a data do evento como referência
      const event = getEventById(task.eventId);
      if (!event) return false;
      const eventDate = parseISO(event.date);
      return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
    });

  // Agrupar tarefas por evento
  const upcomingTasksByEvent = upcomingTasksRaw.reduce((acc, task) => {
    const eventId = task.eventId;
    if (!acc[eventId]) {
      acc[eventId] = [];
    }
    acc[eventId].push(task);
    return acc;
  }, {} as Record<string, typeof eventTasks>);

  // Transformar em lista ordenada por data do evento
  const upcomingEventGroups = Object.entries(upcomingTasksByEvent)
    .map(([eventId, tasks]) => {
      const event = getEventById(eventId);
      const eventDate = event ? parseISO(event.date) : new Date();
      const ministry = event?.ministryId ? getMinistryById(event.ministryId) : null;
      return {
        eventId,
        event,
        eventDate,
        ministry,
        tasks,
        todoCount: tasks.filter(t => t.status === "todo").length,
        inProgressCount: tasks.filter(t => t.status === "in_progress").length,
      };
    })
    .filter(group => group.event !== undefined)
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    .slice(0, 6);

  // Ministry activity (events per ministry this month)
  const ministryActivity = ministries.map(ministry => {
    const count = eventsThisMonth.filter(e => e.ministryId === ministry.id).length;
    return {
      id: ministry.id,
      name: ministry.name,
      count,
      color: ministry.color,
    };
  }).filter(m => m.count > 0).sort((a, b) => b.count - a.count);

  // Get active ministries for the bar chart
  const activeMinistries = ministries.filter(m => 
    eventsThisMonth.some(e => e.ministryId === m.id)
  );

  // Events per day of week (stacked by ministry)
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const eventsByDayOfWeek = daysOfWeek.map((day, dayIndex) => {
    const dayData: Record<string, any> = { day };
    
    activeMinistries.forEach(ministry => {
      dayData[ministry.name] = eventsThisMonth.filter(event => {
        const eventDate = parseISO(event.date);
        return eventDate.getDay() === dayIndex && event.ministryId === ministry.id;
      }).length;
    });
    
    return dayData;
  });

  const getMinistryColor = (ministryId: string) => {
    const ministry = ministries.find(m => m.id === ministryId);
    return ministry?.color || "louvor";
  };

  const getMinistryName = (ministryId: string) => {
    const ministry = ministries.find(m => m.id === ministryId);
    if (!ministry) return "Sem ministério";
    return ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name;
  };

  const chartConfig = {
    count: {
      label: "Eventos",
      color: "hsl(var(--primary))",
    },
  };

  // Chart config for stacked bar chart
  const barChartConfig = activeMinistries.reduce((acc, ministry) => {
    acc[ministry.name] = {
      label: ministry.name,
      color: ministry.color,
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  return (
    <div className="space-y-6 px-4 lg:px-6 py-4">
      {/* Header with Quick Add Button */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base break-words">
            Visão geral da agenda em {format(today, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        
        {/* Quick Add Button with Menu - Always visible */}
        <div ref={quickMenuRef} className="relative flex-shrink-0 z-50 justify-self-end">
          <Button
            className={cn(
              "h-10 px-4 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
              isQuickMenuOpen
                ? "bg-muted hover:bg-muted/80 text-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
              !canManage && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => canManage && setIsQuickMenuOpen(!isQuickMenuOpen)}
            disabled={!canManage}
          >
            {isQuickMenuOpen ? (
              <X className="h-5 w-5 flex-shrink-0" />
            ) : (
              <Plus className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="font-semibold text-sm">Criar</span>
          </Button>
          
          {/* Quick Menu Dropdown */}
          <div
            className={cn(
              "absolute right-0 top-full mt-3 flex flex-col items-end gap-2 transition-all duration-300 z-50 pointer-events-auto",
              isQuickMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            )}
          >
            {quickActions.map((action, index) => (
              <Button
                key={action.label}
                className={cn(
                  "h-12 px-6 rounded-full shadow-lg text-white font-medium text-base gap-3 transition-all duration-200",
                  action.color
                )}
                style={{
                  transitionDelay: isQuickMenuOpen ? `${index * 50}ms` : "0ms",
                }}
                onClick={() => {
                  action.onClick();
                  setIsQuickMenuOpen(false);
                }}
              >
                <action.icon className="h-5 w-5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats & Quick Access Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/agenda")}
        >
          <CardContent className="p-3 flex items-center gap-2.5 h-full">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">Eventos do Mês</p>
              <p className="text-lg sm:text-xl font-bold text-primary">{eventsThisMonth.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/proximos-eventos")}
        >
          <CardContent className="p-3 flex items-center gap-2.5 h-full">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">Próximos 14 Dias</p>
              <p className="text-lg sm:text-xl font-bold text-orange-500">{upcomingEventsCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/ministerios")}
        >
          <CardContent className="p-3 flex items-center gap-2.5 h-full">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Church className="h-5 w-5 text-green-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">Ministérios Ativos</p>
              <p className="text-lg sm:text-xl font-bold text-green-500">{ministries.filter(m => m.isActive).length}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/membros")}
        >
          <CardContent className="p-3 flex items-center gap-2.5 h-full">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">Membros</p>
              <p className="text-lg sm:text-xl font-bold text-purple-500">{users.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/meus-quadros")}
        >
          <CardContent className="p-3 flex items-center gap-2.5 h-full">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center flex-shrink-0">
              <ListTodo className="h-5 w-5 text-sky-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">Tarefas</p>
              <p className="text-base sm:text-lg font-bold text-sky-500">Gerenciar</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/mural")}
        >
          <CardContent className="p-3 flex items-center gap-2.5 h-full">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Megaphone className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">Mural de Avisos</p>
              <p className="text-base sm:text-lg font-bold text-amber-500">Avisos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos 14 dias - Eventos e Tarefas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Próximos 14 dias</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEventInstances.length > 0 ? (
              <div className="space-y-3">
                {upcomingEventInstances.map(({ event, instanceDate }) => {
                  const ministry = ministries.find(m => m.id === event.ministryId);
                  const ministryColor = ministry?.color || "hsl(var(--primary))";
                  return (
                    <div 
                      key={`${event.id}-${format(instanceDate, "yyyy-MM-dd")}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors border-l-3"
                      style={{ borderLeftColor: ministryColor, borderLeftWidth: '3px' }}
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <div 
                        className="flex flex-col items-center justify-center w-10 h-10 rounded-md"
                        style={{ backgroundColor: `${ministryColor}15` }}
                      >
                        <span 
                          className="text-sm font-bold leading-none"
                          style={{ color: ministryColor }}
                        >
                          {format(instanceDate, "dd")}
                        </span>
                        <span 
                          className="text-[10px] uppercase leading-none mt-0.5"
                          style={{ color: ministryColor, opacity: 0.8 }}
                        >
                          {format(instanceDate, "MMM", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate">{event.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {event.startTime} - {event.endTime}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum evento nos próximos 14 dias
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Tarefas
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/meus-quadros")}>
              Ver todas
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEventGroups.length > 0 ? (
              <div className="space-y-3">
                {upcomingEventGroups.map((group) => {
                  const isOverdue = group.eventDate < today;
                  const totalTasks = group.todoCount + group.inProgressCount;

                  return (
                    <div 
                      key={group.eventId}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors",
                        isOverdue && "ring-1 ring-destructive/40"
                      )}
                      onClick={() => navigate(`/evento/${group.eventId}/tarefas`)}
                    >
                      <div 
                        className={cn(
                          "flex flex-col items-center justify-center w-10 h-10 rounded-md",
                          isOverdue ? "bg-destructive/15" : "bg-sky-500/15"
                        )}
                      >
                        <span 
                          className={cn(
                            "text-sm font-bold leading-none",
                            isOverdue ? "text-destructive" : "text-sky-600"
                          )}
                        >
                          {format(group.eventDate, "dd")}
                        </span>
                        <span 
                          className={cn(
                            "text-[10px] uppercase leading-none mt-0.5",
                            isOverdue ? "text-destructive/80" : "text-sky-600/80"
                          )}
                        >
                          {format(group.eventDate, "MMM", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <h4 className="text-sm font-medium text-foreground truncate">{group.event?.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {totalTasks} {totalTasks === 1 ? "tarefa pendente" : "tarefas pendentes"}
                        </span>
                      </div>
                      <Badge
                        variant={group.inProgressCount > 0 ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0.5 flex-shrink-0"
                      >
                        {group.inProgressCount > 0 ? `${group.inProgressCount} em andamento` : `${group.todoCount} a fazer`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhuma tarefa nos próximos 14 dias</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate("/meus-quadros")}
                >
                  Ver quadros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Kanban Boards Quick Access */}
      <KanbanBoardsWidget />

      {/* Avisos Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Avisos Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/mural")}>
            Ver todos
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {publishedAnnouncements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedAnnouncements.map(announcement => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  compact
                  onClick={() => navigate(`/mural/editar/${announcement.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum aviso publicado</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => navigate("/mural/novo")}
              >
                Criar primeiro aviso
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Day of Week - Stacked by Ministry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eventos por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <ChartContainer config={barChartConfig} className="h-[250px] w-full overflow-hidden">
              <BarChart data={eventsByDayOfWeek} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent hideZeros />} />
                {activeMinistries.map((ministry, index) => (
                  <Bar 
                    key={ministry.id}
                    dataKey={ministry.name} 
                    stackId="ministries"
                    fill={ministry.color}
                    radius={index === activeMinistries.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Ministry Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ministérios Mais Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {ministryActivity.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 overflow-visible">
                <ChartContainer config={chartConfig} className="h-[200px] w-[200px] shrink-0">
                  <PieChart>
                    <Pie
                      data={ministryActivity}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {ministryActivity.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {ministryActivity.slice(0, 5).map((ministry) => (
                    <div key={ministry.name} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: ministry.color }}
                      />
                      <span className="text-sm">{ministry.name}</span>
                      <span className="text-sm font-medium">{ministry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum evento neste mês
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Preview Modal */}
      <EventPreviewModal
        event={selectedEvent}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
