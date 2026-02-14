import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OrganizationWithStats {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  country_code: string;
  tax_id: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  status: string;
  subscription_status: string;
  subscription_amount: number | null;
  billing_day: number | null;
  trial_ends_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Stats
  users_count?: number;
  events_count?: number;
  pending_invoices?: number;
  overdue_invoices?: number;
  last_activity_at?: string | null;
}

export const useOrganizations = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  return useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      // Buscar organizações
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Para cada org, buscar contagens
      const orgsWithStats: OrganizationWithStats[] = await Promise.all(
        (orgs || []).map(async (org) => {
          // Contar usuários
          const { count: usersCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          // Contar eventos
          const { count: eventsCount } = await supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id);

          // Contar faturas pendentes
          const { count: pendingCount } = await supabase
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id)
            .eq("status", "pending");

          // Contar faturas vencidas
          const { count: overdueCount } = await supabase
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id)
            .eq("status", "overdue");

          // Último acesso (log mais recente)
          const { data: lastLog } = await supabase
            .from("usage_logs")
            .select("created_at")
            .eq("organization_id", org.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...org,
            users_count: usersCount || 0,
            events_count: eventsCount || 0,
            pending_invoices: pendingCount || 0,
            overdue_invoices: overdueCount || 0,
            last_activity_at: lastLog?.created_at || null,
          } as OrganizationWithStats;
        })
      );

      return orgsWithStats;
    },
    enabled: isSuperAdmin,
  });
};

export const useOrganization = (orgId: string | undefined) => {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  return useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();

      if (error) throw error;
      return data as OrganizationWithStats | null;
    },
    enabled: isSuperAdmin && !!orgId,
  });
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<OrganizationWithStats, "id" | "created_at" | "updated_at" | "users_count" | "events_count" | "pending_invoices" | "overdue_invoices" | "trial_ends_at" | "suspended_at" | "suspended_reason" | "logo_url">) => {
      const { data: newOrg, error } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          slug: data.slug,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          country_code: data.country_code,
          status: data.status,
          subscription_status: data.subscription_status,
          subscription_amount: data.subscription_amount,
          billing_day: data.billing_day,
        })
        .select()
        .single();

      if (error) throw error;
      return newOrg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organização criada com sucesso");
    },
    onError: (error: any) => {
      console.error("Erro ao criar organização:", error);
      if (error?.code === "23505") {
        toast.error("Já existe uma organização com este slug");
      } else {
        toast.error("Erro ao criar organização");
      }
    },
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<OrganizationWithStats> & { id: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", variables.id] });
      toast.success("Organização atualizada com sucesso");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar organização:", error);
      if (error?.code === "23505") {
        toast.error("Já existe uma organização com este slug");
      } else {
        toast.error("Erro ao atualizar organização");
      }
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organização excluída com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao excluir organização:", error);
      toast.error("Erro ao excluir organização. Verifique se não há dados vinculados.");
    },
  });
};

export const useSuspendOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      suspend,
      reason,
    }: {
      id: string;
      suspend: boolean;
      reason?: string;
    }) => {
      const updates = suspend
        ? {
            status: "suspended",
            suspended_at: new Date().toISOString(),
            suspended_reason: reason || "Suspensão administrativa",
          }
        : {
            status: "active",
            suspended_at: null,
            suspended_reason: null,
          };

      const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", variables.id] });
      toast.success(
        variables.suspend
          ? "Organização suspensa com sucesso"
          : "Organização reativada com sucesso"
      );
    },
    onError: (error) => {
      console.error("Erro ao alterar status da organização:", error);
      toast.error("Erro ao alterar status da organização");
    },
  });
};

export const useApproveOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({
          status: "active",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", variables.id] });
      toast.success("Organização aprovada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao aprovar organização:", error);
      toast.error("Erro ao aprovar organização");
    },
  });
};
