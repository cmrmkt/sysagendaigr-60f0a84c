import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
 
 // Helper to generate reminders via edge function
 const generateReminders = async (
   organizationId: string,
   resourceType: "event" | "task" | "announcement",
   resourceId: string,
   resourceTitle: string,
   dueDate?: string,
   recipientIds: string[] = []
 ) => {
   try {
     await supabase.functions.invoke("generate-reminders", {
       body: {
         organization_id: organizationId,
         resource_type: resourceType,
         resource_id: resourceId,
         resource_title: resourceTitle,
         due_date: dueDate,
         recipient_ids: recipientIds,
       },
     });
   } catch (error) {
     console.error("Error generating reminders:", error);
   }
 };

export interface Announcement {
  id: string;
  title: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  status: "published" | "draft";
  priority: "normal" | "high" | "urgent";
  publishDate: string;
  unpublishDate?: string;
  externalLink?: string;
  createdAt: string;
  createdBy?: string;
  organization_id: string;
}

export interface AnnouncementInput {
  title: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  status: "published" | "draft";
  priority: "normal" | "high" | "urgent";
  publishDate: string;
  unpublishDate?: string;
  externalLink?: string;
}

export const useAnnouncements = () => {
  const { effectiveOrganization, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["announcements", effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("organization_id", effectiveOrganization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        backgroundColor: a.background_color,
        textColor: a.text_color,
        status: a.status as "published" | "draft",
        priority: a.priority as "normal" | "high" | "urgent",
        publishDate: a.publish_date,
        unpublishDate: a.unpublish_date || undefined,
        externalLink: a.external_link || undefined,
        createdAt: a.created_at?.split("T")[0] || "",
        createdBy: a.created_by || undefined,
        organization_id: a.organization_id,
      })) as Announcement[];
    },
    enabled: !!effectiveOrganization?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (announcement: AnnouncementInput) => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: announcement.title,
          content: announcement.content,
          background_color: announcement.backgroundColor,
          text_color: announcement.textColor,
          status: announcement.status,
          priority: announcement.priority,
          publish_date: announcement.publishDate,
          unpublish_date: announcement.unpublishDate || null,
          external_link: announcement.externalLink || null,
          organization_id: effectiveOrganization.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
     onSuccess: async (data, variables) => {
       // Generate reminders for the new announcement
       // For announcements, we need to fetch all leaders in the organization
       if (effectiveOrganization?.id && data) {
         try {
           // Fetch all leaders and admins to notify
           const { data: leaders } = await supabase
             .from("user_roles")
             .select("user_id")
             .in("role", ["admin", "leader"]);
           
           const leaderIds = leaders?.map(l => l.user_id) || [];
           
           generateReminders(
             effectiveOrganization.id,
             "announcement",
             data.id,
             variables.title,
             variables.publishDate,
             leaderIds
           );
         } catch (error) {
           console.error("Error fetching leaders for announcement reminders:", error);
         }
       }
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar aviso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnnouncementInput> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.backgroundColor !== undefined) updateData.background_color = data.backgroundColor;
      if (data.textColor !== undefined) updateData.text_color = data.textColor;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.publishDate !== undefined) updateData.publish_date = data.publishDate;
      if (data.unpublishDate !== undefined) updateData.unpublish_date = data.unpublishDate || null;
      if (data.externalLink !== undefined) updateData.external_link = data.externalLink || null;

      const { error } = await supabase.from("announcements").update(updateData).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar aviso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir aviso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get published announcements (for public display)
  const getPublishedAnnouncements = () => {
    const today = new Date().toISOString().split("T")[0];
    return (query.data || [])
      .filter((a) => {
        if (a.status !== "published") return false;
        if (a.publishDate > today) return false;
        if (a.unpublishDate && a.unpublishDate < today) return false;
        return true;
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      });
  };

  return {
    announcements: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addAnnouncement: addMutation.mutateAsync,
    updateAnnouncement: updateMutation.mutateAsync,
    deleteAnnouncement: deleteMutation.mutateAsync,
    getPublishedAnnouncements,
    getAnnouncementById: (id: string) => query.data?.find((a) => a.id === id),
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
