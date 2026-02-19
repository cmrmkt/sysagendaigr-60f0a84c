import { AlertTriangle, Clock, MessageCircle, XCircle } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const buildWhatsAppLink = (orgName?: string) => {
  const baseMessage = "Olá, Gostaria de pagar a assinatura do sistema de AgendaIGR";
  const fullMessage = orgName ? `${baseMessage} (${orgName})` : baseMessage;
  return `https://wa.me/5532999926735?text=${encodeURIComponent(fullMessage)}`;
};

const SubscriptionBanner = () => {
  const { status, isBlocked, message, trialDaysRemaining } = useSubscriptionStatus();
  const { organization } = useAuth();
  const whatsappLink = buildWhatsAppLink(organization?.name);

  // Não mostrar banner se tudo estiver ok
  if (!isBlocked && status !== "trial") {
    return null;
  }

  // Banner de trial (warning suave)
  if (status === "trial" && trialDaysRemaining !== null) {
    // Só mostrar warning nos últimos 5 dias
    if (trialDaysRemaining > 3) return null;
    
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-3 text-amber-700 dark:text-amber-400 flex-wrap">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-medium">Período de teste:</span>{" "}
          {trialDaysRemaining === 0 
            ? "Último dia! " 
            : `${trialDaysRemaining} ${trialDaysRemaining === 1 ? "dia restante" : "dias restantes"}. `}
          <span className="hidden sm:inline">Entre em contato para ativar sua assinatura.</span>
        </p>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs font-medium transition-colors flex-shrink-0"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Falar no WhatsApp</span>
          <span className="sm:hidden">WhatsApp</span>
        </a>
      </div>
    );
  }

  // Banner de bloqueio (trial expirado, suspenso, etc.) - Compacto com tooltip
  if (isBlocked) {
    const isSuspended = status === "suspended";
    const isPending = status === "pending";
    
    const title = isPending 
      ? "Conta pendente de aprovação" 
      : isSuspended 
        ? "Conta suspensa" 
        : "Período de teste expirado";
    
    
    
    const description = message 
      ? `${message} Clique aqui para falar conosco no WhatsApp.`
      : "O acesso está limitado apenas à visualização. Clique aqui para falar conosco no WhatsApp.";

    return (
      <div className="bg-destructive/15 border-b border-destructive/30 px-4 py-2">
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 cursor-pointer text-destructive hover:text-destructive/80 transition-colors"
            >
              {isSuspended ? (
                <XCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{title}</span>
              <span className="text-xs underline hidden sm:inline">Falar no WhatsApp</span>
            </a>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-[280px] sm:max-w-[320px] p-3 bg-destructive text-destructive-foreground" 
            side="bottom"
            sideOffset={8}
          >
            <p className="text-sm">{description}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;
