import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Ministry {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  organization_id: string;
  leaderId?: string;
  leaderName?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MinistryInput {
  name: string;
  color: string;
  isActive: boolean;
  leaderId?: string;
}

export const useMinistries = () => {
  const { effectiveOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["ministries", effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from("ministries")
        .select("*")
        .eq("organization_id", effectiveOrganization.id)
        .order("name");

      if (error) throw error;

      const ministryIds = (data || []).map((m) => m.id);

      // Fetch leaders for all ministries
      let leaderMap: Record<string, { ids: string[]; names: string[] }> = {};
      if (ministryIds.length > 0) {
        const { data: leaderEntries } = await supabase
          .from("user_ministries")
          .select("ministry_id, user_id")
          .eq("role", "leader")
          .in("ministry_id", ministryIds);

        if (leaderEntries && leaderEntries.length > 0) {
          const leaderUserIds = [...new Set(leaderEntries.map((l) => l.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", leaderUserIds);

          const profileMap: Record<string, string> = {};
          (profiles || []).forEach((p) => {
            profileMap[p.id] = p.name;
          });

          leaderEntries.forEach((entry) => {
            const name = profileMap[entry.user_id];
            if (!leaderMap[entry.ministry_id]) {
              leaderMap[entry.ministry_id] = { ids: [], names: [] };
            }
            leaderMap[entry.ministry_id].ids.push(entry.user_id);
            if (name) {
              leaderMap[entry.ministry_id].names.push(name);
            }
          });
        }
      }

      return (data || []).map((m) => ({
        id: m.id,
        name: m.name,
        color: m.color,
        isActive: m.is_active ?? true,
        organization_id: m.organization_id,
        leaderId: leaderMap[m.id]?.ids[0] || undefined,
        leaderName: leaderMap[m.id]?.names.join(", ") || undefined,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })) as Ministry[];
    },
    enabled: !!effectiveOrganization?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (ministry: MinistryInput) => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("ministries")
        .insert({
          name: ministry.name,
          color: ministry.color,
          is_active: ministry.isActive,
          organization_id: effectiveOrganization.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Assign leader
      if (ministry.leaderId) {
        const { error: leaderError } = await supabase
          .from("user_ministries")
          .insert({
            user_id: ministry.leaderId,
            ministry_id: data.id,
            role: "leader" as const,
          });
        if (leaderError) throw leaderError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      toast({
        title: "Ministério criado",
        description: "O novo ministério foi adicionado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar ministério",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MinistryInput> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { error } = await supabase
        .from("ministries")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Update leader if provided
      if (data.leaderId !== undefined) {
        // Remove existing leaders for this ministry
        await supabase
          .from("user_ministries")
          .delete()
          .eq("ministry_id", id)
          .eq("role", "leader");

        // Assign new leader
        if (data.leaderId) {
          const { error: leaderError } = await supabase
            .from("user_ministries")
            .insert({
              user_id: data.leaderId,
              ministry_id: id,
              role: "leader" as const,
            });
          if (leaderError) throw leaderError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar ministério",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ministries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir ministério",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    ministries: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addMinistry: addMutation.mutateAsync,
    updateMinistry: updateMutation.mutateAsync,
    deleteMinistry: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useMinistryById = (id: string | undefined) => {
  const { ministries } = useMinistries();
  return ministries.find((m) => m.id === id);
};
