import { useNavigate } from "react-router-dom";
import { formatMinistryWithLeader } from "@/lib/ministryUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Users, FileText, Palette, Pencil, Trash2, MapPin, Repeat, Eye, EyeOff, ListTodo, Phone } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useEventPermissions } from "@/hooks/useEventPermissions";

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  eventId: string | null;
}

const EventDetailsModal = ({ isOpen, onClose, onEdit, eventId }: EventDetailsModalProps) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useSubscriptionStatus();
  const { getEventById, getMinistryById, getUserById, deleteEvent, deleteEventSeries, getTasksByEventId } = useData();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const event = eventId ? getEventById(eventId) : null;
  
  // Use new permission hook for involvement-based access
  const { canEditEvent, canDeleteEvent, canManageEventTasks, isAdmin } = useEventPermissions();
  
  // Combine subscription status with involvement permissions
  const userCanEdit = canEdit && canEditEvent(event);
  const userCanDelete = canDelete && canDeleteEvent(event);
  const userCanManageTasks = canManageEventTasks(event);
  const tasksCount = eventId ? getTasksByEventId(eventId).length : 0;
  const ministry = event ? getMinistryById(event.ministryId) : null;
  
  // Suporte a múltiplos responsáveis
  const responsibleUsers = event?.responsibleIds?.length 
    ? event.responsibleIds.map(id => getUserById(id)).filter(Boolean)
    : event?.responsibleId 
      ? [getUserById(event.responsibleId)].filter(Boolean)
      : [];
  
  // Membros adicionais cadastrados manualmente
  const eventMembers = event?.members || [];

  if (!event) {
    return null;
  }

  const isRecurringEvent = event.recurrence?.type !== "none" && event.recurrence?.type !== undefined;
  const isPartOfSeries = !!event.parentEventId;
  const hasSeriesActions = isRecurringEvent || isPartOfSeries;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getRecurrenceLabel = () => {
    if (!event.recurrence) return null;
    const interval = event.recurrence.interval;
    switch (event.recurrence.type) {
      case "daily":
        return interval === 1 ? "Repete todo dia" : `Repete a cada ${interval} dias`;
      case "weekly":
        return interval === 1 ? "Repete toda semana" : `Repete a cada ${interval} semanas`;
      case "monthly":
        return interval === 1 ? "Repete todo mês" : `Repete a cada ${interval} meses`;
      case "yearly":
        return interval === 1 ? "Repete todo ano" : `Repete a cada ${interval} anos`;
      default:
        return null;
    }
  };

  const handleDeleteSingle = async () => {
    if (!userCanDelete) {
      toast({
        title: "Ação bloqueada",
        description: "Você não tem permissão para excluir este evento.",
        variant: "destructive",
      });
      return;
    }

    await deleteEvent(event.id);
    toast({
      title: "Evento excluído",
      description: `"${event.title}" foi removido com sucesso.`,
    });
    setShowDeleteDialog(false);
    onClose();
  };

  const handleDeleteSeries = async () => {
    if (!userCanDelete) {
      toast({
        title: "Ação bloqueada",
        description: "Você não tem permissão para excluir esta série.",
        variant: "destructive",
      });
      return;
    }

    const parentId = event.parentEventId || event.id;
    await deleteEventSeries(parentId);
    toast({
      title: "Série excluída",
      description: `Todos os eventos de "${event.title}" foram removidos.`,
    });
    setShowDeleteDialog(false);
    onClose();
  };

  const handleDelete = () => {
    if (hasSeriesActions) {
      setShowDeleteDialog(true);
    } else {
      handleDeleteSingle();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden">
          <div className="overflow-y-auto max-h-[85vh] p-6 pt-10">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                {(isRecurringEvent || isPartOfSeries) && (
                  <Repeat className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Data */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(event.date)}
                    {event.endDate && event.endDate !== event.date && (
                      <> - {formatDate(event.endDate)}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Horário */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {event.isAllDay ? "Dia inteiro" : `${event.startTime} - ${event.endTime}`}
                  </p>
                </div>
              </div>

              {/* Local */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              {/* Recorrência */}
              {(isRecurringEvent || isPartOfSeries) && (
                <div className="flex items-start gap-3">
                  <Repeat className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isPartOfSeries ? "Parte de uma série recorrente" : getRecurrenceLabel()}
                    </p>
                  </div>
                </div>
              )}

              {/* Visibilidade */}
              <div className="flex items-start gap-3">
                {event.visibility === "private" ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground mt-0.5" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {event.visibility === "private" ? "Evento privado" : "Evento público"}
                  </p>
                </div>
              </div>

              {/* Ministério Responsável */}
              <div className="flex items-start gap-3">
                <Palette className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ministério Responsável</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ministry?.color || '#6b7280' }}
                    />
                    <p className="text-sm font-medium text-foreground">
                      {formatMinistryWithLeader(ministry)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsáveis */}
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {responsibleUsers.length > 1 ? "Responsáveis" : "Responsável"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {responsibleUsers.map((user: any) => (
                      <div key={user.id} className="flex items-center gap-2 bg-muted/50 rounded-full pl-1 pr-3 py-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{user.name}</span>
                      </div>
                    ))}
                    {responsibleUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhum responsável</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Membros Adicionais */}
              {eventMembers.length > 0 && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Membros da Organização</p>
                    <div className="space-y-2">
                      {eventMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                              {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{member.name}</span>
                            {member.phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              {event.observations && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-foreground">{event.observations}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col gap-3 pt-4 border-t">
              <Button 
                className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                onClick={() => {
                  onClose();
                  navigate(`/evento/${event.id}/tarefas`);
                }}
              >
                <ListTodo className="w-5 h-5 mr-2" />
                Gerenciar Tarefas {tasksCount > 0 && `(${tasksCount})`}
              </Button>
              {(userCanEdit || userCanDelete) && (
                <div className="flex gap-3 mb-2">
                  {userCanDelete && (
                    <Button variant="destructive" className="flex-1 h-11 shadow-sm" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                  {userCanEdit && (
                    <Button variant="secondary" className="flex-1 h-11 font-medium border border-border shadow-sm" onClick={onEdit}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para exclusão de série */}
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
    </>
  );
};

export default EventDetailsModal;