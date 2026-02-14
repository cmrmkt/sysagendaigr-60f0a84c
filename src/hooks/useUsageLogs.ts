import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UsageLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  user?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UseUsageLogsOptions {
  organizationId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export const useUsageLogs = (options: UseUsageLogsOptions = {}) => {
  const { role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const {
    organizationId,
    userId,
    action,
    resourceType,
    startDate,
    endDate,
    limit = 100,
  } = options;

  return useQuery({
    queryKey: [
      "usage_logs",
      organizationId,
      userId,
      action,
      resourceType,
      startDate?.toISOString(),
      endDate?.toISOString(),
      limit,
    ],
    queryFn: async () => {
      let query = supabase
        .from("usage_logs")
        .select(`
          *,
          user:profiles(id, name, avatar_url),
          organization:organizations(id, name, slug)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (action) {
        query = query.eq("action", action);
      }

      if (resourceType) {
        query = query.eq("resource_type", resourceType);
      }

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UsageLog[];
    },
    enabled: isSuperAdmin,
  });
};

export const useLogAction = () => {
  const { organization } = useAuth();

  const logAction = async (
    action: string,
    resourceType?: string,
    resourceId?: string,
    resourceName?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!organization?.id) return;

    try {
      await supabase.rpc("log_action", {
        _action: action,
        _resource_type: resourceType || null,
        _resource_id: resourceId || null,
        _resource_name: resourceName || null,
        _metadata: (metadata || {}) as unknown as Record<string, never>,
      });
    } catch (error) {
      console.error("Erro ao registrar log:", error);
    }
  };

  return { logAction };
};

// Constantes para tipos de ação
export const LOG_ACTIONS = {
  // Auth
  LOGIN: "login",
  LOGOUT: "logout",
  
  // Events
  EVENT_CREATE: "event.create",
  EVENT_UPDATE: "event.update",
  EVENT_DELETE: "event.delete",
  
  // Tasks
  TASK_CREATE: "task.create",
  TASK_UPDATE: "task.update",
  TASK_DELETE: "task.delete",
  TASK_STATUS_CHANGE: "task.status_change",
  
  // Users
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  
  // Ministries
  MINISTRY_CREATE: "ministry.create",
  MINISTRY_UPDATE: "ministry.update",
  MINISTRY_DELETE: "ministry.delete",
  
  // Announcements
  ANNOUNCEMENT_CREATE: "announcement.create",
  ANNOUNCEMENT_UPDATE: "announcement.update",
  ANNOUNCEMENT_DELETE: "announcement.delete",
  
  // Super Admin actions
  ADMIN_PASSWORD_RESET: "admin.password_reset",
} as const;

export const LOG_RESOURCE_TYPES = {
  EVENT: "event",
  TASK: "task",
  USER: "user",
  MINISTRY: "ministry",
  ANNOUNCEMENT: "announcement",
} as const;
