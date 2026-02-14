import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import type { Event, EventTask } from "@/contexts/DataContext";

/**
 * Hook to check user permissions for events based on involvement.
 * 
 * Permission Logic:
 * - Admins/Super Admins: Can edit/delete everything
 * - Leaders/Members: Can edit events/tasks only when involved
 * - Viewers: Read-only (no edit/delete)
 * 
 * A user is "involved" in an event if:
 * 1. User is in the responsible ministry
 * 2. User is in a collaborator ministry
 * 3. User is assigned to a task in the event
 */
export const useEventPermissions = () => {
  const { user, role } = useAuth();
  const { users, getTasksByEventId } = useData();

  const isAdmin = role === "admin" || role === "super_admin";
  const isViewer = role === "viewer";

  // Get current user's ministry IDs
  const userMinistryIds = useMemo(() => {
    if (!user) return [];
    const currentUser = users.find(u => u.id === user.id);
    return currentUser?.ministryAssociations?.map(a => a.ministryId) || [];
  }, [user, users]);

  /**
   * Check if user is involved in an event
   */
  const isUserInvolvedInEvent = useMemo(() => {
    return (event: Event | null | undefined): boolean => {
      if (!event || !user) return false;

      // 1. User is in the responsible ministry
      if (event.ministryId && userMinistryIds.includes(event.ministryId)) {
        return true;
      }

      // 2. User is in a collaborator ministry
      const collaboratorIds = event.collaboratorMinistryIds || [];
      if (collaboratorIds.some(id => userMinistryIds.includes(id))) {
        return true;
      }

      // 3. User is assigned to a task in this event
      const eventTasks = getTasksByEventId(event.id);
      const isAssignedToTask = eventTasks.some(task => 
        task.assigneeIds?.includes(user.id)
      );
      if (isAssignedToTask) {
        return true;
      }

      return false;
    };
  }, [user, userMinistryIds, getTasksByEventId]);

  /**
   * Check if user can edit a specific event
   */
  const canEditEvent = useMemo(() => {
    return (event: Event | null | undefined): boolean => {
      if (!event || !user) return false;
      if (isViewer) return false;
      if (isAdmin) return true;
      return isUserInvolvedInEvent(event);
    };
  }, [user, isAdmin, isViewer, isUserInvolvedInEvent]);

  /**
   * Check if user can delete a specific event
   * Only admins can delete events (to prevent accidental deletions)
   */
  const canDeleteEvent = useMemo(() => {
    return (event: Event | null | undefined): boolean => {
      if (!event || !user) return false;
      return isAdmin;
    };
  }, [user, isAdmin]);

  /**
   * Check if user can manage tasks for a specific event
   */
  const canManageEventTasks = useMemo(() => {
    return (event: Event | null | undefined): boolean => {
      if (!event || !user) return false;
      if (isViewer) return false;
      if (isAdmin) return true;
      return isUserInvolvedInEvent(event);
    };
  }, [user, isAdmin, isViewer, isUserInvolvedInEvent]);

  /**
   * Check if user can edit a specific task
   * (based on involvement with the parent event)
   */
  const canEditTask = useMemo(() => {
    return (task: EventTask | null | undefined, event: Event | null | undefined): boolean => {
      if (!task || !event || !user) return false;
      if (isViewer) return false;
      if (isAdmin) return true;
      
      // User can edit if involved with the event
      if (isUserInvolvedInEvent(event)) return true;
      
      // User can also edit if they are assigned to this specific task
      if (task.assigneeIds?.includes(user.id)) return true;
      
      return false;
    };
  }, [user, isAdmin, isViewer, isUserInvolvedInEvent]);

  return {
    isAdmin,
    isViewer,
    userMinistryIds,
    isUserInvolvedInEvent,
    canEditEvent,
    canDeleteEvent,
    canManageEventTasks,
    canEditTask,
  };
};
