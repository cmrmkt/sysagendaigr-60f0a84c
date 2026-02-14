import { useState, useEffect } from "react";
import { RotateCcw, MessageSquare, Eye, Info, Settings, Clock, CalendarIcon, Power } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RepeatConfigSection } from "@/components/reminders/RepeatConfigSection";
import { cn } from "@/lib/utils";
import type { RepeatConfig, DelayConfig, DelayUnit } from "@/hooks/useReminderSettings";

export interface EventMessageTemplate {
  title: string;
  body: string;
  delay?: DelayConfig;
  repeat?: RepeatConfig;
  reference_date?: string;
  enabled?: boolean;
}

interface EventMessageTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EventMessageTemplate | null;
  onSave: (template: EventMessageTemplate) => void;
  templateType?: string;
  /** Global schedule config to use as defaults */
  globalSchedule?: {
    delay?: DelayConfig;
    repeat?: RepeatConfig;
  };
}

const DEFAULT_EVENT_TEMPLATE: EventMessageTemplate = {
  title: "⏰ Lembrete",
  body: "[nome] - [ministério]\n\nProgramação:\n[titulo]\n\nData:\n[data_evento] às [hora_evento]\n\nObs: Sua participação é muito importante, Ore pela programação e fique atento às suas responsabilidades.",
};

const AVAILABLE_VARIABLES = [
  { key: "[nome]", description: "Nome do destinatário", example: "João Silva" },
  { key: "[ministério]", description: "Ministério responsável (com líder)", example: "Louvor (Paulo S.)" },
  { key: "[ministérios_colaboradores]", description: "Ministérios colaboradores (com líderes)", example: "Infantil (Maria C.), Jovens (Ana R.)" },
  { key: "[titulo]", description: "Título do evento", example: "Culto de Domingo" },
  { key: "[data_evento]", description: "Data do evento", example: "15/02/2026" },
  { key: "[hora_evento]", description: "Horário do evento", example: "09:00" },
];

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  after_creation: "Após a Data",
  before_due: "Antes da Data",
  on_due: "No Dia",
  manual: "Mensagem Exclusiva",
};

const DELAY_UNIT_OPTIONS: { value: DelayUnit; label: string }[] = [
  { value: "minutes", label: "Minutos" },
  { value: "hours", label: "Horas" },
  { value: "days", label: "Dias" },
];

export const EventMessageTemplateModal = ({
  open,
  onOpenChange,
  template,
  onSave,
  templateType = "manual",
  globalSchedule,
}: EventMessageTemplateModalProps) => {
  const [localTemplate, setLocalTemplate] = useState<EventMessageTemplate>(
    template || DEFAULT_EVENT_TEMPLATE
  );

  useEffect(() => {
    if (open) {
      const base = template || DEFAULT_EVENT_TEMPLATE;
      // Initialize schedule from template override or global defaults
      setLocalTemplate({
        ...base,
        delay: base.delay || globalSchedule?.delay,
        repeat: base.repeat || globalSchedule?.repeat,
      });
    }
  }, [open, template, globalSchedule]);

  const handleSave = () => {
    onSave(localTemplate);
    onOpenChange(false);
  };

  const handleRestoreDefault = () => {
    setLocalTemplate({
      ...DEFAULT_EVENT_TEMPLATE,
      delay: globalSchedule?.delay,
      repeat: globalSchedule?.repeat,
    });
  };

  const renderScheduleSection = () => {
    if (templateType === "manual") return null;

    if (templateType === "after_creation") {
      const delay = localTemplate.delay || { value: 30, unit: "minutes" as DelayUnit };
      const referenceDate = localTemplate.reference_date
        ? new Date(localTemplate.reference_date + "T00:00:00")
        : undefined;
      return (
        <div className="space-y-3">
          {/* Enable/Disable toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quando enviar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {localTemplate.enabled !== false ? "Ativado" : "Desativado"}
              </span>
              <Switch
                checked={localTemplate.enabled !== false}
                onCheckedChange={(checked) =>
                  setLocalTemplate({ ...localTemplate, enabled: checked })
                }
              />
            </div>
          </div>
          {localTemplate.enabled !== false && (
            <div className="bg-muted/40 rounded-lg p-4 space-y-4">
              {/* Data de referência */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Data de referência:</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-sm",
                        !referenceDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {referenceDate
                        ? format(referenceDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione uma data..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={referenceDate}
                      onSelect={(d) => {
                        if (d) {
                          setLocalTemplate({
                            ...localTemplate,
                            reference_date: format(d, "yyyy-MM-dd"),
                          });
                        }
                      }}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Delay em minutos/horas */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Enviar após:</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    className="w-20 h-9 text-center text-sm bg-background shadow-sm"
                    value={delay.value}
                    onChange={(e) =>
                      setLocalTemplate({
                        ...localTemplate,
                        delay: { ...delay, value: parseInt(e.target.value) || 0 },
                      })
                    }
                  />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                    value={delay.unit}
                    onChange={(e) =>
                      setLocalTemplate({
                        ...localTemplate,
                        delay: { ...delay, unit: e.target.value as DelayUnit },
                      })
                    }
                  >
                    {DELAY_UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-muted-foreground">após a data</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (templateType === "before_due") {
      const repeat = localTemplate.repeat || { type: "none" as const, interval: 1, duration: "forever" as const };
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quando enviar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {localTemplate.enabled !== false ? "Ativado" : "Desativado"}
              </span>
              <Switch
                checked={localTemplate.enabled !== false}
                onCheckedChange={(checked) =>
                  setLocalTemplate({ ...localTemplate, enabled: checked })
                }
              />
            </div>
          </div>
          {localTemplate.enabled !== false && (
            <div className="bg-muted/40 rounded-lg p-4">
              <RepeatConfigSection
                repeat={repeat}
                onChange={(newRepeat) =>
                  setLocalTemplate({ ...localTemplate, repeat: newRepeat })
                }
              />
            </div>
          )}
        </div>
      );
    }

    if (templateType === "on_due") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quando enviar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {localTemplate.enabled !== false ? "Ativado" : "Desativado"}
              </span>
              <Switch
                checked={localTemplate.enabled !== false}
                onCheckedChange={(checked) =>
                  setLocalTemplate({ ...localTemplate, enabled: checked })
                }
              />
            </div>
          </div>
          {localTemplate.enabled !== false && (
            <div className="bg-muted/40 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Este lembrete é enviado automaticamente no dia do evento. Não há configuração de agendamento adicional.
              </p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const renderPreview = () => {
    let title = localTemplate.title;
    let body = localTemplate.body;

    AVAILABLE_VARIABLES.forEach(({ key, example }) => {
      const regex = new RegExp(key.replace(/[[\]]/g, "\\$&"), "g");
      title = title.replace(regex, example);
      body = body.replace(regex, example);
    });

    return (
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Prévia da mensagem</span>
        </div>
        <div className="bg-background rounded-md p-3 shadow-sm border">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{body}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {templateType === "manual"
              ? "Configurar Mensagem do Lembrete"
              : `Editar Template: ${TEMPLATE_TYPE_LABELS[templateType] || templateType}`}
          </DialogTitle>
          <DialogDescription>
            {templateType === "manual"
              ? "Personalize a mensagem de lembrete para este evento específico."
              : `Edite o template "${TEMPLATE_TYPE_LABELS[templateType] || templateType}" apenas para este evento. A configuração global não será alterada.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Schedule Config */}
          {renderScheduleSection()}

          {/* Available Variables */}
          <div className="bg-muted/40 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Variáveis disponíveis</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {AVAILABLE_VARIABLES.map(({ key, description }) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="cursor-help font-mono text-xs bg-background shadow-sm"
                      >
                        {key}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="template-title">Título da Mensagem</Label>
            <Input
              id="template-title"
              value={localTemplate.title}
              onChange={(e) =>
                setLocalTemplate({ ...localTemplate, title: e.target.value })
              }
              placeholder="Ex: ⏰ Lembrete"
              className="bg-muted/50 shadow-sm"
            />
          </div>

          {/* Body Textarea */}
          <div className="space-y-2">
            <Label htmlFor="template-body">Corpo da Mensagem</Label>
            <Textarea
              id="template-body"
              value={localTemplate.body}
              onChange={(e) =>
                setLocalTemplate({ ...localTemplate, body: e.target.value })
              }
              placeholder="Digite o corpo da mensagem..."
              rows={5}
              className="font-mono text-sm bg-muted/50 shadow-sm"
            />
          </div>

          {/* Preview */}
          {renderPreview()}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestoreDefault}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-none">
              Salvar Mensagem
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
