import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, parseISO, startOfDay } from "date-fns";

export interface InvoiceAlert {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  reference_month: string;
  type: "near_due" | "overdue";
  days_until_due: number;
}

export const useInvoiceAlerts = () => {
  const { organization, role } = useAuth();

  const isOrgAdmin = role === "admin";
  const orgId = organization?.id;

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["invoice-alerts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, amount, due_date, status, reference_month")
        .eq("organization_id", orgId!)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true });

      if (error) throw error;

      const today = startOfDay(new Date());

      return (data || []).reduce<InvoiceAlert[]>((acc, invoice) => {
        const dueDate = startOfDay(parseISO(invoice.due_date));
        const daysUntilDue = differenceInDays(dueDate, today);

        if (daysUntilDue < 0 || invoice.status === "overdue") {
          acc.push({ ...invoice, type: "overdue", days_until_due: daysUntilDue });
        } else if (daysUntilDue <= 2) {
          acc.push({ ...invoice, type: "near_due", days_until_due: daysUntilDue });
        }
        return acc;
      }, []);
    },
    enabled: isOrgAdmin && !!orgId,
    refetchInterval: 5 * 60 * 1000, // 5 min
  });

  // Prioritize: overdue first, then near_due, sorted by due_date ascending
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.type === "overdue" && b.type !== "overdue") return -1;
    if (a.type !== "overdue" && b.type === "overdue") return 1;
    return a.days_until_due - b.days_until_due;
  });

  return {
    alerts: sortedAlerts,
    mostUrgent: sortedAlerts[0] || null,
    hasAlerts: sortedAlerts.length > 0,
    isLoading,
  };
};
