import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationLog {
  id: string;
  recipient_id: string;
  recipient_name: string | null;
  title: string;
  body: string;
  tag: string | null;
  data: Record<string, unknown>;
  status: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export function useNotificationLogs() {
  return useQuery({
    queryKey: ["notification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as NotificationLog[];
    },
  });
}
