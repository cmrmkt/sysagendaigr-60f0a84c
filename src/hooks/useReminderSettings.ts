import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface MessageTemplate {
  title: string;
  body: string;
}

export type NotificationChannel = "whatsapp" | "push" | "both";

export type RepeatType = "none" | "minutes" | "hours" | "days" | "weeks" | "months" | "years";
export type DurationType = "forever" | "count" | "until";

export type DelayUnit = "minutes" | "hours" | "days";

export interface DelayConfig {
  value: number;
  unit: DelayUnit;
}

export interface RepeatConfig {
  type: RepeatType;
  interval: number;
  week_days?: number[];
  duration: DurationType;
  count?: number;
  until?: string;
}

export interface TemplateWithRepeat {
  enabled: boolean;
  template: MessageTemplate;
  repeat: RepeatConfig;
  delay?: DelayConfig;
}

export interface ReminderTemplates {
  after_creation: TemplateWithRepeat;
  before_due: TemplateWithRepeat;
  on_due: TemplateWithRepeat;
}

// Legacy types kept for backward compat
export interface MessageTemplates {
  after_creation: MessageTemplate;
  before_due: MessageTemplate;
  on_due: MessageTemplate;
  interval: MessageTemplate;
  instant_reminder: MessageTemplate;
}

export interface ReminderSettings {
  enabled: boolean;
  notification_channel: NotificationChannel;
  after_creation_days: number;
  before_due_days: number[];
  on_due_day: boolean;
  send_time: string;
  interval_reminders: {
    enabled: boolean;
    interval_days: number;
    max_reminders: number;
  };
  repeat?: RepeatConfig;
  reminder_templates?: ReminderTemplates;
  message_templates?: MessageTemplates;
}

export const DEFAULT_REPEAT: RepeatConfig = {
  type: "none",
  interval: 1,
  duration: "forever",
};

export const DEFAULT_REMINDER_TEMPLATES: ReminderTemplates = {
  after_creation: {
    enabled: true,
    template: {
      title: "📝 Novo [tipo_recurso]",
      body: "[nome], [titulo] foi criado.\n\nCriado em [data_criacao] às [hora_criacao]",
    },
    repeat: { type: "none", interval: 1, duration: "forever" },
    delay: { value: 30, unit: "minutes" },
  },
  before_due: {
    enabled: true,
    template: {
      title: "⏰ Lembrete",
      body: "[nome], [ministério]: [titulo]\nVencimento em [data_evento] às [hora_evento]",
    },
    repeat: { type: "days", interval: 1, duration: "count", count: 3 },
  },
  on_due: {
    enabled: true,
    template: {
      title: "📅 Hoje",
      body: "[nome], [ministério]: [titulo]\nVencimento hoje às [hora_evento]",
    },
    repeat: { type: "none", interval: 1, duration: "forever" },
  },
};

// Legacy defaults kept for edge function compat
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplates = {
  after_creation: {
    title: "📝 Novo [tipo_recurso]",
    body: "[nome], [titulo] foi criado.\n\nCriado em [data_criacao]",
  },
  before_due: {
    title: "⏰ Lembrete",
    body: "[nome], [ministério]: [titulo]\nVencimento em [data_evento] às [hora_evento]",
  },
  on_due: {
    title: "📅 Hoje",
    body: "[nome], [ministério]: [titulo]\nVencimento hoje às [hora_evento]",
  },
  interval: {
    title: "🔔 Lembrete",
    body: "[nome], [ministério]: [titulo]",
  },
  instant_reminder: {
    title: "⏰ Lembrete",
    body: "[nome] - [ministério]\n\nProgramação:\n[titulo]\n\nData:\n[data_evento] às [hora_evento]\n\nObs: Sua participação é muito importante, Ore pela programação e fique atento às suas responsabilidades.",
  },
};

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  notification_channel: "whatsapp",
  after_creation_days: 1,
  before_due_days: [1],
  on_due_day: false,
  send_time: "09:00",
  interval_reminders: {
    enabled: false,
    interval_days: 3,
    max_reminders: 3,
  },
  repeat: {
    type: "none",
    interval: 1,
    duration: "forever",
  },
  reminder_templates: DEFAULT_REMINDER_TEMPLATES,
  message_templates: DEFAULT_MESSAGE_TEMPLATES,
};

export const useReminderSettings = () => {
  const { effectiveOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["reminderSettings", effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return DEFAULT_REMINDER_SETTINGS;

      const { data, error } = await supabase
        .from("organizations")
        .select("reminder_settings")
        .eq("id", effectiveOrganization.id)
        .single();

      if (error) throw error;

      return (data?.reminder_settings as unknown as ReminderSettings) || DEFAULT_REMINDER_SETTINGS;
    },
    enabled: !!effectiveOrganization?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: ReminderSettings) => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { error } = await supabase
        .from("organizations")
        .update({ reminder_settings: settings as unknown as import("@/integrations/supabase/types").Json })
        .eq("id", effectiveOrganization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminderSettings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações de lembretes foram atualizadas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings: query.data || DEFAULT_REMINDER_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
