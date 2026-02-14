import { useNavigate } from "react-router-dom";
import { formatMinistryWithLeader } from "@/lib/ministryUtils";
import { ArrowLeft, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import { format, parseISO, addDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const EVENTS_PER_PAGE = 7;

const UpcomingEvents = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { events, getMinistryById } = useData();
  const [currentPage, setCurrentPage] = useState(0);
  const today = new Date();
  const weekEnd = addDays(today, 7);
  
  const canManageEvents = role !== "viewer";

  const upcomingEvents = events
    .filter(event => {
      const eventDate = parseISO(event.date);
      return isWithinInterval(eventDate, { start: today, end: weekEnd });
    })
    .sort((a, b) => {
      const dateCompare = parseISO(a.date).getTime() - parseISO(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

  const totalPages = Math.ceil(upcomingEvents.length / EVENTS_PER_PAGE);
  const paginatedEvents = upcomingEvents.slice(
    currentPage * EVENTS_PER_PAGE,
    (currentPage + 1) * EVENTS_PER_PAGE
  );

  const handleEventClick = (eventId: string) => {
    navigate(`/evento/editar/${eventId}`);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="bg-card border-b p-4 lg:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Próximos 7 Dias</h1>
            <p className="text-sm text-muted-foreground">
              {upcomingEvents.length} {upcomingEvents.length === 1 ? "evento" : "eventos"} programados
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Eventos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paginatedEvents.length > 0 ? (
              <div className="divide-y">
                {paginatedEvents.map(event => {
                  const ministry = getMinistryById(event.ministryId);
                  const ministryColor = ministry?.color || "hsl(var(--primary))";
                  const eventDate = parseISO(event.date);

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleEventClick(event.id)}
                    >
                      {/* Date with ministry color indicator */}
                      <div 
                        className="flex flex-col items-center justify-center w-14 h-14 rounded-lg border-l-4"
                        style={{ borderLeftColor: ministryColor, backgroundColor: `${ministryColor}10` }}
                      >
                        <span className="text-xl font-bold text-foreground">
                          {format(eventDate, "dd")}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase">
                          {format(eventDate, "MMM", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {event.isAllDay ? "Dia inteiro" : `${event.startTime} - ${event.endTime}`}
                        </p>
                      </div>

                      {/* Ministry badge */}
                      <Badge
                        variant="secondary"
                        className="hidden sm:inline-flex font-medium whitespace-nowrap"
                        style={{ 
                          backgroundColor: ministryColor,
                          color: '#FFFFFF',
                          boxShadow: `0 2px 8px ${ministryColor}50`
                        }}
                      >
                        {formatMinistryWithLeader(ministry)}
                      </Badge>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhum evento nos próximos 7 dias
                </p>
                {canManageEvents && (
                  <Button onClick={() => navigate("/evento/novo")}>
                    Criar Evento
                  </Button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anteriores
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1}
                  className="flex items-center gap-2"
                >
                  Próximos
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpcomingEvents;
