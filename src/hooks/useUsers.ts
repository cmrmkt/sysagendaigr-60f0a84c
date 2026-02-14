import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type MinistryRole = "leader" | "member";

export interface UserMinistryAssociation {
  ministryId: string;
  role: MinistryRole;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  phone_country: string;
  role: "admin" | "leader" | "viewer";
  canCreateEvents: boolean;
  ministryAssociations: UserMinistryAssociation[];
  isVolunteer: boolean;
  organization_id: string;
  avatar_url?: string;
}

// Helper function to get ministry IDs from associations (for backward compatibility)
export const getMinistryIds = (user: User): string[] => {
  return user.ministryAssociations.map((assoc) => assoc.ministryId);
};

// Helper function to check if user is part of a ministry
export const userHasMinistry = (user: User, ministryId: string): boolean => {
  return user.ministryAssociations.some((assoc) => assoc.ministryId === ministryId);
};

export interface CreateUserInput {
  name: string;
  phone: string;
  phoneCountry?: string;
  role: "admin" | "leader" | "viewer";
  canCreateEvents?: boolean;
  ministryAssociations?: UserMinistryAssociation[];
  isVolunteer?: boolean;
  email?: string;
}

export interface CreateUserResult {
  user: User;
  temporaryPassword: string;
  whatsappMessage: string;
}

export const useUsers = () => {
  const { effectiveOrganization, session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["users", effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", effectiveOrganization.id)
        .order("name");

      if (profilesError) throw profilesError;

      // Fetch roles for these users
      const userIds = profiles?.map((p) => p.id) || [];
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Fetch ministry associations with role
      const { data: userMinistries, error: ministriesError } = await supabase
        .from("user_ministries")
        .select("user_id, ministry_id, role")
        .in("user_id", userIds);

      if (ministriesError) throw ministriesError;

      // Map to User interface
      return (profiles || []).map((p) => {
        const userRole = roles?.find((r) => r.user_id === p.id);
        const ministryAssocs = userMinistries?.filter((um) => um.user_id === p.id) || [];

        return {
          id: p.id,
          name: p.name,
          email: p.email || undefined,
          phone: p.phone,
          phone_country: p.phone_country,
          role: (userRole?.role as "admin" | "leader" | "viewer") || "viewer",
          canCreateEvents: p.can_create_events ?? false,
          ministryAssociations: ministryAssocs.map((um) => ({
            ministryId: um.ministry_id,
            role: (um.role as MinistryRole) || "member",
          })),
          isVolunteer: p.is_volunteer ?? false,
          organization_id: p.organization_id,
          avatar_url: p.avatar_url || undefined,
        } as User;
      });
    },
    enabled: !!effectiveOrganization?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateUserInput): Promise<CreateUserResult> => {
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          name: input.name,
          phone: input.phone,
          phoneCountry: input.phoneCountry || "BR",
          role: input.role,
          canCreateEvents: input.canCreateEvents || false,
          ministryAssociations: input.ministryAssociations || [],
          isVolunteer: input.isVolunteer || false,
          email: input.email,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Verificar erro no response body primeiro (mensagens específicas do servidor)
      if (data?.error) {
        throw new Error(data.error);
      }
      
      // Fallback para erro genérico do cliente
      if (error) {
        throw new Error(error.message || "Erro ao criar usuário");
      }

      // Verificar se a resposta contém os dados esperados
      if (!data?.user || !data?.temporaryPassword) {
        throw new Error("Resposta inválida do servidor");
      }

      return {
        user: {
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone,
          phone_country: data.user.phoneCountry || "BR",
          role: data.user.role,
          canCreateEvents: input.canCreateEvents || false,
          ministryAssociations: input.ministryAssociations || [],
          isVolunteer: input.isVolunteer || false,
          organization_id: effectiveOrganization!.id,
        },
        temporaryPassword: data.temporaryPassword,
        whatsappMessage: data.whatsappMessage,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserInput> }) => {
      // Update profile
      const profileUpdate: Record<string, unknown> = {};
      if (data.name !== undefined) profileUpdate.name = data.name;
      if (data.email !== undefined) profileUpdate.email = data.email;
      if (data.canCreateEvents !== undefined) profileUpdate.can_create_events = data.canCreateEvents;
      if (data.isVolunteer !== undefined) profileUpdate.is_volunteer = data.isVolunteer;

      if (Object.keys(profileUpdate).length > 0) {
        const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", id);
        if (error) throw error;
      }

      // Update role if provided
      if (data.role !== undefined) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: data.role })
          .eq("user_id", id);
        if (error) throw error;
      }

      // Update ministry associations if provided
      if (data.ministryAssociations !== undefined) {
        // Delete existing
        await supabase.from("user_ministries").delete().eq("user_id", id);

        // Insert new with roles
        if (data.ministryAssociations.length > 0) {
          const { error } = await supabase.from("user_ministries").insert(
            data.ministryAssociations.map((assoc) => ({
              user_id: id,
              ministry_id: assoc.ministryId,
              role: assoc.role,
            }))
          );
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    users: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createUser: createMutation.mutateAsync,
    updateUser: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};

export const useUserById = (id: string | undefined) => {
  const { users } = useUsers();
  return users.find((u) => u.id === id);
};
