import { useEffect, useState } from "react";
import { Bell, Clock, Save, Smartphone, AlertCircle, CheckCircle2, XCircle, ChevronDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  useReminderSettings,
  ReminderSettings,
  ReminderTemplates,
  DEFAULT_REMINDER_TEMPLATES,
  NotificationChannel,
} from "@/hooks/useReminderSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { PushNotificationInstructions } from "@/components/notifications/PushNotificationInstructions";
import { MessageTemplateEditor } from "@/components/reminders/MessageTemplateEditor";
import whatsappIcon from "@/assets/whatsapp-logo.svg";

const ReminderSettingsPage = () => {
  const { role } = useAuth();
  const { settings, isLoading, updateSettings, isUpdating } = useReminderSettings();
  const {
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    isSupported,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [enabled, setEnabled] = useState(true);
  const [notificationChannel, setNotificationChannel] = useState<NotificationChannel>("whatsapp");
  const [sendTime, setSendTime] = useState("09:00");
  const [reminderTemplates, setReminderTemplates] = useState<ReminderTemplates>(DEFAULT_REMINDER_TEMPLATES);
  const [isPushOpen, setIsPushOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setNotificationChannel(settings.notification_channel || "whatsapp");
      setSendTime(settings.send_time || "09:00");
      setReminderTemplates(settings.reminder_templates || DEFAULT_REMINDER_TEMPLATES);
    }
  }, [settings]);

  if (role !== "admin" && role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Map per-template repeat configs to legacy fields for edge function compat
  const mapToLegacy = (templates: ReminderTemplates) => {
    const beforeDue = templates.before_due;
    let intervalDays = beforeDue.repeat.interval;
    const t = beforeDue.repeat.type;
    if (t === "hours") intervalDays = Math.max(1, Math.round(beforeDue.repeat.interval / 24));
    if (t === "minutes") intervalDays = 1;
    if (t === "weeks") intervalDays = beforeDue.repeat.interval * 7;
    if (t === "months") intervalDays = beforeDue.repeat.interval * 30;
    if (t === "years") intervalDays = beforeDue.repeat.interval * 365;

    let maxReminders = 10;
    if (beforeDue.repeat.duration === "count" && beforeDue.repeat.count) {
      maxReminders = beforeDue.repeat.count;
    }

    return {
      after_creation_days: templates.after_creation.enabled ? 1 : 0,
      before_due_days: beforeDue.enabled && beforeDue.repeat.type !== "none" ? [intervalDays] : [],
      on_due_day: templates.on_due.enabled,
      interval_reminders: {
        enabled: beforeDue.enabled && beforeDue.repeat.type !== "none",
        interval_days: intervalDays,
        max_reminders: maxReminders,
      },
    };
  };

  const handleSave = async () => {
    const legacy = mapToLegacy(reminderTemplates);
    // Also sync legacy message_templates for edge functions
    const legacyMessages = {
      after_creation: reminderTemplates.after_creation.template,
      before_due: reminderTemplates.before_due.template,
      on_due: reminderTemplates.on_due.template,
      interval: reminderTemplates.before_due.template, // reuse before_due as interval
      instant_reminder: {
        title: "⏰ Lembrete",
        body: "[nome], [ministério]: [titulo]\nEvento em [data_evento] às [hora_evento]\n\nObs: Sua participação é importante para realização desse evento.",
      },
    };

    await updateSettings({
      enabled,
      notification_channel: notificationChannel,
      send_time: sendTime,
      reminder_templates: reminderTemplates,
      message_templates: legacyMessages,
      ...legacy,
    } as ReminderSettings);
  };

  const showWhatsAppSection = notificationChannel === "whatsapp" || notificationChannel === "both";
  const showPushSection = notificationChannel === "push" || notificationChannel === "both";

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Configurações de Lembretes
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure como e quando os lembretes serão enviados para os líderes
        </p>
      </div>

      {/* Channel Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" />
            Canal de Envio
          </CardTitle>
          <CardDescription>
            Escolha como os lembretes automáticos serão enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={notificationChannel}
            onValueChange={(v) => setNotificationChannel(v as NotificationChannel)}
            className="grid grid-cols-3 gap-4"
          >
            <div>
              <RadioGroupItem value="whatsapp" id="ch-whatsapp" className="peer sr-only" />
              <Label
                htmlFor="ch-whatsapp"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-[#25D366] peer-data-[state=checked]:bg-[#25D366]/10 [&:has([data-state=checked])]:border-[#25D366] cursor-pointer transition-colors"
              >
                <img src={whatsappIcon} alt="WhatsApp" className="h-8 w-8 mb-2" />
                <span className="font-medium">WhatsApp</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="push" id="ch-push" className="peer sr-only" />
              <Label
                htmlFor="ch-push"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
              >
                <Bell className="h-8 w-8 mb-2 text-muted-foreground" />
                <span className="font-medium">Push</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="both" id="ch-both" className="peer sr-only" />
              <Label
                htmlFor="ch-both"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1 mb-2">
                  <img src={whatsappIcon} alt="WhatsApp" className="h-6 w-6" />
                  <span className="text-muted-foreground">+</span>
                  <Bell className="h-6 w-6 text-muted-foreground" />
                </div>
                <span className="font-medium">Ambos</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* WhatsApp/Main Section */}
      {showWhatsAppSection && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
              <img src={whatsappIcon} alt="WhatsApp" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Lembretes via WhatsApp</h2>
              <p className="text-sm text-muted-foreground">
                Configure os lembretes automáticos enviados por WhatsApp
              </p>
            </div>
          </div>

          {/* Master Switch + Send Time */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Ativar lembretes</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, lembretes serão enviados automaticamente
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <Separator />

              <div>
                <Label className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horário de Envio
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Todos os lembretes serão enviados neste horário
                </p>
                <Input
                  type="time"
                  className="w-32 bg-muted/50 shadow-sm"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Message Templates with per-template repeat */}
          <MessageTemplateEditor
            templates={reminderTemplates}
            onChange={setReminderTemplates}
          />
        </div>
      )}

      {/* Push Notifications Section */}
      {showPushSection && (
        <>
          <Separator className="my-4" />
          <Collapsible open={isPushOpen} onOpenChange={setIsPushOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Notificações Push</CardTitle>
                        <CardDescription>
                          Receba notificações diretamente no seu dispositivo
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isPushOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {!isSupported ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Não suportado</AlertTitle>
                      <AlertDescription>
                        Seu navegador não suporta notificações push.
                      </AlertDescription>
                    </Alert>
                  ) : permission === "denied" ? (
                    <div>
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Notificações bloqueadas</AlertTitle>
                        <AlertDescription>
                          Você bloqueou as notificações anteriormente. Siga as instruções abaixo para reativar.
                        </AlertDescription>
                      </Alert>
                      <PushNotificationInstructions />
                    </div>
                  ) : isSubscribed ? (
                    <Alert className="border-primary/50 bg-primary/5">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-primary">Notificações ativas</AlertTitle>
                      <AlertDescription className="text-primary/80">
                        Você receberá lembretes diretamente neste dispositivo.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <Bell className="h-4 w-4" />
                      <AlertTitle>Ative as notificações</AlertTitle>
                      <AlertDescription>
                        Receba lembretes de eventos e tarefas mesmo quando o app estiver fechado.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="font-medium">
                        {isSubscribed ? "Notificações ativadas" : "Ativar notificações"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isSubscribed
                          ? "Clique para desativar as notificações neste dispositivo"
                          : "Receba lembretes mesmo com o navegador fechado"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={isSubscribed ? "outline" : "default"}
                      disabled={isPushLoading || !isSupported || permission === "denied"}
                      onClick={async () => {
                        if (isSubscribed) {
                          await unsubscribe();
                        } else {
                          await subscribe();
                        }
                      }}
                    >
                      {isPushLoading ? "Processando..." : isSubscribed ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isUpdating}>
          <Save className="h-4 w-4 mr-2" />
          {isUpdating ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default ReminderSettingsPage;
