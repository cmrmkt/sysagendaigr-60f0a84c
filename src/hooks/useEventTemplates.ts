import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface EventTemplate {
  id: string;
  organization_id: string;
  title: string;
  ministry_id: string | null;
  default_start_time: string;
  default_end_time: string;
  default_location: string | null;
  is_all_day: boolean;
  visibility: string;
  observations: string | null;
  is_active: boolean;
  display_order: number;
  collaborator_ministry_ids: string[] | null;
  volunteer_user_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface EventTemplateInput {
  title: string;
  ministry_id?: string | null;
  default_start_time?: string;
  default_end_time?: string;
  default_location?: string | null;
  is_all_day?: boolean;
  visibility?: string;
  observations?: string | null;
  is_active?: boolean;
  display_order?: number;
  collaborator_ministry_ids?: string[] | null;
  volunteer_user_ids?: string[] | null;
}

export function useEventTemplates() {
  const { effectiveOrganization } = useAuth();
  const organizationId = effectiveOrganization?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["event-templates", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("display_order", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      return data as EventTemplate[];
    },
    enabled: !!organizationId,
  });

  const activeTemplates = templates.filter((t) => t.is_active);

  const addMutation = useMutation({
    mutationFn: async (input: EventTemplateInput) => {
      if (!organizationId) throw new Error("Organização não encontrada");

      const maxOrder = templates.length > 0 
        ? Math.max(...templates.map(t => t.display_order)) + 1 
        : 0;

      const { data, error } = await supabase
        .from("event_templates")
        .insert({
          ...input,
          organization_id: organizationId,
          display_order: input.display_order ?? maxOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      toast({
        title: "Evento padrão criado",
        description: "O template foi adicionado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar evento padrão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: EventTemplateInput & { id: string }) => {
      const { data, error } = await supabase
        .from("event_templates")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      toast({
        title: "Evento padrão atualizado",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar evento padrão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      toast({
        title: "Evento padrão removido",
        description: "O template foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir evento padrão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("event_templates")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      toast({
        title: variables.is_active ? "Template ativado" : "Template desativado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    activeTemplates,
    isLoading,
    error,
    addTemplate: addMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
