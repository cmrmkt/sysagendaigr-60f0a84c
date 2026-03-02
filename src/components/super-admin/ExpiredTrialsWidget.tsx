import { useState } from "react";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUpdateOrganization, OrganizationWithStats } from "@/hooks/useOrganizations";

interface ExpiredTrialsWidgetProps {
  organizations: OrganizationWithStats[] | undefined;
}

const ExpiredTrialsWidget = ({ organizations }: ExpiredTrialsWidgetProps) => {
  const updateOrganization = useUpdateOrganization();
  const [extendingOrgId, setExtendingOrgId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Filter expired trial orgs
  const expiredOrgs = organizations?.filter((org) => {
    if (org.subscription_status !== "trial" || !org.trial_ends_at) return false;
    return isPast(parseISO(org.trial_ends_at));
  }) || [];

  // Also include inactive/cancelled that had trials
  const inactiveOrgs = organizations?.filter((org) => {
    return (
      (org.subscription_status === "inactive" || org.subscription_status === "cancelled") &&
      org.status !== "suspended"
    );
  }) || [];

  const allExpired = [...expiredOrgs, ...inactiveOrgs];

  const handleExtend = async (orgId: string) => {
    if (!selectedDate) return;
    try {
      await updateOrganization.mutateAsync({
        id: orgId,
        trial_ends_at: selectedDate.toISOString(),
        subscription_status: "trial",
      });
      toast.success(`Trial estendido até ${format(selectedDate, "dd/MM/yyyy")}`);
      setExtendingOrgId(null);
      setSelectedDate(undefined);
    } catch {
      toast.error("Erro ao estender trial");
    }
  };

  const getDaysExpired = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    const days = differenceInDays(new Date(), parseISO(trialEndsAt));
    return days > 0 ? days : 0;
  };

  if (allExpired.length === 0) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Assinaturas Expiradas ({allExpired.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allExpired.map((org) => {
          const daysExpired = getDaysExpired(org.trial_ends_at);
          const isExtending = extendingOrgId === org.id;

          return (
            <div
              key={org.id}
              className="flex flex-col gap-2 rounded-md border border-destructive/20 bg-background p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{org.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    <span>
                      Cadastro: {org.created_at ? format(parseISO(org.created_at), "dd/MM/yyyy") : "-"}
                    </span>
                    <span>
                      Trial inicial: {org.trial_ends_at
                        ? format(parseISO(org.trial_ends_at), "dd/MM/yyyy")
                        : "-"}
                    </span>
                    {daysExpired !== null && daysExpired > 0 && (
                      <span className="text-destructive font-medium">
                        Expirado há {daysExpired} {daysExpired === 1 ? "dia" : "dias"}
                      </span>
                    )}
                  </div>
                </div>

                {!isExtending ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 gap-1.5 text-xs"
                    onClick={() => {
                      setExtendingOrgId(org.id);
                      setSelectedDate(undefined);
                    }}
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    Prorrogar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 text-xs"
                    onClick={() => {
                      setExtendingOrgId(null);
                      setSelectedDate(undefined);
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>

              {isExtending && (
                <div className="border-t pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">Prorrogar trial até:</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left text-xs",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarClock className="w-3.5 h-3.5 mr-2" />
                        {selectedDate
                          ? format(selectedDate, "dd/MM/yyyy")
                          : "Selecionar nova data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={!selectedDate || updateOrganization.isPending}
                    onClick={() => handleExtend(org.id)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirmar prorrogação
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ExpiredTrialsWidget;
