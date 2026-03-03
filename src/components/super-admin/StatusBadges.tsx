import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";

interface OrganizationStatusBadgeProps {
  status: string;
  className?: string;
}

export const OrganizationStatusBadge = ({ status, className }: OrganizationStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "Ativo",
          variant: "default" as const,
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
      case "pending":
        return {
          label: "Pendente",
          variant: "secondary" as const,
          className: "bg-yellow-500 hover:bg-yellow-600 text-white",
        };
      case "suspended":
        return {
          label: "Suspenso",
          variant: "destructive" as const,
          className: "",
        };
      case "cancelled":
        return {
          label: "Cancelado",
          variant: "outline" as const,
          className: "text-muted-foreground",
        };
      default:
        return {
          label: status,
          variant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};

interface SubscriptionStatusBadgeProps {
  status: string;
  trialEndsAt?: string | null;
  className?: string;
}

export const SubscriptionStatusBadge = ({ status, trialEndsAt, className }: SubscriptionStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    // Calculate trial days remaining
    let trialDaysLeft = 0;
    let trialExpired = false;
    
    if (status === "trial" && trialEndsAt) {
      const trialEnd = new Date(trialEndsAt);
      const now = new Date();
      // Use start of day for accurate day comparison
      const trialEndDay = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());
      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      trialDaysLeft = differenceInDays(trialEndDay, todayDay);
      trialExpired = trialDaysLeft < 0;
    }

    switch (status) {
      case "active":
        return {
          label: "Ativo",
          variant: "default" as const,
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
      case "trial":
        if (trialExpired) {
          return {
            label: "Trial expirado",
            variant: "destructive" as const,
            className: "",
          };
        }
        if (trialDaysLeft === 0) {
          return {
            label: "Trial (último dia)",
            variant: "secondary" as const,
            className: "bg-orange-500 hover:bg-orange-600 text-white",
          };
        }
        return {
          label: `Trial (${trialDaysLeft}d)`,
          variant: "secondary" as const,
          className: trialDaysLeft <= 3 
            ? "bg-orange-500 hover:bg-orange-600 text-white" 
            : "bg-blue-500 hover:bg-blue-600 text-white",
        };
      case "overdue":
        return {
          label: "Inadimplente",
          variant: "destructive" as const,
          className: "",
        };
      case "inactive":
        return {
          label: "Inativo",
          variant: "outline" as const,
          className: "text-muted-foreground",
        };
      case "cancelled":
        return {
          label: "Cancelado",
          variant: "outline" as const,
          className: "text-muted-foreground",
        };
      default:
        return {
          label: status,
          variant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};

// Badge para tipo de assinatura (Teste/Mensal/Anual)
interface SubscriptionTypeBadgeProps {
  type: string;
  trialEndsAt?: string | null;
  className?: string;
}

export const SubscriptionTypeBadge = ({ type, trialEndsAt, className }: SubscriptionTypeBadgeProps) => {
  const getTypeConfig = (type: string) => {
    if (type === "trial") {
      let trialDaysLeft = 0;
      let trialExpired = false;

      if (trialEndsAt) {
        const trialEnd = new Date(trialEndsAt);
        const now = new Date();
        const trialEndDay = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());
        const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        trialDaysLeft = differenceInDays(trialEndDay, todayDay);
        trialExpired = trialDaysLeft < 0;
      }

      if (trialExpired) {
        return {
          label: "Teste expirado",
          variant: "destructive" as const,
          className: "",
        };
      }
      if (trialDaysLeft === 0) {
        return {
          label: "Teste (último dia)",
          variant: "secondary" as const,
          className: "bg-orange-500 hover:bg-orange-600 text-white",
        };
      }
      return {
        label: `Teste (${trialDaysLeft}d)`,
        variant: "secondary" as const,
        className: trialDaysLeft <= 3
          ? "bg-orange-500 hover:bg-orange-600 text-white"
          : "bg-blue-500 hover:bg-blue-600 text-white",
      };
    }

    switch (type) {
      case "monthly":
        return {
          label: "Mensal",
          variant: "default" as const,
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
      case "annual":
        return {
          label: "Anual",
          variant: "default" as const,
          className: "bg-emerald-700 hover:bg-emerald-800 text-white",
        };
      default:
        return {
          label: type,
          variant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getTypeConfig(type);

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};
interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export const InvoiceStatusBadge = ({ status, className }: InvoiceStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return {
          label: "Pago",
          variant: "default" as const,
          className: "bg-green-500 hover:bg-green-600 text-white",
        };
      case "pending":
        return {
          label: "Pendente",
          variant: "secondary" as const,
          className: "bg-yellow-500 hover:bg-yellow-600 text-white",
        };
      case "overdue":
        return {
          label: "Vencido",
          variant: "destructive" as const,
          className: "",
        };
      case "cancelled":
        return {
          label: "Cancelado",
          variant: "outline" as const,
          className: "text-muted-foreground line-through",
        };
      default:
        return {
          label: status,
          variant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};
