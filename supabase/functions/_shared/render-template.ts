// Shared template rendering utility for reminder messages

export interface MessageTemplate {
  title: string;
  body: string;
}

export interface TemplateVariables {
  titulo?: string;
  tipo_recurso?: string;
  data_evento?: string;
  hora_evento?: string;
  data_criacao?: string;
  hora_criacao?: string;
  dias_para_vencimento?: string;
  nome?: string;
  ministerio?: string;
  ministerios_colaboradores?: string;
}

/**
 * Renders a message template by replacing placeholders with actual values.
 * Placeholders use the format [variable_name].
 * 
 * @param template - The template object containing title and body
 * @param variables - Object containing variable values
 * @returns The rendered template with variables replaced
 */
export function renderTemplate(
  template: MessageTemplate,
  variables: TemplateVariables
): { title: string; body: string } {
  const variableMap: Record<string, string> = {
    "[titulo]": variables.titulo || "",
    "[tipo_recurso]": variables.tipo_recurso || "",
    "[data_evento]": variables.data_evento || "",
    "[hora_evento]": variables.hora_evento || "",
    "[data_criacao]": variables.data_criacao || "",
    "[hora_criacao]": variables.hora_criacao || "",
    "[dias_para_vencimento]": variables.dias_para_vencimento || "",
    "[nome]": variables.nome || "",
    "[ministério]": variables.ministerio || "",
    "[ministérios_colaboradores]": variables.ministerios_colaboradores || "",
  };

  let renderedTitle = template.title;
  let renderedBody = template.body;

  // Replace all placeholders
  for (const [placeholder, value] of Object.entries(variableMap)) {
    const regex = new RegExp(placeholder.replace(/[[\]]/g, "\\$&"), "g");
    renderedTitle = renderedTitle.replace(regex, value);
    renderedBody = renderedBody.replace(regex, value);
  }

  // Clean up any remaining unreplaced placeholders (set to empty)
  renderedTitle = renderedTitle.replace(/\[[^\]]+\]/g, "");
  renderedBody = renderedBody.replace(/\[[^\]]+\]/g, "");

  return {
    title: renderedTitle.trim(),
    body: renderedBody.trim(),
  };
}

/**
 * Default templates used when organization has no custom templates configured
 */
export const DEFAULT_TEMPLATES = {
  after_creation: {
    title: "📝 Novo [tipo_recurso]",
    body: "[titulo]\n\nCriado em [data_criacao]",
  },
  before_due: {
    title: "⏰ Lembrete",
    body: "[tipo_recurso]: [titulo]\nVencimento em [data_evento] às [hora_evento]",
  },
  on_due: {
    title: "📅 Hoje",
    body: "[tipo_recurso]: [titulo]\nVencimento hoje às [hora_evento]",
  },
  interval: {
    title: "🔔 Lembrete",
    body: "[tipo_recurso]: [titulo]",
  },
  instant_reminder: {
    title: "⏰ Lembrete",
    body: "[nome] - [ministério]\n\nProgramação:\n[titulo]\n\nData:\n[data_evento] às [hora_evento]\n\nObs: Sua participação é muito importante, Ore pela programação e fique atento às suas responsabilidades.",
  },
};

export type TemplateType = keyof typeof DEFAULT_TEMPLATES;

/**
 * Get template for a given type, falling back to defaults if not configured
 */
export function getTemplate(
  messageTemplates: Record<string, MessageTemplate> | null | undefined,
  type: TemplateType
): MessageTemplate {
  if (messageTemplates && messageTemplates[type]) {
    return messageTemplates[type];
  }
  return DEFAULT_TEMPLATES[type];
}

/**
 * Format a date string (YYYY-MM-DD) to Brazilian format (DD/MM/YYYY)
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Format time string to HH:MM format
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

/**
 * Get resource type label in Portuguese
 */
export function getResourceTypeLabel(resourceType: string): string {
  const labels: Record<string, string> = {
    event: "Evento",
    task: "Tarefa",
    announcement: "Aviso",
  };
  return labels[resourceType] || resourceType;
}
