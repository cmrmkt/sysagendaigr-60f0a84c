import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Repeat, MapPin, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, CalendarIcon, Clock, Loader2, MessageCircle, Settings, FileText, CalendarPlus, Bell, MousePointerClick } from "lucide-react";
import whatsappIcon from "@/assets/whatsapp-logo.svg";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";

import type { RecurrenceConfig } from "@/hooks/useEvents";
import { cn } from "@/lib/utils";
import { useEventTemplates } from "@/hooks/useEventTemplates";
import { MinistrySelectWithCreate } from "@/components/shared/MinistrySelectWithCreate";
import { MinistryMultiSelectWithCreate } from "@/components/shared/MinistryMultiSelectWithCreate";
import { useEventPermissions } from "@/hooks/useEventPermissions";
import { EventMessageTemplateModal, type EventMessageTemplate } from "@/components/reminders/EventMessageTemplateModal";
import { useReminderSettings, DEFAULT_REMINDER_TEMPLATES, DEFAULT_MESSAGE_TEMPLATES, type TemplateWithRepeat } from "@/hooks/useReminderSettings";

// Número máximo de templates mostrados inicialmente
const INITIAL_TEMPLATES_SHOWN = 4;

const EventForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  const { ministries, users, events, addEvent, updateEvent, getEventById, getMinistryById, deleteEvent, deleteEventSeries } = useData();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSeriesUpdateDialog, setShowSeriesUpdateDialog] = useState(false);
  const [showReminderConfirmDialog, setShowReminderConfirmDialog] = useState(false);
  const [showMessageTemplateModal, setShowMessageTemplateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const { activeTemplates, isLoading: templatesLoading } = useEventTemplates();
  const { profile } = useAuth();
  const { settings: reminderSettings } = useReminderSettings();
  
  const getScheduleDescription = (key: string, data: TemplateWithRepeat) => {
    // Check for per-event schedule overrides first
    const customOverride = customReminderTemplates[key];
    
    if (key === "after_creation") {
      // Check if disabled via custom override
      if (customOverride?.enabled === false) return "Desativado";
      const delay = customOverride?.delay || data.delay;
      const refDate = customOverride?.reference_date;
      if (delay) {
        const unitLabel = delay.unit === "minutes" ? "minutos" : delay.unit === "hours" ? "horas" : "dias";
        const dateLabel = refDate
          ? new Date(refDate + "T00:00:00").toLocaleDateString("pt-BR")
          : "data de criação";
        return `${delay.value} ${unitLabel} após ${dateLabel}`;
      }
    }
    if (key === "before_due") {
      if (customOverride?.enabled === false) return "Desativado";
      const repeat = customOverride?.repeat || data.repeat;
      if (repeat?.type !== "none") {
        const typeLabel = repeat.type === "days" ? "dia(s)" : repeat.type === "hours" ? "hora(s)" : repeat.type === "minutes" ? "minuto(s)" : repeat.type === "weeks" ? "semana(s)" : repeat.type === "months" ? "mês(es)" : repeat.type;
        let countLabel = "";
        if (repeat.duration === "count" && repeat.count) {
          countLabel = ` · ${repeat.count} envio(s)`;
        } else if (repeat.duration === "until" && repeat.until) {
          countLabel = ` · até ${new Date(repeat.until).toLocaleDateString("pt-BR")}`;
        } else {
          countLabel = " · envio contínuo";
        }
        return `A cada ${repeat.interval} ${typeLabel}${countLabel}`;
      }
    }
    if (key === "on_due") {
      if (customOverride?.enabled === false) return "Desativado";
      return "No dia do vencimento · 1 envio";
    }
    return "";
  };

  const handleCardClick = (key: string) => {
    setEditingTemplateType(key);
    setShowMessageTemplateModal(true);
  };

  const getTemplateForType = (key: string): EventMessageTemplate => {
    if (customReminderTemplates[key]) return customReminderTemplates[key];
    const msgTemplates = reminderSettings?.message_templates || DEFAULT_MESSAGE_TEMPLATES;
    const tmpl = msgTemplates[key as keyof typeof msgTemplates];
    const base: EventMessageTemplate = tmpl
      ? { title: tmpl.title, body: tmpl.body }
      : { title: "⏰ Lembrete", body: "[titulo]" };
    // Default reference_date for after_creation: use event creation date (today for new, or stored value)
    if (key === "after_creation" && !base.reference_date) {
      base.reference_date = currentEvent?.id
        ? (currentEvent as any)?.created_at?.slice(0, 10) || format(new Date(), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");
    }
    return base;
  };

  const GlobalTemplatePreview = () => {
    const templates = reminderSettings?.reminder_templates || DEFAULT_REMINDER_TEMPLATES;
    const items = [
      { key: "after_creation", icon: CalendarPlus, label: "Após a Data", data: templates.after_creation },
      { key: "before_due", icon: Bell, label: "Antes da Data", data: templates.before_due },
      { key: "on_due", icon: FileText, label: "No Dia", data: templates.on_due },
    ];
    return (
      <div className="mt-3 bg-muted/30 p-4 rounded-lg border border-dashed space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Lembretes configurados:</p>
        <p className="text-[11px] text-muted-foreground">Clique em um card para personalizar a mensagem neste evento.</p>
        <div className="grid gap-2">
          {items.map(({ key, icon: Icon, label, data }) => {
            const isEdited = !!customReminderTemplates[key];
            const customOverride = customReminderTemplates[key];
            // Check if disabled via per-event override
            const isDisabledByOverride = customOverride?.enabled === false;
            const isActive = data.enabled && !isDisabledByOverride;
            return (
              <button
                type="button"
                key={key}
                onClick={() => handleCardClick(key)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all cursor-pointer",
                  isActive
                    ? "bg-primary/5 border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                    : "bg-muted/5 border-border/50 opacity-60 hover:opacity-80"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                  isActive ? "bg-primary/15" : "bg-muted/30"
                )}>
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground/60")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", isActive ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                    {isEdited && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/50 px-1.5 py-0.5 rounded-full leading-none">Editado</span>
                    )}
                    {isActive && !isEdited ? (
                      <span className="text-[11px] font-semibold text-primary-foreground bg-primary px-2 py-0.5 rounded-full leading-none">Ativo</span>
                    ) : !isActive ? (
                      <span className="text-xs text-muted-foreground italic">Desativado</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-primary/80 font-medium mt-0.5">
                    {getScheduleDescription(key, data)}
                  </p>
                </div>
                <Settings className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  
  
  // Permission check for editing
  const { canEditEvent, isAdmin } = useEventPermissions();

  // Template selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  
  // Campos existentes
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [ministryId, setMinistryId] = useState<"none" | string>("none");
  const [observations, setObservations] = useState("");
  const [customReminderTemplates, setCustomReminderTemplates] = useState<Record<string, EventMessageTemplate>>({});
  const [editingTemplateType, setEditingTemplateType] = useState<string | null>(null);
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [customMessageTemplate, setCustomMessageTemplate] = useState<EventMessageTemplate | null>(null);

  // Novos campos
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceConfig["type"]>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndType, setRecurrenceEndType] = useState<"never" | "after" | "on">("never");
  const [recurrenceEndAfter, setRecurrenceEndAfter] = useState(12);
  const [recurrenceEndOn, setRecurrenceEndOn] = useState("");
  
  // Ministérios colaboradores
  const [collaboratorMinistryIds, setCollaboratorMinistryIds] = useState<string[]>([]);

  const dateParam = searchParams.get("date") || "";
  const timeParam = searchParams.get("time") || "";

  // Pré-preencher com query params (para criação via slot click)
  useEffect(() => {
    if (!isEditing) {
      if (dateParam) {
        setDate(dateParam);
      }
      if (timeParam) {
        setStartTime(timeParam);
        // Calcular hora fim (1h depois)
        const [hours] = timeParam.split(":").map(Number);
        const endHour = Math.min(hours + 1, 23);
        setEndTime(`${String(endHour).padStart(2, "0")}:00`);
      }
    }
  }, [isEditing, dateParam, timeParam]);

  // Carregar dados do evento se estiver editando
  useEffect(() => {
    if (isEditing && id) {
      const event = getEventById(id);
      if (event) {
        // Check permission before allowing edit
        if (!canEditEvent(event)) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para editar este evento.",
            variant: "destructive",
          });
          navigate("/agenda");
          return;
        }
        
        setTitle(event.title);
        setDate(event.date);
        setStartTime(event.startTime);
        setEndTime(event.endTime);
        setMinistryId(event.ministryId || "none");
        setObservations(event.observations);
        setCollaboratorMinistryIds(event.collaboratorMinistryIds || []);
        
        // Restore custom message template
        if (event.customMessageTemplate) {
          setUseCustomTemplate(true);
          setCustomMessageTemplate(event.customMessageTemplate);
        }
        
        // Restore custom reminder templates (per-type overrides)
        if (event.customReminderTemplates) {
          setCustomReminderTemplates(event.customReminderTemplates);
        }


        // Novos campos
        setEndDate(event.endDate || "");
        setLocation(event.location || "");
        setIsAllDay(event.isAllDay || false);
        setVisibility(event.visibility || "public");

        if (event.recurrence) {
          setRecurrenceType(event.recurrence.type);
          setRecurrenceInterval(event.recurrence.interval);
          setRecurrenceEndType(event.recurrence.endType);
          setRecurrenceEndAfter(event.recurrence.endAfterOccurrences || 12);
          setRecurrenceEndOn(event.recurrence.endOnDate || "");
        }
      } else if (events.length > 0) {
        // Events loaded but this event doesn't exist - redirect
        toast({
          title: "Evento não encontrado",
          description: "O evento que você tentou editar não existe ou foi excluído.",
          variant: "destructive",
        });
        navigate("/agenda");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, id, events]);

  // Check if event is part of a recurring series
  const currentEvent = isEditing && id ? getEventById(id) : null;
  
  // Verifica se é filho de uma série (tem parentEventId)
  const isChildEvent = !!currentEvent?.parentEventId;
  
  // Verifica se é pai de uma série (tem filhos reais no banco)
  const hasChildEvents = events.some(e => e.parentEventId === id);
  
  // Só considera parte de série se realmente há eventos relacionados
  const isPartOfSeries = isChildEvent || hasChildEvents;

  const buildEventData = () => {
    const recurrence: RecurrenceConfig | undefined = recurrenceType !== "none" ? {
      type: recurrenceType,
      interval: recurrenceType === "weekday" ? 1 : recurrenceInterval,
      endType: recurrenceEndType,
      endAfterOccurrences: recurrenceEndType === "after" ? recurrenceEndAfter : undefined,
      endOnDate: recurrenceEndType === "on" ? recurrenceEndOn : undefined,
      weekday: recurrenceType === "weekday" && date ? new Date(date + "T00:00:00").getDay() : undefined,
    } : undefined;
    
    return {
      title,
      date,
      startTime: isAllDay ? "00:00" : startTime,
      endTime: isAllDay ? "23:59" : endTime,
      ministryId,
      collaboratorMinistryIds: collaboratorMinistryIds.length > 0 ? collaboratorMinistryIds : undefined,
      observations,
      endDate: endDate || undefined,
      location: location || undefined,
      isAllDay,
      visibility,
      recurrence,
      reminder: "whatsapp",
      customMessageTemplate: useCustomTemplate && customMessageTemplate ? customMessageTemplate : undefined,
      customReminderTemplates: Object.keys(customReminderTemplates).length > 0 ? customReminderTemplates : undefined,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (ministryId === "none") {
      toast({
        title: "Ministério obrigatório",
        description: "Selecione um ministério para salvar o evento.",
        variant: "destructive",
      });
      return;
    }
    
    const eventData = buildEventData();

    // If editing a recurring event, show dialog to ask user
    if (isEditing && id && isPartOfSeries) {
      setShowSeriesUpdateDialog(true);
      return;
    }

    // Normal save flow
    if (isEditing && id) {
      setIsSaving(true);
      // If recurrence is being added/changed on a non-series event, regenerate
      updateEvent(id, eventData, eventData.recurrence?.type !== "none")
        .then(() => {
          toast({
            title: "Evento atualizado",
            description: `"${title}" foi atualizado com sucesso.`,
          });
          navigate("/agenda");
        })
        .finally(() => setIsSaving(false));
    } else {
      setIsSaving(true);
      addEvent(eventData)
        .then(() => {
          toast({
            title: "Evento criado",
            description: `"${title}" foi adicionado à agenda.`,
          });
          navigate("/agenda");
        })
        .finally(() => setIsSaving(false));
    }
  };

  const handleUpdateSingleEvent = async () => {
    if (!id) return;
    setIsSaving(true);
    const eventData = buildEventData();
    // Remove recurrence from single event update (don't regenerate series)
    try {
      await updateEvent(id, { ...eventData, recurrence: undefined }, false);
      toast({
        title: "Evento atualizado",
        description: `"${title}" foi atualizado com sucesso.`,
      });
      navigate("/agenda");
    } finally {
      setIsSaving(false);
      setShowSeriesUpdateDialog(false);
    }
  };

  const handleUpdateEntireSeries = async () => {
    if (!id) return;
    setIsSaving(true);
    const eventData = buildEventData();
    const parentId = currentEvent?.parentEventId || id;
    
    try {
      // Update the parent event and regenerate all child events
      await updateEvent(parentId, eventData, true);
      toast({
        title: "Série atualizada",
        description: "Todos os eventos da série foram atualizados.",
      });
      navigate("/agenda");
    } finally {
      setIsSaving(false);
      setShowSeriesUpdateDialog(false);
    }
  };


  // Nomes dos dias da semana para opção dinâmica de recorrência
  const weekdayNames = [
    "Todo domingo",
    "Toda segunda-feira",
    "Toda terça-feira",
    "Toda quarta-feira",
    "Toda quinta-feira",
    "Toda sexta-feira",
    "Todo sábado",
  ];

  // Calcula o dia da semana da data selecionada (0-6)
  const selectedWeekday = date ? new Date(date + "T00:00:00").getDay() : null;

  const getRecurrenceLabel = (type: RecurrenceConfig["type"]) => {
    switch (type) {
      case "none": return "Não repetir";
      case "daily": return "Todo dia";
      case "weekly": return "Toda semana";
      case "monthly": return "Todo mês";
      case "yearly": return "Todo ano";
      case "weekday": return selectedWeekday !== null ? weekdayNames[selectedWeekday] : "Dia da semana";
    }
  };

  // Check if event date is in the future (for instant reminder button)
  const isEventInFuture = date ? new Date(date + "T23:59:59") >= new Date() : false;

  // Handle instant reminder - show confirmation dialog
  const handleSendInstantReminder = () => {
    setShowReminderConfirmDialog(true);
  };

  // Handle instant reminder confirmation
  const handleSendInstantReminderConfirm = async () => {
    if (!id || !profile?.organization_id) return;

    setIsSendingReminder(true);
    try {
      // When using custom mode, pass the event-specific custom template
      // When using standard mode, always send the default instant_reminder template
      // to ensure what the user sees matches what is sent
      const templateToSend = useCustomTemplate && customMessageTemplate
        ? customMessageTemplate
        : (reminderSettings?.message_templates?.instant_reminder || DEFAULT_MESSAGE_TEMPLATES.instant_reminder);

      const { data, error } = await supabase.functions.invoke("send-instant-reminder", {
        body: {
          event_id: id,
          organization_id: profile.organization_id,
          custom_template: templateToSend,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const sentCount = data?.sent || 0;
      const recipientCount = data?.recipients || 0;

      if (sentCount > 0) {
        toast({
          title: "Lembrete enviado",
          description: `Lembrete enviado para ${sentCount} participante(s).`,
        });
      } else if (recipientCount > 0) {
        toast({
          title: "Nenhuma notificação ativa",
          description: `${recipientCount} participante(s) encontrado(s), mas nenhum com notificações push ativas.`,
          variant: "destructive",
        });
      } else {
        throw new Error("Nenhum participante encontrado para este evento.");
      }

      setShowReminderConfirmDialog(false);
    } catch (err) {
      console.error("Error sending reminder:", err);
      toast({
        title: "Erro ao enviar lembrete",
        description: (err as Error)?.message || "Ocorreu um erro ao enviar o lembrete.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="bg-card border-b p-4 lg:p-6">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {isEditing ? "Editar Evento" : "Novo Evento"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing ? "Altere as informações do evento" : "Preencha os dados do evento"}
            </p>
          </div>
        </div>
      </header>

      {/* Formulário */}
      <div className="p-4 lg:p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Informações do Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título do Evento com Templates Integrados */}
              {/* Título do Evento + Templates - agrupados visualmente */}
              <div className="space-y-1">
                <Label htmlFor="title">Título do Evento</Label>
                
                {/* Container unificado para input e templates */}
                <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
                  <Input
                    id="title"
                    placeholder="Ex: Culto de Domingo"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (selectedTemplateId) setSelectedTemplateId(null);
                    }}
                    required
                    className="bg-background shadow-sm"
                  />
                  
                  {/* Templates disponíveis - parte da mesma seção */}
                  {!isEditing && activeTemplates.length > 0 && (
                    <div className="space-y-1.5 border-t pt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        Ou escolha um evento padrão:
                        <span className="bg-background px-1.5 py-0.5 rounded text-[10px] font-medium">
                          {activeTemplates.length} disponível(is)
                        </span>
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                      {(showAllTemplates ? activeTemplates : activeTemplates.slice(0, INITIAL_TEMPLATES_SHOWN)).map((template) => {
                        const ministry = template.ministry_id
                          ? getMinistryById(template.ministry_id)
                          : null;
                        const isSelected = selectedTemplateId === template.id;
                        
                        return (
                          <div
                            key={template.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedTemplateId(template.id);
                              setTitle(template.title);
                              setMinistryId(template.ministry_id || "none");
                              setStartTime(template.default_start_time?.slice(0, 5) || "09:00");
                              setEndTime(template.default_end_time?.slice(0, 5) || "10:00");
                              setLocation(template.default_location || "");
                              setIsAllDay(template.is_all_day);
                              setVisibility(template.visibility as "public" | "private");
                              setObservations(template.observations || "");
                              // Carregar ministérios colaboradores do template
                              setCollaboratorMinistryIds(template.collaborator_ministry_ids || []);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedTemplateId(template.id);
                                setTitle(template.title);
                                setMinistryId(template.ministry_id || "none");
                                setStartTime(template.default_start_time?.slice(0, 5) || "09:00");
                                setEndTime(template.default_end_time?.slice(0, 5) || "10:00");
                                setLocation(template.default_location || "");
                                setIsAllDay(template.is_all_day);
                                setVisibility(template.visibility as "public" | "private");
                                setObservations(template.observations || "");
                                // Carregar ministérios colaboradores do template
                                setCollaboratorMinistryIds(template.collaborator_ministry_ids || []);
                              }
                            }}
                            className={cn(
                              "p-2 rounded-md border cursor-pointer transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring text-center",
                              isSelected
                                ? "ring-2 ring-primary border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-center justify-center gap-1 min-h-6">
                              {ministry && (
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: ministry.color }}
                                />
                              )}
                              <span className="font-medium text-xs line-clamp-2">{template.title}</span>
                            </div>
                            {!template.is_all_day && template.default_start_time && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {template.default_start_time.slice(0, 5)}
                              </div>
                            )}
                            {template.is_all_day && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Dia inteiro
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                      
                      {/* Botão "Ver mais" quando há mais de 4 templates */}
                      {activeTemplates.length > INITIAL_TEMPLATES_SHOWN && (
                        <button
                          type="button"
                          onClick={() => setShowAllTemplates(!showAllTemplates)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showAllTemplates ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              Ver menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Ver mais ({activeTemplates.length - INITIAL_TEMPLATES_SHOWN})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Indicador de template selecionado */}
              {selectedTemplateId && (
                <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md border border-primary/20">
                  <span className="text-xs text-muted-foreground">
                    Campos preenchidos automaticamente
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplateId(null)}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </Button>
                </div>
              )}

              {/* Ministério Responsável */}
              <div className="space-y-2">
                <Label htmlFor="ministryId">Ministério Responsável</Label>
                <MinistrySelectWithCreate
                  value={ministryId}
                  onValueChange={(val) => setMinistryId(val as any)}
                  showNone
                  noneLabel="Selecione..."
                />
              </div>

              {/* Visibilidade */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {visibility === "public" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Visibilidade
                </Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === "public"}
                      onChange={() => setVisibility("public")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Público</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === "private"}
                      onChange={() => setVisibility("private")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Privado</span>
                  </label>
                </div>
              </div>

              {/* Dia Inteiro */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAllDay"
                  checked={isAllDay}
                  onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
                />
                <Label htmlFor="isAllDay" className="text-sm font-normal cursor-pointer">
                  Dia inteiro
                </Label>
              </div>

              {/* Linha 1: Data Início + Hora Início */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(new Date(date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date ? new Date(date + "T00:00:00") : undefined}
                        onSelect={(selectedDate) => {
                          if (selectedDate) {
                            const formatted = format(selectedDate, "yyyy-MM-dd");
                            setDate(formatted);
                            // Sempre sincroniza data fim com data início
                            setEndDate(formatted);
                          }
                          setIsStartDatePickerOpen(false);
                        }}
                        locale={ptBR}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {!isAllDay && (
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Hora Início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="bg-muted/50 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Linha 2: Data Fim + Hora Fim */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(new Date(endDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "Selecione..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate + "T00:00:00") : undefined}
                        onSelect={(selectedDate) => {
                          if (selectedDate) {
                            setEndDate(format(selectedDate, "yyyy-MM-dd"));
                          }
                          setIsEndDatePickerOpen(false);
                        }}
                        locale={ptBR}
                        disabled={(d) => date ? d < new Date(date + "T00:00:00") : false}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {!isAllDay && (
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Hora Fim</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="bg-muted/50 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Local */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Local
                </Label>
                <Input
                  id="location"
                  placeholder="Ex: Templo Principal, Salão Social..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-muted/50 shadow-sm"
                />
              </div>

              {/* Recorrência - apenas na criação */}
              {!isEditing && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Repeat className="w-4 h-4" />
                  Repetir
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value as RecurrenceConfig["type"])}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 shadow-sm px-3 py-2 text-sm"
                    >
                      <option value="none">Não repetir</option>
                      {date && selectedWeekday !== null && (
                        <option value="weekday">{weekdayNames[selectedWeekday]}</option>
                      )}
                      <option value="daily">Todo dia</option>
                      <option value="weekly">Toda semana</option>
                      <option value="monthly">Todo mês</option>
                      <option value="yearly">Todo ano</option>
                    </select>
                  </div>

                  {recurrenceType !== "none" && recurrenceType !== "weekday" && (
                    <div className="space-y-2">
                      <Label>A cada</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                          className="w-20 bg-muted/50 shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground">
                          {recurrenceType === "daily" && (recurrenceInterval === 1 ? "dia" : "dias")}
                          {recurrenceType === "weekly" && (recurrenceInterval === 1 ? "semana" : "semanas")}
                          {recurrenceType === "monthly" && (recurrenceInterval === 1 ? "mês" : "meses")}
                          {recurrenceType === "yearly" && (recurrenceInterval === 1 ? "ano" : "anos")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {recurrenceType !== "none" && (
                  <div className="space-y-2">
                    <Label>Terminar</Label>
                    <select
                      value={recurrenceEndType}
                      onChange={(e) => {
                        const newType = e.target.value as "never" | "after" | "on";
                        setRecurrenceEndType(newType);
                        if (newType === "after" && recurrenceEndAfter < 2) {
                          setRecurrenceEndAfter(2);
                        }
                      }}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 shadow-sm px-3 py-2 text-sm"
                    >
                      <option value="never">Nunca</option>
                      <option value="after">Após X ocorrências</option>
                      <option value="on">Em data específica</option>
                    </select>

                    {recurrenceEndType === "after" && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">Repetir</span>
                        <Input
                          type="number"
                          min={2}
                          max={100}
                          value={recurrenceEndAfter}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setRecurrenceEndAfter(isNaN(value) ? 2 : Math.max(2, value));
                          }}
                          className="w-20 bg-muted/50 shadow-sm"
                        />
                        <span className="text-sm text-muted-foreground">vezes no total</span>
                      </div>
                    )}

                    {recurrenceEndType === "on" && (
                      <Input
                        type="date"
                        value={recurrenceEndOn}
                        onChange={(e) => setRecurrenceEndOn(e.target.value)}
                        min={date}
                        className="mt-2 bg-muted/50 shadow-sm"
                      />
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Ministérios Colaboradores */}
              <MinistryMultiSelectWithCreate
                value={collaboratorMinistryIds}
                onValueChange={setCollaboratorMinistryIds}
                excludeIds={[]}
                label="Ministérios Colaboradores"
              />


              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Adicione observações sobre o evento..."
                  rows={4}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="bg-muted/50 shadow-sm"
                />
              </div>

              {/* Seção de Lembretes */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <Label className="text-base font-medium">Lembretes</Label>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Configure como os lembretes serão enviados para os líderes dos ministérios envolvidos.
                </p>

                {/* Seletor de modelo de mensagem */}
                <div className="space-y-2">
                  <Label className="text-sm">Modelo de mensagem</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomTemplate(false);
                        setCustomMessageTemplate(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-left",
                        !useCustomTemplate
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/20 hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium text-sm">Padrão</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">
                        Usa modelo global
                      </span>
                    </button>
                    
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomTemplate(true);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all w-full",
                          useCustomTemplate
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/20 hover:border-muted-foreground/40"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-4 h-4" />
                          <span className="font-medium text-sm">Personalizado</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground text-center">
                          Mensagem exclusiva
                        </span>
                      </button>
                      
                      {/* Botão para configurar/editar template personalizado */}
                      {useCustomTemplate && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 mt-2 w-full"
                          onClick={() => setShowMessageTemplateModal(true)}
                        >
                          <MousePointerClick className="w-4 h-4" />
                          {customMessageTemplate ? "Editar Mensagem" : "Configurar Mensagem"}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Preview dos modelos globais quando "Padrão" está selecionado */}
                  {!useCustomTemplate && (
                    <GlobalTemplatePreview />
                  )}
                </div>

                {/* Enviar lembrete agora - apenas em modo Personalizado, edição e eventos futuros */}
                {isEditing && useCustomTemplate && (
                  <div className="pt-3 border-t space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full gap-2.5 h-11 text-sm font-medium text-[#075E54] hover:text-[#075E54]",
                                "bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30 hover:border-[#25D366]/50 transition-all"
                              )}
                              disabled={!isEventInFuture || isSendingReminder}
                              onClick={handleSendInstantReminder}
                            >
                              {isSendingReminder ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <img src={whatsappIcon} alt="" className="w-6 h-6" />
                                  Enviar Lembrete Agora
                                </>
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!isEventInFuture && (
                          <TooltipContent>
                            <p>Este evento já passou</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>

              {/* Modal de template de mensagem */}
              <EventMessageTemplateModal
                open={showMessageTemplateModal}
                onOpenChange={(open) => {
                  setShowMessageTemplateModal(open);
                  if (!open) setEditingTemplateType(null);
                }}
                templateType={editingTemplateType || "manual"}
                template={editingTemplateType
                  ? getTemplateForType(editingTemplateType)
                  : customMessageTemplate
                }
                globalSchedule={editingTemplateType ? (() => {
                  const templates = reminderSettings?.reminder_templates || DEFAULT_REMINDER_TEMPLATES;
                  const t = templates[editingTemplateType as keyof typeof templates];
                  return t ? { delay: t.delay, repeat: t.repeat } : undefined;
                })() : undefined}
                onSave={(template) => {
                  if (editingTemplateType) {
                    setCustomReminderTemplates(prev => ({ ...prev, [editingTemplateType]: template }));
                  } else {
                    setCustomMessageTemplate(template);
                    setUseCustomTemplate(true);
                  }
                }}
              />

              {/* Botões */}
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/agenda")}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Salvar
                  </Button>
                </div>


                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      const event = getEventById(id!);
                      const isRecurring = event?.recurrence?.type !== "none" && event?.recurrence?.type !== undefined;
                      const isPartOfSeries = !!event?.parentEventId;
                      if (isRecurring || isPartOfSeries) {
                        setShowDeleteDialog(true);
                      } else {
                        deleteEvent(id!);
                        toast({
                          title: "Evento excluído",
                          description: "O evento foi removido com sucesso.",
                        });
                        navigate("/agenda");
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Evento
                  </Button>
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
                    <AlertDialogAction
                      onClick={() => {
                        deleteEvent(id!);
                        toast({
                          title: "Evento excluído",
                          description: "O evento foi removido com sucesso.",
                        });
                        setShowDeleteDialog(false);
                        navigate("/agenda");
                      }}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      Apenas este evento
                    </AlertDialogAction>
                    <AlertDialogAction
                      onClick={() => {
                        const event = getEventById(id!);
                        const parentId = event?.parentEventId || id!;
                        deleteEventSeries(parentId);
                        toast({
                          title: "Série excluída",
                          description: "Todos os eventos da série foram removidos.",
                        });
                        setShowDeleteDialog(false);
                        navigate("/agenda");
                      }}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Toda a série
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Dialog de atualização para eventos recorrentes */}
              <AlertDialog open={showSeriesUpdateDialog} onOpenChange={setShowSeriesUpdateDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Atualizar evento recorrente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Este evento faz parte de uma série. O que você deseja atualizar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUpdateSingleEvent}
                      disabled={isSaving}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      {isSaving ? "Salvando..." : "Apenas este evento"}
                    </AlertDialogAction>
                    <AlertDialogAction
                      onClick={handleUpdateEntireSeries}
                      disabled={isSaving}
                    >
                      {isSaving ? "Salvando..." : "Toda a série"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Confirmação para enviar lembrete via WhatsApp */}
              <AlertDialog open={showReminderConfirmDialog} onOpenChange={setShowReminderConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <img src={whatsappIcon} alt="" className="w-5 h-5" />
                      Enviar lembrete via WhatsApp
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Deseja enviar um lembrete instantâneo via WhatsApp para todos os líderes dos ministérios deste evento?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel disabled={isSendingReminder}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSendInstantReminderConfirm}
                      disabled={isSendingReminder}
                      className="bg-[#25D366] hover:bg-[#25D366]/90"
                    >
                      {isSendingReminder ? "Enviando..." : "Enviar via WhatsApp"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventForm;