import { useState } from "react";
import { format, parseISO, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
} from "lucide-react";
import { useSubscribers } from "@/hooks/useSubscribers";
import { useMarkInvoicePaid, useCancelInvoice, useCreateInvoice } from "@/hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import SubscriberPaymentCell from "./SubscriberPaymentCell";
import InvoiceFormModal from "./InvoiceFormModal";
import { cn } from "@/lib/utils";

interface SubscribersTabProps {
  onCreateInvoice: (data: any) => Promise<void>;
  isCreatingInvoice: boolean;
}

const SubscribersTab = ({ onCreateInvoice, isCreatingInvoice }: SubscribersTabProps) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>();

  const { subscribers, months, isLoading } = useSubscribers(year);
  const markPaid = useMarkInvoicePaid();
  const cancelInvoice = useCancelInvoice();

  // Filter subscribers
  const filteredSubscribers = subscribers.filter((sub) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "overdue") return sub.has_overdue;
    if (statusFilter === "pending") return sub.has_pending && !sub.has_overdue;
    if (statusFilter === "paid") return !sub.has_pending && !sub.has_overdue;
    if (statusFilter === "trial") return sub.subscription_status === "trial";
    return true;
  });

  // Generate year options
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  const handleGenerateInvoice = (orgId: string, month: string) => {
    setSelectedOrgId(orgId);
    setSelectedMonth(month);
    setShowInvoiceModal(true);
  };

  const handleCreateInvoice = async (data: any) => {
    await onCreateInvoice(data);
    setShowInvoiceModal(false);
    setSelectedOrgId(undefined);
    setSelectedMonth(undefined);
  };

  const getSubscriberBadge = (sub: typeof subscribers[0]) => {
    if (sub.subscription_status === "trial" && sub.trial_ends_at) {
      const daysLeft = differenceInDays(parseISO(sub.trial_ends_at), new Date());
      if (daysLeft > 0) {
        return (
          <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-600 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Trial ({daysLeft}d)
          </Badge>
        );
      }
    }
    if (sub.has_overdue) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Inadimplente
        </Badge>
      );
    }
    if (!sub.has_pending && !sub.has_overdue && sub.total_paid > 0) {
      return (
        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Em dia
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setYear((y) => y - 1)}
            disabled={year <= currentYear - 2}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold w-16 text-center">{year}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= currentYear + 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="overdue">Inadimplentes</SelectItem>
            <SelectItem value="pending">Com pendências</SelectItem>
            <SelectItem value="paid">Em dia</SelectItem>
            <SelectItem value="trial">Em período de teste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Assinante
                  </TableHead>
                  <TableHead className="min-w-[100px]">Contratação</TableHead>
                  <TableHead className="min-w-[80px]">Valor</TableHead>
                  <TableHead className="min-w-[100px]">Situação</TableHead>
                  {months.map((month) => (
                    <TableHead
                      key={month.key}
                      className="text-center min-w-[60px]"
                    >
                      {month.label}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={months.length + 5} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredSubscribers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={months.length + 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum assinante encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium truncate max-w-[150px]">
                            {sub.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.created_at
                          ? format(parseISO(sub.created_at), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {sub.subscription_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getSubscriberBadge(sub)}</TableCell>
                      {months.map((month) => {
                        // Calculate contract start month (first invoice is 30 days after, so next month)
                        const contractStartMonth = sub.created_at 
                          ? format(addMonths(parseISO(sub.created_at), 1), "yyyy-MM")
                          : month.key;
                        
                        // Find the next available month for invoice generation
                        // (first month >= contract start without an invoice)
                        const nextAvailableMonth = months.find((m) => {
                          if (m.key < contractStartMonth) return false;
                          return !sub.invoices_by_month[m.key];
                        })?.key;

                        const isNextAvailable = month.key === nextAvailableMonth;

                        return (
                          <TableCell key={month.key} className="text-center p-2">
                            <SubscriberPaymentCell
                              invoice={sub.invoices_by_month[month.key]}
                              month={month.key}
                              contractStartMonth={contractStartMonth}
                              isNextAvailable={isNextAvailable}
                              onMarkPaid={(id) => markPaid.mutate({ id })}
                              onCancel={(id) => cancelInvoice.mutate({ id })}
                              onGenerateInvoice={() =>
                                handleGenerateInvoice(sub.id, month.key)
                              }
                              isMarkingPaid={markPaid.isPending}
                              isCancelling={cancelInvoice.isPending}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateInvoice(sub.id, "")}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Fatura
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      <InvoiceFormModal
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
        onSubmit={handleCreateInvoice}
        isLoading={isCreatingInvoice}
        defaultOrganizationId={selectedOrgId}
      />
    </div>
  );
};

export default SubscribersTab;
