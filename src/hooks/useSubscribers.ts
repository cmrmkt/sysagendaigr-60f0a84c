import { useMemo } from "react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { format, startOfMonth, addMonths, isBefore, isAfter, parseISO } from "date-fns";

export interface SubscriberWithPayments {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  billing_day: number;
  subscription_amount: number;
  subscription_status: string;
  trial_ends_at: string | null;
  status: string;
  invoices_by_month: Record<string, Invoice | null>;
  has_overdue: boolean;
  has_pending: boolean;
  total_paid: number;
  total_pending: number;
}

export const useSubscribers = (year: number = new Date().getFullYear()) => {
  const { data: organizations, isLoading: orgsLoading } = useOrganizations();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();

  const subscribers = useMemo(() => {
    if (!organizations || !invoices) return [];

    // Generate months for the year
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, i, 1);
      months.push(format(date, "yyyy-MM"));
    }

    return organizations
      .filter((org) => org.status !== "cancelled")
      .map((org) => {
        // Get all invoices for this organization
        const orgInvoices = invoices.filter((inv) => inv.organization_id === org.id);

        // Create a map of invoices by month
        const invoices_by_month: Record<string, Invoice | null> = {};
        months.forEach((month) => {
          const invoice = orgInvoices.find((inv) => {
            const refMonth = format(parseISO(inv.reference_month), "yyyy-MM");
            return refMonth === month;
          });
          invoices_by_month[month] = invoice || null;
        });

        // Calculate stats
        const has_overdue = orgInvoices.some((inv) => inv.status === "overdue");
        const has_pending = orgInvoices.some((inv) => inv.status === "pending");
        const total_paid = orgInvoices
          .filter((inv) => inv.status === "paid")
          .reduce((sum, inv) => sum + Number(inv.amount), 0);
        const total_pending = orgInvoices
          .filter((inv) => inv.status === "pending" || inv.status === "overdue")
          .reduce((sum, inv) => sum + Number(inv.amount), 0);

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          created_at: org.created_at || "",
          billing_day: org.billing_day || 10,
          subscription_amount: org.subscription_amount || 99.9,
          subscription_status: org.subscription_status,
          trial_ends_at: org.trial_ends_at || null,
          status: org.status,
          invoices_by_month,
          has_overdue,
          has_pending,
          total_paid,
          total_pending,
        } as SubscriberWithPayments;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [organizations, invoices, year]);

  const months = useMemo(() => {
    const result: { key: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, i, 1);
      result.push({
        key: format(date, "yyyy-MM"),
        label: format(date, "MMM", { locale: undefined }).toUpperCase(),
      });
    }
    return result;
  }, [year]);

  return {
    subscribers,
    months,
    isLoading: orgsLoading || invoicesLoading,
  };
};
