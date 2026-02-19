import { AlertTriangle, Clock } from "lucide-react";
import { useInvoiceAlerts } from "@/hooks/useInvoiceAlerts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const InvoiceBanner = () => {
  const { mostUrgent, hasAlerts } = useInvoiceAlerts();

  if (!hasAlerts || !mostUrgent) return null;

  const dueDate = format(parseISO(mostUrgent.due_date), "dd/MM/yyyy", { locale: ptBR });
  const amount = mostUrgent.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const whatsappLink = "https://wa.me/5511999999999?text=Olá! Gostaria de tratar sobre minha fatura do Agenda IGR.";

  if (mostUrgent.type === "overdue") {
    return (
      <div className="bg-destructive/15 border-b border-destructive/30 px-4 py-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            <span className="font-medium">Fatura de {amount} vencida em {dueDate}</span>
            <span className="hidden sm:inline"> — </span>
            <span className="text-xs underline hidden sm:inline">Falar no WhatsApp</span>
          </span>
        </a>
      </div>
    );
  }

  const daysText =
    mostUrgent.days_until_due === 0
      ? "vence hoje"
      : mostUrgent.days_until_due === 1
        ? "vence em 1 dia"
        : `vence em ${mostUrgent.days_until_due} dias`;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
      >
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">
          <span className="font-medium">Fatura de {amount} {daysText}</span>
          <span className="hidden sm:inline"> — {dueDate} — </span>
          <span className="text-xs underline hidden sm:inline">Falar no WhatsApp</span>
        </span>
      </a>
    </div>
  );
};

export default InvoiceBanner;
