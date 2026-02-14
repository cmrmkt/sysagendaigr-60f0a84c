import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  organization_id: string;
  amount: number;
  description: string | null;
  reference_month: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

export const useInvoices = (organizationId?: string) => {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  return useQuery({
    queryKey: ["invoices", organizationId],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          organization:organizations(id, name, slug)
        `)
        .order("due_date", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: isSuperAdmin,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, "id" | "created_at" | "updated_at" | "organization">) => {
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoice)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", variables.organization_id] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Fatura criada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao criar fatura:", error);
      toast.error("Erro ao criar fatura");
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Invoice> & { id: string }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Fatura atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Erro ao atualizar fatura:", error);
      toast.error("Erro ao atualizar fatura");
    },
  });
};

export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payment_method,
    }: {
      id: string;
      payment_method?: string;
    }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: payment_method || "manual",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Fatura marcada como paga");
    },
    onError: (error) => {
      console.error("Erro ao marcar fatura como paga:", error);
      toast.error("Erro ao marcar fatura como paga");
    },
  });
};

export const useCancelInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Fatura cancelada");
    },
    onError: (error) => {
      console.error("Erro ao cancelar fatura:", error);
      toast.error("Erro ao cancelar fatura");
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Fatura excluída");
    },
    onError: (error) => {
      console.error("Erro ao excluir fatura:", error);
      toast.error("Erro ao excluir fatura");
    },
  });
};
