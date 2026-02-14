import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, AlertTriangle, Plus, X, CreditCard, Minus } from "lucide-react";
import { Invoice } from "@/hooks/useInvoices";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubscriberPaymentCellProps {
  invoice: Invoice | null;
  month: string;
  contractStartMonth: string; // yyyy-MM format
  isNextAvailable: boolean; // If this is the next month available for invoice generation
  onMarkPaid: (invoiceId: string) => void;
  onCancel: (invoiceId: string) => void;
  onGenerateInvoice: () => void;
  isMarkingPaid?: boolean;
  isCancelling?: boolean;
}

const SubscriberPaymentCell = ({
  invoice,
  month,
  contractStartMonth,
  isNextAvailable,
  onMarkPaid,
  onCancel,
  onGenerateInvoice,
  isMarkingPaid,
  isCancelling,
}: SubscriberPaymentCellProps) => {
  // Check if month is before contract start
  const isBeforeContract = month < contractStartMonth;

  // No invoice generated for this month
  if (!invoice) {
    // Before contract - completely disabled
    if (isBeforeContract) {
      return (
        <div
          className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center",
            "bg-muted/30 border border-transparent"
          )}
        />
      );
    }

    // Not the next available month - disabled but shows it's a future month
    if (!isNextAvailable) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "w-10 h-10 rounded-md flex items-center justify-center",
                "bg-muted/40 border-2 border-dashed border-muted-foreground/30"
              )}
            >
              <Minus className="w-3 h-3 text-muted-foreground/40" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Gere as faturas anteriores primeiro</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Next available month - can generate invoice
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-10 h-10 rounded-md flex items-center justify-center",
              "bg-primary/10 hover:bg-primary/20 border-2 border-dashed border-primary/50",
              "transition-colors cursor-pointer"
            )}
          >
            <Plus className="w-4 h-4 text-primary/70" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3" align="center">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Sem fatura para este mês
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={onGenerateInvoice}
            >
              <Plus className="w-3 h-3 mr-1" />
              Gerar Fatura
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Determine status styling
  const getStatusStyle = () => {
    switch (invoice.status) {
      case "paid":
        return {
          bg: "bg-green-500/20 hover:bg-green-500/30 border-green-500/40",
          icon: <Check className="w-4 h-4 text-green-600" />,
          label: "Pago",
          labelColor: "text-green-600",
        };
      case "pending":
        return {
          bg: "bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40",
          icon: <Clock className="w-4 h-4 text-yellow-600" />,
          label: "Pendente",
          labelColor: "text-yellow-600",
        };
      case "overdue":
        return {
          bg: "bg-destructive/20 hover:bg-destructive/30 border-destructive/40",
          icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
          label: "Vencida",
          labelColor: "text-destructive",
        };
      case "cancelled":
        return {
          bg: "bg-muted hover:bg-muted/80 border-muted-foreground/20",
          icon: <X className="w-4 h-4 text-muted-foreground" />,
          label: "Cancelada",
          labelColor: "text-muted-foreground",
        };
      default:
        return {
          bg: "bg-muted",
          icon: null,
          label: "Desconhecido",
          labelColor: "text-muted-foreground",
        };
    }
  };

  const style = getStatusStyle();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center",
            "border transition-colors cursor-pointer",
            style.bg
          )}
        >
          {style.icon}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="center">
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={cn("font-medium", style.labelColor)}>
              {style.label}
            </span>
            <span className="text-sm font-medium">
              R$ {Number(invoice.amount).toFixed(2)}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Vencimento:</span>
              <span>{format(parseISO(invoice.due_date), "dd/MM/yyyy")}</span>
            </div>
            {invoice.paid_at && (
              <div className="flex justify-between">
                <span>Pago em:</span>
                <span>{format(parseISO(invoice.paid_at), "dd/MM/yyyy")}</span>
              </div>
            )}
            {invoice.payment_method && (
              <div className="flex justify-between">
                <span>Método:</span>
                <span className="capitalize">{invoice.payment_method}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {invoice.status === "pending" || invoice.status === "overdue" ? (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onMarkPaid(invoice.id)}
                disabled={isMarkingPaid}
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Pago
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onCancel(invoice.id)}
                disabled={isCancelling}
              >
                Cancelar
              </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SubscriberPaymentCell;
