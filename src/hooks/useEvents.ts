import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import type { Json } from "@/integrations/supabase/types";
import type { DelayConfig, RepeatConfig } from "@/hooks/useReminderSettings";
 
 // Helper to generate reminders via edge function
const generateReminders = async (
  organizationId: string,
  resourceType: "event" | "task" | "announcement",
  resourceId: string,
  resourceTitle: string,
  dueDate?: string,
  recipientIds: string[] = [],
  customReminderTemplates?: Record<string, unknown>
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
        custom_reminder_templates: customReminderTemplates || undefined,
      },
    });
  } catch (error) {
    console.error("Error generating reminders:", error);
  }
};

export interface RecurrenceConfig {
  type: "none" | "daily" | "weekly" | "monthly" | "yearly" | "weekday";
  interval: number;
  endType: "never" | "after" | "on";
  endAfterOccurrences?: number;
  endOnDate?: string;
  weekday?: number; // 0-6 (Domingo-Sábado)
}

export interface EventMember {
  id: string;
  name: string;
  phone: string;
}

export interface EventMessageTemplate {
  title: string;
  body: string;
  delay?: DelayConfig;
  repeat?: RepeatConfig;
  reference_date?: string;
  enabled?: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  ministryId?: string;
  responsibleId?: string;
  responsibleIds?: string[];
  collaboratorMinistryIds?: string[];
  volunteerIds?: string[];
  members?: EventMember[];
  observations?: string;
  reminder?: string;
  endDate?: string;
  location?: string;
  isAllDay?: boolean;
  visibility?: "public" | "private";
  recurrence?: RecurrenceConfig;
  parentEventId?: string;
  customColor?: string;
  customMessageTemplate?: EventMessageTemplate;
  customReminderTemplates?: Record<string, EventMessageTemplate>;
  organization_id: string;
}

export interface EventInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  ministryId?: string;
  responsibleId?: string;
  responsibleIds?: string[];
  collaboratorMinistryIds?: string[];
  volunteerIds?: string[];
  members?: EventMember[];
  observations?: string;
  reminder?: string;
  endDate?: string;
  location?: string;
  isAllDay?: boolean;
  visibility?: "public" | "private";
  recurrence?: RecurrenceConfig;
  customColor?: string;
  customMessageTemplate?: EventMessageTemplate;
  customReminderTemplates?: Record<string, EventMessageTemplate>;
}

// Helper function to parse date string as local date at noon (avoids UTC and DST issues)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Set to noon to avoid DST boundary issues
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

// Function to generate recurring events
const generateRecurringEvents = (
  baseEvent: EventInput,
  parentId: string,
  recurrence: RecurrenceConfig
): EventInput[] => {
  const generatedEvents: EventInput[] = [];
  // Use local date parsing to avoid timezone issues
  const startDate = parseLocalDate(baseEvent.date);
  
  // Determine the maximum number of iterations based on endType
  // For "after": use endAfterOccurrences (includes original event, so generate n-1 more)
  // For "on" or "never": use a high limit (365 to prevent infinite loops) and rely on date check
  let maxIterations: number;
  if (recurrence.endType === "after") {
    maxIterations = recurrence.endAfterOccurrences || 12;
  } else {
    // For "on" (specific date) or "never", allow up to 365 occurrences
    maxIterations = 365;
  }

  for (let i = 1; i < maxIterations; i++) {
    let nextDate: Date;

    switch (recurrence.type) {
      case "daily":
        nextDate = addDays(startDate, i * recurrence.interval);
        break;
      case "weekly":
      case "weekday":
        // "weekday" funciona como "weekly" com intervalo de 1 semana
        nextDate = addWeeks(startDate, i * recurrence.interval);
        break;
      case "monthly":
        nextDate = addMonths(startDate, i * recurrence.interval);
        break;
      case "yearly":
        nextDate = addYears(startDate, i * recurrence.interval);
        break;
      default:
        continue;
    }

    // Normalize to noon to avoid any DST edge cases
    nextDate.setHours(12, 0, 0, 0);

    // Check end conditions - use local date parsing for end date too
    if (recurrence.endType === "on" && recurrence.endOnDate) {
      const endDate = parseLocalDate(recurrence.endOnDate);
      endDate.setHours(23, 59, 59, 999);
      if (nextDate > endDate) break;
    }
    
    // For "never" endType, limit to 1 year from start date to prevent excessive records
    if (recurrence.endType === "never") {
      const sixMonthsFromStart = addMonths(startDate, 6);
      if (nextDate > sixMonthsFromStart) break;
    }

    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;

    generatedEvents.push({
      ...baseEvent,
      date: dateStr,
      recurrence: undefined,
    });
  }

  return generatedEvents;
};

export const useEvents = () => {
  const { effectiveOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["events", effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return [];

      // Fetch events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("organization_id", effectiveOrganization.id)
        .order("date", { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch collaborator ministries
      const eventIds = events?.map((e) => e.id) || [];
      const { data: collaboratorMinistries } = await supabase
        .from("event_collaborator_ministries")
        .select("*")
        .in("event_id", eventIds);

      // Fetch volunteers
      const { data: volunteers } = await supabase
        .from("event_volunteers")
        .select("*")
        .in("event_id", eventIds);

      return (events || []).map((e) => {
        const eventCollabMinistries = collaboratorMinistries?.filter((c) => c.event_id === e.id) || [];
        const eventVols = volunteers?.filter((v) => v.event_id === e.id) || [];

        return {
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.start_time,
          endTime: e.end_time,
          ministryId: e.ministry_id || undefined,
          responsibleId: e.responsible_id || undefined,
          observations: e.observations || undefined,
          reminder: e.reminder || "none",
          endDate: e.end_date || undefined,
          location: e.location || undefined,
          isAllDay: e.is_all_day ?? false,
          visibility: (e.visibility as "public" | "private") || "public",
          recurrence: e.recurrence as unknown as RecurrenceConfig | undefined,
          parentEventId: e.parent_event_id || undefined,
          customColor: e.custom_color || undefined,
          customMessageTemplate: e.custom_message_template as unknown as EventMessageTemplate | undefined,
          customReminderTemplates: e.custom_reminder_templates as unknown as Record<string, EventMessageTemplate> | undefined,
          collaboratorMinistryIds: eventCollabMinistries.map((c) => c.ministry_id),
          volunteerIds: eventVols.map((v) => v.user_id),
        } as Event;
      });
    },
    enabled: !!effectiveOrganization?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (event: EventInput) => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      // Insert main event
      const insertData = {
        title: event.title,
        date: event.date,
        start_time: event.startTime,
        end_time: event.endTime,
        ministry_id: event.ministryId || null,
        responsible_id: event.responsibleId || null,
        observations: event.observations || null,
        reminder: event.reminder || "none",
        end_date: event.endDate || null,
        location: event.location || null,
        is_all_day: event.isAllDay || false,
        visibility: event.visibility || "public",
        recurrence: (event.recurrence || null) as unknown as Json,
        custom_color: event.customColor || null,
        custom_message_template: (event.customMessageTemplate || null) as unknown as Json,
        custom_reminder_templates: (event.customReminderTemplates || null) as unknown as Json,
        organization_id: effectiveOrganization.id,
      };

      const { data: newEvent, error } = await supabase
        .from("events")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Insert collaborator ministries
      if (event.collaboratorMinistryIds?.length) {
        await supabase.from("event_collaborator_ministries").insert(
          event.collaboratorMinistryIds.map((ministryId) => ({
            event_id: newEvent.id,
            ministry_id: ministryId,
          }))
        );
      }

      // Insert volunteers
      if (event.volunteerIds?.length) {
        await supabase.from("event_volunteers").insert(
          event.volunteerIds.map((userId) => ({
            event_id: newEvent.id,
            user_id: userId,
          }))
        );
      }

      // Generate recurring events if needed
      if (event.recurrence && event.recurrence.type !== "none") {
        const recurringEvents = generateRecurringEvents(event, newEvent.id, event.recurrence);
        
        for (const recEvent of recurringEvents) {
          await supabase.from("events").insert({
            title: recEvent.title,
            date: recEvent.date,
            start_time: recEvent.startTime,
            end_time: recEvent.endTime,
            ministry_id: recEvent.ministryId || null,
            responsible_id: recEvent.responsibleId || null,
            observations: recEvent.observations || null,
            reminder: recEvent.reminder || "none",
            end_date: recEvent.date,
            location: recEvent.location || null,
            is_all_day: recEvent.isAllDay || false,
            visibility: recEvent.visibility || "public",
            parent_event_id: newEvent.id,
            custom_color: recEvent.customColor || null,
            organization_id: effectiveOrganization.id,
          });
        }
      }

      return newEvent;
    },
     onSuccess: async (data, variables) => {
       // Generate reminders for the new event
       if (effectiveOrganization?.id && data) {
         const recipientSet = new Set<string>();
         if (variables.responsibleId) recipientSet.add(variables.responsibleId);
         if (variables.volunteerIds) variables.volunteerIds.forEach(id => recipientSet.add(id));
         
         // Fetch leaders from responsible ministry and collaborator ministries
         const ministryIds: string[] = [];
         if (variables.ministryId && variables.ministryId !== "none") {
           ministryIds.push(variables.ministryId);
         }
         if (variables.collaboratorMinistryIds?.length) {
           variables.collaboratorMinistryIds.forEach(mid => {
             if (!ministryIds.includes(mid)) ministryIds.push(mid);
           });
         }
         
         if (ministryIds.length > 0) {
           try {
             const { data: leaders } = await supabase
               .from("user_ministries")
               .select("user_id")
               .eq("role", "leader")
               .in("ministry_id", ministryIds);
             
             if (leaders) {
               leaders.forEach(l => recipientSet.add(l.user_id));
             }
           } catch (err) {
             console.error("Error fetching ministry leaders for reminders:", err);
           }
         }
         
         generateReminders(
           effectiveOrganization.id,
           "event",
           data.id,
           variables.title,
           variables.date,
           Array.from(recipientSet),
           variables.customReminderTemplates as Record<string, unknown> | undefined
         );
       }
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, regenerateSeries }: { id: string; data: Partial<EventInput>; regenerateSeries?: boolean }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.startTime !== undefined) updateData.start_time = data.startTime;
      if (data.endTime !== undefined) updateData.end_time = data.endTime;
      if (data.ministryId !== undefined) updateData.ministry_id = data.ministryId || null;
      if (data.responsibleId !== undefined) updateData.responsible_id = data.responsibleId || null;
      if (data.observations !== undefined) updateData.observations = data.observations || null;
      if (data.reminder !== undefined) updateData.reminder = data.reminder;
      if (data.endDate !== undefined) updateData.end_date = data.endDate || null;
      if (data.location !== undefined) updateData.location = data.location || null;
      if (data.isAllDay !== undefined) updateData.is_all_day = data.isAllDay;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;
      if (data.customColor !== undefined) updateData.custom_color = data.customColor || null;
      if (data.customMessageTemplate !== undefined) updateData.custom_message_template = (data.customMessageTemplate || null) as unknown as Json;
      if (data.customReminderTemplates !== undefined) updateData.custom_reminder_templates = (data.customReminderTemplates || null) as unknown as Json;
      if (data.recurrence !== undefined) updateData.recurrence = (data.recurrence || null) as unknown as Json;

      const { error } = await supabase.from("events").update(updateData).eq("id", id);

      if (error) throw error;

      // Update collaborator ministries if provided
      if (data.collaboratorMinistryIds !== undefined) {
        await supabase.from("event_collaborator_ministries").delete().eq("event_id", id);
        if (data.collaboratorMinistryIds.length > 0) {
          await supabase.from("event_collaborator_ministries").insert(
            data.collaboratorMinistryIds.map((ministryId) => ({
              event_id: id,
              ministry_id: ministryId,
            }))
          );
        }
      }

      // Update volunteers if provided
      if (data.volunteerIds !== undefined) {
        await supabase.from("event_volunteers").delete().eq("event_id", id);
        if (data.volunteerIds.length > 0) {
          await supabase.from("event_volunteers").insert(
            data.volunteerIds.map((userId) => ({
              event_id: id,
              user_id: userId,
            }))
          );
        }
      }

      // Regenerate recurring events if requested and recurrence is set
      if (regenerateSeries && data.recurrence && data.recurrence.type !== "none") {
        // Fetch updated event data
        const { data: updatedEvent } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .single();

        if (updatedEvent) {
          // Delete existing child events
          await supabase.from("events").delete().eq("parent_event_id", id);

          // Build base event for generation
          const baseEvent: EventInput = {
            title: updatedEvent.title,
            date: updatedEvent.date,
            startTime: updatedEvent.start_time,
            endTime: updatedEvent.end_time,
            ministryId: updatedEvent.ministry_id || undefined,
            responsibleId: updatedEvent.responsible_id || undefined,
            observations: updatedEvent.observations || undefined,
            reminder: (updatedEvent.reminder as "none" | "1h" | "1d") || "none",
            endDate: updatedEvent.end_date || undefined,
            location: updatedEvent.location || undefined,
            isAllDay: updatedEvent.is_all_day ?? false,
            visibility: (updatedEvent.visibility as "public" | "private") || "public",
            customColor: updatedEvent.custom_color || undefined,
          };

          const recurringEvents = generateRecurringEvents(baseEvent, id, data.recurrence);

          // Insert new child events with collaborators and volunteers
          for (const recEvent of recurringEvents) {
            const { data: newChild, error: insertError } = await supabase
              .from("events")
              .insert({
                title: recEvent.title,
                date: recEvent.date,
                start_time: recEvent.startTime,
                end_time: recEvent.endTime,
                ministry_id: recEvent.ministryId || null,
                responsible_id: recEvent.responsibleId || null,
                observations: recEvent.observations || null,
                reminder: recEvent.reminder || "none",
            end_date: recEvent.date,
                location: recEvent.location || null,
                is_all_day: recEvent.isAllDay || false,
                visibility: recEvent.visibility || "public",
                parent_event_id: id,
                custom_color: recEvent.customColor || null,
                organization_id: updatedEvent.organization_id,
              })
              .select()
              .single();

            if (!insertError && newChild) {
              // Copy collaborator ministries to child event
              if (data.collaboratorMinistryIds && data.collaboratorMinistryIds.length > 0) {
                await supabase.from("event_collaborator_ministries").insert(
                  data.collaboratorMinistryIds.map((ministryId) => ({
                    event_id: newChild.id,
                    ministry_id: ministryId,
                  }))
                );
              }

              // Copy volunteers to child event
              if (data.volunteerIds && data.volunteerIds.length > 0) {
                await supabase.from("event_volunteers").insert(
                  data.volunteerIds.map((userId) => ({
                    event_id: newChild.id,
                    user_id: userId,
                  }))
                );
              }
            }
          }
        }
      }
    },
    onSuccess: async (_result, variables) => {
      // Regenerate reminders for the updated event
      if (effectiveOrganization?.id) {
        try {
          const { data: updatedEvt } = await supabase
            .from("events")
            .select("*")
            .eq("id", variables.id)
            .single();

          if (updatedEvt) {
            const recipientSet = new Set<string>();
            if (updatedEvt.responsible_id) recipientSet.add(updatedEvt.responsible_id);

            // Collect volunteer IDs
            const { data: vols } = await supabase
              .from("event_volunteers")
              .select("user_id")
              .eq("event_id", variables.id);
            vols?.forEach(v => recipientSet.add(v.user_id));

            // Collect ministry IDs (responsible + collaborators)
            const ministryIds: string[] = [];
            if (updatedEvt.ministry_id) ministryIds.push(updatedEvt.ministry_id);
            const { data: collabMins } = await supabase
              .from("event_collaborator_ministries")
              .select("ministry_id")
              .eq("event_id", variables.id);
            collabMins?.forEach(c => {
              if (!ministryIds.includes(c.ministry_id)) ministryIds.push(c.ministry_id);
            });

            // Fetch leaders from all involved ministries
            if (ministryIds.length > 0) {
              const { data: leaders } = await supabase
                .from("user_ministries")
                .select("user_id")
                .eq("role", "leader")
                .in("ministry_id", ministryIds);
              leaders?.forEach(l => recipientSet.add(l.user_id));
            }

            await generateReminders(
              effectiveOrganization.id,
              "event",
              variables.id,
              updatedEvt.title,
              updatedEvt.date,
              Array.from(recipientSet),
              updatedEvt.custom_reminder_templates as Record<string, unknown> | undefined
            );

            // Also regenerate reminders for child events if series was regenerated
            if (variables.regenerateSeries) {
              const { data: childEvents } = await supabase
                .from("events")
                .select("id, title, date")
                .eq("parent_event_id", variables.id);

              if (childEvents) {
                for (const child of childEvents) {
                  // Child events share the same recipients
                  await generateReminders(
                    effectiveOrganization.id,
                    "event",
                    child.id,
                    child.title,
                    child.date,
                    Array.from(recipientSet)
                  );
                }
              }
            }
          }
        } catch (err) {
          console.error("Error regenerating reminders on event update:", err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["eventTasks"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: async (parentId: string) => {
      // Delete all child events first
      await supabase.from("events").delete().eq("parent_event_id", parentId);
      // Delete parent
      const { error } = await supabase.from("events").delete().eq("id", parentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["eventTasks"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir série",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSeriesMutation = useMutation({
    mutationFn: async ({ parentId, data }: { parentId: string; data: Partial<EventInput> }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.startTime !== undefined) updateData.start_time = data.startTime;
      if (data.endTime !== undefined) updateData.end_time = data.endTime;
      if (data.ministryId !== undefined) updateData.ministry_id = data.ministryId || null;
      if (data.responsibleId !== undefined) updateData.responsible_id = data.responsibleId || null;
      if (data.observations !== undefined) updateData.observations = data.observations || null;
      if (data.location !== undefined) updateData.location = data.location || null;
      if (data.visibility !== undefined) updateData.visibility = data.visibility;

      // Update parent
      await supabase.from("events").update(updateData).eq("id", parentId);
      // Update children
      await supabase.from("events").update(updateData).eq("parent_event_id", parentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar série",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addEvent: addMutation.mutateAsync,
    updateEvent: updateMutation.mutateAsync,
    deleteEvent: deleteMutation.mutateAsync,
    updateEventSeries: updateSeriesMutation.mutateAsync,
    deleteEventSeries: deleteSeriesMutation.mutateAsync,
    getEventById: (id: string) => query.data?.find((e) => e.id === id),
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
