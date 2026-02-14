import { useNavigate } from "react-router-dom";
import { formatMinistryWithLeader } from "@/lib/ministryUtils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MapPin, User, ListTodo } from "lucide-react";
import type { Event } from "@/hooks/useEvents";
import { useData } from "@/contexts/DataContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EventPreviewModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

const EventPreviewModal = ({ event, isOpen, onClose }: EventPreviewModalProps) => {
  const navigate = useNavigate();
  const { getMinistryById, getUserById } = useData();

  if (!event) return null;

  const ministry = getMinistryById(event.ministryId);
  const responsible = getUserById(event.responsibleId);
  const eventDate = parseISO(event.date);

  const handleGoToTasks = () => {
    onClose();
    navigate(`/evento/${event.id}/tarefas`);
  };

  const handleEditEvent = () => {
    onClose();
    navigate(`/evento/editar/${event.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh]">
          {/* Ministry Color Header */}
          <div 
            className="h-3 w-full"
            style={{ backgroundColor: ministry?.color || "hsl(var(--primary))" }}
          />

          <div className="p-6 space-y-4">
            <DialogHeader className="p-0">
              <div className="flex items-start justify-between gap-3">
                <DialogTitle className="text-xl font-semibold text-left">
                  {event.title}
                </DialogTitle>
                {ministry && (
                  <Badge 
                    variant="secondary"
                    className="font-medium"
                    style={{ 
                      backgroundColor: ministry.color,
                      color: '#FFFFFF',
                      boxShadow: `0 2px 8px ${ministry.color}50`
                    }}
                  >
                    {formatMinistryWithLeader(ministry)}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {/* Event Details */}
            <div className="space-y-3">
              {/* Date and Time */}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {event.isAllDay ? "Dia inteiro" : `${event.startTime} - ${event.endTime}`}
                </span>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}

              {/* Responsible */}
              {responsible && (
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{responsible.name}</span>
                </div>
              )}

              {/* Observations */}
              {event.observations && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{event.observations}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1 gap-2" 
                onClick={handleGoToTasks}
              >
                <ListTodo className="w-4 h-4" />
                Gerenciar Tarefas
              </Button>
              <Button 
                variant="outline" 
                onClick={handleEditEvent}
              >
                Editar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventPreviewModal;
