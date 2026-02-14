import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SubscriptionBanner = () => {
  const { status, isBlocked, message, trialDaysRemaining } = useSubscriptionStatus();

  // Não mostrar banner se tudo estiver ok
  if (!isBlocked && status !== "trial") {
    return null;
  }

  // Banner de trial (warning suave)
  if (status === "trial" && trialDaysRemaining !== null) {
    // Só mostrar warning nos últimos 5 dias
    if (trialDaysRemaining > 3) return null;
    
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-medium">Período de teste:</span>{" "}
          {trialDaysRemaining === 0 
            ? "Último dia! " 
            : `${trialDaysRemaining} ${trialDaysRemaining === 1 ? "dia restante" : "dias restantes"}. `}
          <span className="hidden sm:inline">Entre em contato para ativar sua assinatura.</span>
        </p>
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
    
    const whatsappLink = "https://wa.me/5511999999999?text=Olá! Gostaria de ativar minha assinatura do Agenda IGR.";
    
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
