import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff, Copy, Check, KeyRound } from "lucide-react";
import whatsappIcon from "@/assets/whatsapp-logo.svg";

interface ResendCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    phone: string;
    phone_country: string;
  } | null;
}

export function ResendCredentialsModal({
  open,
  onOpenChange,
  user,
}: ResendCredentialsModalProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

  // Generate a random 8-char password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setShowPassword(true);
  };

  const formatPhone = (phone: string, country: string) => {
    const digits = phone.replace(/\D/g, "");
    if (country === "BR" && digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (country === "US" && digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const getWhatsAppNumber = () => {
    if (!user) return "";
    const digits = user.phone.replace(/\D/g, "");
    const countryCode = user.phone_country === "BR" ? "55" : "1";
    return `${countryCode}${digits}`;
  };

  const getCredentialsMessage = () => {
    if (!user) return "";
    const formattedPhone = formatPhone(user.phone, user.phone_country);
    return `🏛 *Acesso à Agenda da Igreja*

📱 Login: ${formattedPhone}

🔑 Senha: ${newPassword}

🔗 Acesse: https://agendaigr.lovable.app/login

📲 *Para receber lembretes no celular:*
1. Acesse o link acima no navegador do celular
2. Faça login com seus dados
3. Clique no seu nome (menu) → "Notificações"
4. Clique em "Ativar Notificações"
5. Permita quando o navegador solicitar`;
  };

  // Save password to database
  const savePassword = async (): Promise<boolean> => {
    if (!user || !newPassword || passwordReset) return true;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          targetUserId: user.id,
          newPassword,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setPasswordReset(true);
      return true;
    } catch (error: unknown) {
      console.error("Reset password error:", error);
      toast({
        title: "Erro ao atualizar senha",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!user || !newPassword) return;
    
    // Save password first if not saved yet
    const saved = await savePassword();
    if (!saved) return;
    
    await navigator.clipboard.writeText(getCredentialsMessage());
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Senha atualizada e mensagem copiada para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = async () => {
    if (!user) return;
    if (!newPassword) {
      toast({
        title: "Gere uma senha primeiro",
        description: "Clique em 'Gerar' para criar uma nova senha antes de enviar no WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    // IMPORTANT: open the window synchronously to preserve the user gesture
    const waWindow = window.open("", "_blank");

    // Save password first if not saved yet
    const saved = await savePassword();
    if (!saved) {
      waWindow?.close();
      return;
    }

    toast({
      title: "Senha atualizada!",
      description: `A senha de ${user.name} foi salva. Abrindo WhatsApp...`,
    });

    const message = encodeURIComponent(getCredentialsMessage());
    const url = `https://wa.me/${getWhatsAppNumber()}?text=${message}`;

    if (waWindow) {
      waWindow.location.href = url;
    } else {
      // fallback if popup was blocked
      window.location.href = url;
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setNewPassword("");
      setShowPassword(false);
      setCopied(false);
      setPasswordReset(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Reenviar Credenciais
            </DialogTitle>
            <DialogDescription>
              Gere uma nova senha para <strong>{user?.name}</strong> e envie pelo WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Telefone:</strong> {user?.phone}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Clique em Gerar"
                    minLength={6}
                    className="pr-10 bg-muted/50 shadow-sm"
                    disabled={passwordReset || isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generatePassword}
                  disabled={passwordReset || isSubmitting}
                >
                  Gerar
                </Button>
              </div>
            </div>

            {newPassword && (
              <div className="bg-accent/50 border border-border p-4 rounded-lg space-y-3">
                <p className="text-sm font-medium">
                  Mensagem pronta para WhatsApp:
                </p>
                <p className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded">
                  {getCredentialsMessage()}
                </p>
                
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : copied ? (
                      <Check className="w-4 h-4 mr-2 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? "Salvando..." : "Copiar"}
                  </Button>
                  
                  <Button
                    type="button"
                    size="default"
                    variant="outline"
                    className="gap-2"
                    onClick={handleSendWhatsApp}
                    disabled={!newPassword || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <img
                        src={whatsappIcon}
                        alt="WhatsApp"
                        className="w-5 h-5"
                        loading="lazy"
                      />
                    )}
                    {isSubmitting ? "Salvando..." : "Enviar dados de Login"}
                  </Button>
                  {passwordReset && (
                    <p className="text-xs text-primary text-center font-medium">
                      ✓ Senha salva com sucesso!
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="flex-1"
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
