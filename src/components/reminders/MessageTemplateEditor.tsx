import { useState } from "react";
import { RotateCcw, MessageSquare, Eye, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ReminderTemplates,
  TemplateWithRepeat,
  DEFAULT_REMINDER_TEMPLATES,
  RepeatConfig,
  DelayConfig,
  DelayUnit,
} from "@/hooks/useReminderSettings";
import { RepeatConfigSection } from "./RepeatConfigSection";
import { OnDueConfigSection } from "./OnDueConfigSection";

type TemplateType = keyof ReminderTemplates;

interface TemplateConfig {
  label: string;
  description: string;
  variables: Array<{ key: string; description: string; example: string }>;
  icon: string;
}

const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
  after_creation: {
    label: "Primeiro após Criação",
    description: "Lembrete enviado quando um novo evento/tarefa é criado",
    icon: "📝",
    variables: [
      { key: "[nome]", description: "Nome do destinatário", example: "João Silva" },
      { key: "[ministério]", description: "Ministério responsável (com líder)", example: "Louvor (Paulo S.)" },
      { key: "[ministérios_colaboradores]", description: "Ministérios colaboradores (com líderes)", example: "Infantil (Maria C.), Jovens (Ana R.)" },
      { key: "[titulo]", description: "Título do evento/tarefa", example: "Culto de Domingo" },
      { key: "[tipo_recurso]", description: "Tipo (Evento, Tarefa, Aviso)", example: "Evento" },
      { key: "[data_criacao]", description: "Data de criação", example: "15/02/2026" },
      { key: "[hora_criacao]", description: "Hora de criação", example: "10:30" },
    ],
  },
  before_due: {
    label: "Antes da Data",
    description: "Lembrete enviado antes do evento/tarefa",
    icon: "⏰",
    variables: [
      { key: "[nome]", description: "Nome do destinatário", example: "João Silva" },
      { key: "[ministério]", description: "Ministério responsável (com líder)", example: "Louvor (Paulo S.)" },
      { key: "[ministérios_colaboradores]", description: "Ministérios colaboradores (com líderes)", example: "Infantil (Maria C.), Jovens (Ana R.)" },
      { key: "[titulo]", description: "Título do evento/tarefa", example: "Culto de Domingo" },
      { key: "[tipo_recurso]", description: "Tipo (Evento, Tarefa, Aviso)", example: "Evento" },
      { key: "[data_evento]", description: "Data do evento", example: "15/02/2026" },
      { key: "[hora_evento]", description: "Horário do evento", example: "09:00" },
      { key: "[dias_para_vencimento]", description: "Dias restantes", example: "3" },
    ],
  },
  on_due: {
    label: "No Dia",
    description: "Lembrete enviado no dia do evento/tarefa",
    icon: "📅",
    variables: [
      { key: "[nome]", description: "Nome do destinatário", example: "João Silva" },
      { key: "[ministério]", description: "Ministério responsável (com líder)", example: "Louvor (Paulo S.)" },
      { key: "[ministérios_colaboradores]", description: "Ministérios colaboradores (com líderes)", example: "Infantil (Maria C.), Jovens (Ana R.)" },
      { key: "[titulo]", description: "Título do evento/tarefa", example: "Culto de Domingo" },
      { key: "[tipo_recurso]", description: "Tipo (Evento, Tarefa, Aviso)", example: "Evento" },
      { key: "[data_evento]", description: "Data do evento", example: "15/02/2026" },
      { key: "[hora_evento]", description: "Horário do evento", example: "09:00" },
    ],
  },
};

interface MessageTemplateEditorProps {
  templates: ReminderTemplates;
  onChange: (templates: ReminderTemplates) => void;
}

const DELAY_OPTIONS: { unit: DelayUnit; label: string; singular: string; max: number }[] = [
  { unit: "minutes", label: "minutos", singular: "minuto", max: 59 },
  { unit: "hours", label: "horas", singular: "hora", max: 23 },
  { unit: "days", label: "dias", singular: "dia", max: 30 },
];

const DelayConfigSection = ({ delay, onChange }: { delay: DelayConfig; onChange: (d: DelayConfig) => void }) => (
  <div className="space-y-3">
    <h4 className="text-sm font-semibold text-muted-foreground">Quando enviar</h4>
    <div className="rounded-lg border bg-muted/30 divide-y">
      {DELAY_OPTIONS.map((opt) => (
        <label
          key={opt.unit}
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <input
            type="radio"
            checked={delay.unit === opt.unit}
            onChange={() => onChange({ ...delay, unit: opt.unit })}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm">Após</span>
          <Input
            type="number"
            min={1}
            max={opt.max}
            className="w-14 h-7 text-center text-sm bg-background shadow-sm"
            value={delay.unit === opt.unit ? delay.value : 1}
            onChange={(e) => onChange({ value: parseInt(e.target.value) || 1, unit: opt.unit })}
            onClick={() => onChange({ ...delay, unit: opt.unit })}
          />
          <span className="text-sm">{delay.value === 1 && delay.unit === opt.unit ? opt.singular : opt.label} da criação</span>
        </label>
      ))}
    </div>
  </div>
);

export const MessageTemplateEditor = ({ templates, onChange }: MessageTemplateEditorProps) => {
  const [openSection, setOpenSection] = useState<TemplateType | null>(null);

  const handleChange = (type: TemplateType, updates: Partial<TemplateWithRepeat>) => {
    onChange({
      ...templates,
      [type]: { ...templates[type], ...updates },
    });
  };

  const handleTemplateFieldChange = (type: TemplateType, field: "title" | "body", value: string) => {
    handleChange(type, {
      template: { ...templates[type].template, [field]: value },
    });
  };

  const handleRepeatChange = (type: TemplateType, repeat: RepeatConfig) => {
    handleChange(type, { repeat });
  };

  const handleDelayChange = (type: TemplateType, delay: DelayConfig) => {
    handleChange(type, { delay });
  };

  const handleRestoreDefault = (type: TemplateType) => {
    handleChange(type, DEFAULT_REMINDER_TEMPLATES[type]);
  };

  const renderPreview = (type: TemplateType) => {
    const { template } = templates[type];
    const config = TEMPLATE_CONFIGS[type];

    let title = template.title;
    let body = template.body;

    config.variables.forEach(({ key, example }) => {
      const regex = new RegExp(key.replace(/[[\]]/g, "\\$&"), "g");
      title = title.replace(regex, example);
      body = body.replace(regex, example);
    });

    return (
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Prévia</span>
        </div>
        <div className="bg-background rounded-md p-3 shadow-sm border">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{body}</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Modelos de Lembretes
        </CardTitle>
        <CardDescription>
          Configure cada tipo de lembrete com sua mensagem e repetição individual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.keys(TEMPLATE_CONFIGS) as TemplateType[]).map((type) => {
          const config = TEMPLATE_CONFIGS[type];
          const isOpen = openSection === type;
          const item = templates[type];

          return (
            <Card
              key={type}
              className={`transition-all duration-200 ${isOpen ? "ring-2 ring-primary/20 shadow-md" : "hover:shadow-sm"}`}
            >
              <Collapsible
                open={isOpen}
                onOpenChange={(open) => setOpenSection(open ? type : null)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shadow-sm">
                          {config.icon}
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-base flex items-center gap-2">
                            {config.label}
                            {!item.enabled && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                Desativado
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">{config.description}</CardDescription>
                        </div>
                      </div>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? "bg-primary/10" : "bg-muted"}`}>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 space-y-5 border-t">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <Label className="font-medium">Ativar este lembrete</Label>
                        <p className="text-sm text-muted-foreground">
                          Quando desativado, este tipo de lembrete não será enviado
                        </p>
                      </div>
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) => handleChange(type, { enabled: checked })}
                      />
                    </div>

                    <Separator />

                    {/* Available Variables */}
                    <div className="bg-muted/40 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Variáveis disponíveis</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <TooltipProvider>
                          {config.variables.map(({ key, description }) => (
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
                      <Label>Título da Mensagem</Label>
                      <Input
                        value={item.template.title}
                        onChange={(e) => handleTemplateFieldChange(type, "title", e.target.value)}
                        placeholder="Ex: ⏰ Lembrete"
                        className="bg-muted/50 shadow-sm"
                      />
                    </div>

                    {/* Body Textarea */}
                    <div className="space-y-2">
                      <Label>Corpo da Mensagem</Label>
                      <Textarea
                        value={item.template.body}
                        onChange={(e) => handleTemplateFieldChange(type, "body", e.target.value)}
                        placeholder="Digite o corpo da mensagem..."
                        rows={4}
                        className="font-mono text-sm bg-muted/50 shadow-sm"
                      />
                    </div>

                    {/* Preview */}
                    {renderPreview(type)}

                    <Separator />

                    {/* Delay / Repeat Config */}
                     {type === "after_creation" ? (
                       <DelayConfigSection
                         delay={item.delay || { value: 30, unit: "minutes" }}
                         onChange={(d) => handleDelayChange(type, d)}
                       />
                     ) : type === "on_due" ? (
                       <OnDueConfigSection
                         repeat={item.repeat}
                         onChange={(r) => handleRepeatChange(type, r)}
                       />
                     ) : (
                       <RepeatConfigSection
                         repeat={item.repeat}
                         onChange={(r) => handleRepeatChange(type, r)}
                         allowedTypes={type === "before_due" ? ["days", "weeks", "months", "years"] : undefined}
                       />
                     )}

                    {/* Restore Default */}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreDefault(type)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar Padrão
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};
