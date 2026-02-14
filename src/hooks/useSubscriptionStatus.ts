import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, isPast, parseISO } from "date-fns";

export type SubscriptionStatusType = 
  | "active"      // Assinatura ativa (paid)
  | "trial"       // Em período de teste
  | "trial_expired" // Teste expirado, sem assinatura
  | "suspended"   // Suspenso por inadimplência
  | "pending";    // Aguardando aprovação

interface SubscriptionStatus {
  status: SubscriptionStatusType;
  isBlocked: boolean; // true = só pode visualizar
  trialDaysRemaining: number | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  message: string;
}

export const useSubscriptionStatus = (): SubscriptionStatus => {
  const { organization, role } = useAuth();

  return useMemo(() => {
    // Super admins nunca são bloqueados
    if (role === "super_admin") {
      return {
        status: "active",
        isBlocked: false,
        trialDaysRemaining: null,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        message: "",
      };
    }

    // Viewers já são bloqueados por role
    if (role === "viewer") {
      return {
        status: "active",
        isBlocked: false, // O bloqueio do viewer é tratado em outro lugar
        trialDaysRemaining: null,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: "",
      };
    }

    if (!organization) {
      return {
        status: "pending",
        isBlocked: true,
        trialDaysRemaining: null,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: "Organização não encontrada.",
      };
    }

    const { subscription_status, trial_ends_at, status: orgStatus } = organization;

    // Organização suspensa
    if (orgStatus === "suspended") {
      return {
        status: "suspended",
        isBlocked: true,
        trialDaysRemaining: null,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: "Sua conta está suspensa. Entre em contato com o suporte para regularizar.",
      };
    }

    // Organização pendente de aprovação
    if (orgStatus === "pending") {
      return {
        status: "pending",
        isBlocked: true,
        trialDaysRemaining: null,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: "Sua conta está aguardando aprovação.",
      };
    }

    // Assinatura ativa (paga)
    if (subscription_status === "active") {
      return {
        status: "active",
        isBlocked: false,
        trialDaysRemaining: null,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        message: "",
      };
    }

    // Em período de trial
    if (subscription_status === "trial" && trial_ends_at) {
      const trialEnd = parseISO(trial_ends_at);
      const today = new Date();
      
      if (isPast(trialEnd)) {
        // Trial expirou
        return {
          status: "trial_expired",
          isBlocked: true,
          trialDaysRemaining: 0,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          message: "Seu período de teste gratuito expirou. Regularize sua situação para continuar utilizando todas as funcionalidades.",
        };
      }

      // Trial ainda ativo
      const daysRemaining = differenceInDays(trialEnd, today);
      return {
        status: "trial",
        isBlocked: false,
        trialDaysRemaining: daysRemaining >= 0 ? daysRemaining : 0,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        message: "",
      };
    }

    // Sem assinatura e sem trial (trial expirado ou nunca teve)
    if (subscription_status === "inactive" || subscription_status === "cancelled") {
      return {
        status: "trial_expired",
        isBlocked: true,
        trialDaysRemaining: null,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        message: "Sua assinatura está inativa. Regularize sua situação para continuar utilizando todas as funcionalidades.",
      };
    }

    // Fallback - trial sem data definida mas status trial
    if (subscription_status === "trial" && !trial_ends_at) {
      return {
        status: "trial",
        isBlocked: false,
        trialDaysRemaining: null,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        message: "",
      };
    }

    // Default - permitir acesso
    return {
      status: "active",
      isBlocked: false,
      trialDaysRemaining: null,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      message: "",
    };
  }, [organization, role]);
};
