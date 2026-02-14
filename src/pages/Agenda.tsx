import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CalendarView from "@/components/agenda/CalendarView";
import EventDetailsModal from "@/components/agenda/EventDetailsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const Agenda = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { canCreate } = useSubscriptionStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const canManageEvents = role !== "viewer" && canCreate;

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsModalOpen(true);
  };

  const handleEditEvent = () => {
    setIsModalOpen(false);
    if (selectedEventId) {
      navigate(`/evento/editar/${selectedEventId}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 lg:p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">Gerencie os eventos da igreja</p>
          </div>
        </div>
      {canManageEvents && (
        <Button onClick={() => navigate("/evento/novo")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      )}
      </header>

      {/* Conteúdo */}
      <div className="flex-1 p-4 lg:p-6 overflow-hidden">
        <CalendarView onEventClick={handleEventClick} />
      </div>

      {/* Botão Flutuante Mobile - apenas no desktop, mobile usa o MobileCalendarView */}

      {/* Modal de Detalhes */}
      <EventDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEdit={handleEditEvent}
        eventId={selectedEventId}
      />
    </div>
  );
};

export default Agenda;
