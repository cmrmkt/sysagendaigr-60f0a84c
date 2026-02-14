import { Bell, Smartphone, CheckCircle, XCircle, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PushNotificationInstructions } from "@/components/notifications/PushNotificationInstructions";

const NotificationSettings = () => {
  const navigate = useNavigate();
  const {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: <XCircle className="w-5 h-5 text-destructive" />,
        label: "Não Suportado",
        description: "Seu navegador não suporta notificações push.",
        color: "text-destructive",
      };
    }

    if (permission === "denied") {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-warning" />,
        label: "Bloqueado",
        description: "As notificações foram bloqueadas no navegador.",
        color: "text-warning",
      };
    }

    if (isSubscribed) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-primary" />,
        label: "Ativas",
        description: "Você receberá notificações neste dispositivo.",
        color: "text-primary",
      };
    }

    return {
      icon: <XCircle className="w-5 h-5 text-muted-foreground" />,
      label: "Inativas",
      description: "Ative para receber lembretes de eventos e tarefas.",
      color: "text-muted-foreground",
    };
  };

  const statusInfo = getStatusInfo();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          Notificações
        </h1>
        <p className="text-muted-foreground">
          Configure as notificações push no seu dispositivo
        </p>
      </div>

      {/* Push Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="w-5 h-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba lembretes de eventos e tarefas diretamente no seu dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              {statusInfo.icon}
              <div>
                <p className={`font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {statusInfo.description}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {isSupported && permission !== "denied" && (
            <Button
              onClick={handleToggle}
              disabled={isLoading}
              variant={isSubscribed ? "outline" : "default"}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : isSubscribed ? (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Desativar Notificações
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Ativar Notificações
                </>
              )}
            </Button>
          )}

          {/* Instructions for blocked permissions */}
          {permission === "denied" && <PushNotificationInstructions />}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Sobre as notificações
              </p>
              <p className="text-sm text-muted-foreground">
                Ao ativar as notificações, você receberá lembretes sobre eventos
                e tarefas que envolvem você ou seu ministério. As notificações
                são configuradas pelo administrador da igreja.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
