import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
 
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

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  assigneeId?: string;
  dueDate?: string;
}

export interface TaskChecklist {
  id: string;
  title: string;
  items: TaskChecklistItem[];
  order: number;
}

export interface EventTask {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  ministryId?: string;
  priority: TaskPriority;
  dueDate?: string;
  startDate?: string;
  order: number;
  createdAt: string;
  assigneeIds: string[];
  checklists?: TaskChecklist[];
  labelIds?: string[];
  isArchived?: boolean;
  organization_id: string;
}

export interface TaskInput {
  eventId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  ministryId?: string;
  priority?: TaskPriority;
  dueDate?: string;
  startDate?: string;
  order?: number;
  assigneeIds?: string[];
  checklists?: TaskChecklist[];
  labelIds?: string[];
}

export const useEventTasks = () => {
  const { effectiveOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["eventTasks", effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];

      const { data, error } = await supabase
        .from("event_tasks")
        .select("*")
        .eq("organization_id", effectiveOrganization.id)
        .order("task_order", { ascending: true });

      if (error) throw error;

      return (data || []).map((t) => ({
        id: t.id,
        eventId: t.event_id,
        title: t.title,
        description: t.description || undefined,
        status: t.status as TaskStatus,
        ministryId: t.ministry_id || undefined,
        priority: t.priority as TaskPriority,
        dueDate: t.due_date || undefined,
        startDate: t.start_date || undefined,
        order: t.task_order,
        createdAt: t.created_at?.split("T")[0] || "",
        assigneeIds: t.assignee_ids || [],
        checklists: (t.checklists as unknown as TaskChecklist[]) || [],
        labelIds: t.label_ids || [],
        isArchived: t.is_archived ?? false,
        organization_id: t.organization_id,
      })) as EventTask[];
    },
    enabled: !!effectiveOrganization?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (task: TaskInput) => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const insertData = {
        event_id: task.eventId,
        title: task.title,
        description: task.description || null,
        status: task.status || "todo",
        ministry_id: task.ministryId || null,
        priority: task.priority || "medium",
        due_date: task.dueDate || null,
        start_date: task.startDate || null,
        task_order: task.order ?? 0,
        assignee_ids: task.assigneeIds || [],
        checklists: (task.checklists || []) as unknown as Json,
        label_ids: task.labelIds || [],
        organization_id: effectiveOrganization.id,
      };

      const { data, error } = await supabase
        .from("event_tasks")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
     onSuccess: (data, variables) => {
       // Generate reminders for the new task
       if (effectiveOrganization?.id && data) {
         generateReminders(
           effectiveOrganization.id,
           "task",
           data.id,
           variables.title,
           variables.dueDate,
           variables.assigneeIds || []
         );
       }
      queryClient.invalidateQueries({ queryKey: ["eventTasks"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskInput & { isArchived?: boolean }> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.ministryId !== undefined) updateData.ministry_id = data.ministryId || null;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null;
      if (data.startDate !== undefined) updateData.start_date = data.startDate || null;
      if (data.order !== undefined) updateData.task_order = data.order;
      if (data.assigneeIds !== undefined) updateData.assignee_ids = data.assigneeIds;
      if (data.checklists !== undefined) updateData.checklists = data.checklists;
      if (data.labelIds !== undefined) updateData.label_ids = data.labelIds;
      if (data.isArchived !== undefined) updateData.is_archived = data.isArchived;

      const { error } = await supabase.from("event_tasks").update(updateData).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventTasks"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventTasks"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveTask = async (taskId: string, newStatus: TaskStatus, newOrder: number) => {
    await updateMutation.mutateAsync({
      id: taskId,
      data: { status: newStatus, order: newOrder },
    });
  };

  const getTasksByEventId = (eventId: string) => {
    return (query.data || [])
      .filter((t) => t.eventId === eventId && !t.isArchived)
      .sort((a, b) => a.order - b.order);
  };

  const getTaskById = (id: string) => query.data?.find((t) => t.id === id);

  // Checklist operations
  const addChecklist = async (taskId: string, title?: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const existingChecklists = task.checklists || [];
    const newNumber = existingChecklists.length + 1;
    const newChecklist: TaskChecklist = {
      id: `checklist-${Date.now()}`,
      title: title || `CHECKLIST (${newNumber})`,
      items: [],
      order: existingChecklists.length,
    };

    await updateMutation.mutateAsync({
      id: taskId,
      data: { checklists: [...existingChecklists, newChecklist] },
    });
  };

  const updateChecklistTitle = async (taskId: string, checklistId: string, title: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const updatedChecklists = task.checklists?.map((c) =>
      c.id === checklistId ? { ...c, title } : c
    );

    await updateMutation.mutateAsync({
      id: taskId,
      data: { checklists: updatedChecklists },
    });
  };

  const deleteChecklist = async (taskId: string, checklistId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const updatedChecklists = task.checklists?.filter((c) => c.id !== checklistId);

    await updateMutation.mutateAsync({
      id: taskId,
      data: { checklists: updatedChecklists },
    });
  };

  const addChecklistItem = async (
    taskId: string,
    checklistId: string,
    title: string,
    assigneeId?: string,
    dueDate?: string
  ) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const updatedChecklists = task.checklists?.map((c) => {
      if (c.id !== checklistId) return c;
      const newItem: TaskChecklistItem = {
        id: `item-${Date.now()}`,
        title,
        isCompleted: false,
        order: c.items.length,
        assigneeId,
        dueDate,
      };
      return { ...c, items: [...c.items, newItem] };
    });

    await updateMutation.mutateAsync({
      id: taskId,
      data: { checklists: updatedChecklists },
    });
  };

  const toggleChecklistItem = async (taskId: string, checklistId: string, itemId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const updatedChecklists = task.checklists?.map((c) => {
      if (c.id !== checklistId) return c;
      return {
        ...c,
        items: c.items.map((item) =>
          item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
        ),
      };
    });

    await updateMutation.mutateAsync({
      id: taskId,
      data: { checklists: updatedChecklists },
    });
  };

  const deleteChecklistItem = async (taskId: string, checklistId: string, itemId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const updatedChecklists = task.checklists?.map((c) => {
      if (c.id !== checklistId) return c;
      return { ...c, items: c.items.filter((item) => item.id !== itemId) };
    });

    await updateMutation.mutateAsync({
      id: taskId,
      data: { checklists: updatedChecklists },
    });
  };

  const reorderChecklistItems = async (taskId: string, checklistId: string, itemIds: string[]) => {
    const task = getTaskById(taskId);
    if (!task) return;

    const updatedChecklists = task.checklists?.map((c) => {
      if (c.id !== checklistId) return c;
      const reorderedItems = itemIds
        .map((id, index) => {
          const item = c.items.find((i) => i.id === id);
          return item ? { ...item, order: index } : null;
        })
        .filter(Boolean) as TaskChecklistItem[];
      return { ...c, items: reorderedItems };
    });

    await updateMutation.mutateAsync({
      id: taskId,
      data: { checklists: updatedChecklists },
    });
  };

  return {
    eventTasks: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addTask: addMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    moveTask,
    getTasksByEventId,
    getTaskById,
    addChecklist,
    updateChecklistTitle,
    deleteChecklist,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
