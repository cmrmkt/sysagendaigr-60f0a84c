import { useState, useEffect } from "react";
import { 
  MessageCircle, 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  LogOut,
  Trash2,
  Phone,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhatsAppSettings, QRCodeData } from "@/hooks/useWhatsAppSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConnectionState = "idle" | "creating" | "qr_displayed" | "connected" | "error";

const WhatsAppSettingsPage = () => {
  const { role } = useAuth();
  const {
    settings,
    isLoading,
    isConnected,
    createInstance,
    isCreatingInstance,
    refreshQRCode,
    isRefreshingQR,
    checkStatus,
    isCheckingStatus,
    disconnect,
    isDisconnecting,
    startPolling,
    stopPolling,
  } = useWhatsAppSettings();

  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update state based on settings
  useEffect(() => {
    if (isConnected) {
      setConnectionState("connected");
      stopPolling();
    }
  }, [isConnected, stopPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Only admins can access this page - after all hooks
  if (role !== "admin" && role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleConnect = async () => {
    setConnectionState("creating");
    setErrorMessage(null);
    
    try {
      const result = await createInstance();
      
      if ('connected' in result && result.connected) {
        setConnectionState("connected");
        return;
      }
      
      const qrData = result as QRCodeData;
      if (qrData.qrcode) {
        setQrCode(qrData.qrcode);
        setConnectionState("qr_displayed");
        startPolling(3000);
      } else {
        throw new Error("QR Code não recebido");
      }
    } catch (error) {
      setConnectionState("error");
      setErrorMessage((error as Error).message);
    }
  };

  const handleRefreshQR = async () => {
    setErrorMessage(null);
    
    try {
      const result = await refreshQRCode();
      
      if ('connected' in result && result.connected) {
        setConnectionState("connected");
        stopPolling();
        return;
      }
      
      if (result.qrcode) {
        setQrCode(result.qrcode);
        setConnectionState("qr_displayed");
        startPolling(3000);
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleDisconnect = async (deleteInstance: boolean = false) => {
    try {
      await disconnect(deleteInstance);
      setConnectionState("idle");
      setQrCode(null);
      stopPolling();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleCheckStatus = async () => {
    try {
      const status = await checkStatus();
      if (status.connected) {
        setConnectionState("connected");
        stopPolling();
      }
    } catch (error) {
      // Silent error on status check
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" />
          Configurações do WhatsApp
        </h1>
        <p className="text-muted-foreground mt-1">
          Conecte seu WhatsApp para enviar lembretes automaticamente
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected || connectionState === "connected" ? (
              <>
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                WhatsApp Conectado
              </>
            ) : connectionState === "qr_displayed" ? (
              <>
                <QrCode className="h-5 w-5" />
                Escaneie o QR Code
              </>
            ) : (
              <>
                <Smartphone className="h-5 w-5" />
                Conectar WhatsApp
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isConnected || connectionState === "connected"
              ? "Sua igreja está pronta para enviar lembretes via WhatsApp"
              : connectionState === "qr_displayed"
              ? "Use seu WhatsApp para escanear o código abaixo"
              : "Conecte seu WhatsApp Business para habilitar os lembretes"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* State: Idle - Not connected */}
          {connectionState === "idle" && !isConnected && (
            <div className="text-center py-8">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <WifiOff className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                WhatsApp não conectado
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Conecte seu WhatsApp Business para começar a enviar lembretes 
                automatizados aos voluntários da sua igreja.
              </p>
              <Button 
                size="lg" 
                onClick={handleConnect}
                disabled={isCreatingInstance}
              >
                {isCreatingInstance ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            </div>
          )}

          {/* State: Creating Instance */}
          {connectionState === "creating" && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-lg mb-2">
                Preparando conexão...
              </h3>
              <p className="text-muted-foreground">
                Aguarde enquanto configuramos sua instância
              </p>
            </div>
          )}

          {/* State: QR Code Displayed */}
          {connectionState === "qr_displayed" && qrCode && (
            <div className="text-center py-4">
              <div className="bg-background p-4 rounded-lg inline-block mb-4 shadow-sm border">
                <img 
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 mx-auto"
                />
              </div>
              
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="text-left bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Como escanear:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em <strong>Mais opções</strong> (⋮) ou <strong>Configurações</strong></li>
                    <li>Toque em <strong>Dispositivos conectados</strong></li>
                    <li>Toque em <strong>Conectar dispositivo</strong></li>
                    <li>Aponte a câmera para este código</li>
                  </ol>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando leitura do QR Code...
                </div>

                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={handleRefreshQR}
                    disabled={isRefreshingQR}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingQR ? 'animate-spin' : ''}`} />
                    Gerar novo código
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setConnectionState("idle");
                      setQrCode(null);
                      stopPolling();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* State: Connected */}
          {(isConnected || connectionState === "connected") && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary">
                    WhatsApp Conectado
                  </h3>
                  <div className="text-sm text-primary/80 space-y-0.5">
                    {settings.whatsapp_phone_number && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {settings.whatsapp_phone_number}
                      </p>
                    )}
                    {settings.whatsapp_connected_at && (
                      <p>
                        Conectado em {format(new Date(settings.whatsapp_connected_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
              </div>

              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertTitle>Lembretes ativos</AlertTitle>
                <AlertDescription>
                  Os lembretes serão enviados automaticamente via WhatsApp no horário 
                  configurado em "Configurações de Lembretes".
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                >
                  {isCheckingStatus ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Verificar status
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desconectar WhatsApp</AlertDialogTitle>
                      <AlertDialogDescription>
                        Escolha como deseja desconectar:
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3 py-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleDisconnect(false)}
                        disabled={isDisconnecting}
                      >
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-2">
                            <LogOut className="h-4 w-4" />
                            Apenas desconectar
                          </div>
                          <p className="text-sm text-muted-foreground font-normal">
                            Mantém a instância para reconectar depois
                          </p>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start h-auto py-3 text-destructive hover:text-destructive"
                        onClick={() => handleDisconnect(true)}
                        disabled={isDisconnecting}
                      >
                        <div className="text-left">
                          <div className="font-medium flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            Remover completamente
                          </div>
                          <p className="text-sm text-muted-foreground font-normal">
                            Remove a instância e todos os dados
                          </p>
                        </div>
                      </Button>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* State: Error */}
          {connectionState === "error" && (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Erro ao conectar
              </h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                {errorMessage || "Ocorreu um erro ao tentar conectar o WhatsApp"}
              </p>
              <Button onClick={handleConnect} disabled={isCreatingInstance}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Format Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Formato dos Números
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Os números de telefone cadastrados nos perfis dos membros serão usados para enviar as mensagens.
          </p>
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertTitle>Formato recomendado</AlertTitle>
            <AlertDescription>
              Cadastre os telefones com o código do país:
              <ul className="mt-2 space-y-1 text-sm">
                <li>🇧🇷 Brasil: <code className="bg-muted px-1 rounded">55 11 99999-8888</code></li>
                <li>🇺🇸 EUA: <code className="bg-muted px-1 rounded">1 555 123-4567</code></li>
                <li>🇵🇹 Portugal: <code className="bg-muted px-1 rounded">351 912 345 678</code></li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettingsPage;
