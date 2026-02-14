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
import { Loader2, Eye, EyeOff, Copy, Check, MessageCircle } from "lucide-react";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  user,
}: ResetPasswordModalProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

  // Generate a random 8-char password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setShowPassword(true);
  };

  const getCredentialsMessage = () => {
    if (!user) return "";
    return `📱 *AgendaIGR - Nova Senha*\n\nOlá, ${user.name}!\n\nSua senha foi resetada. Seguem as novas credenciais:\n\n📞 Login: ${user.phone}\n🔑 Senha: ${newPassword}\n\n⚠️ Recomendamos alterar sua senha após o primeiro acesso.`;
  };

  const handleCopy = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(getCredentialsMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!user) return;
    
    // Format phone number for WhatsApp (remove non-digits)
    const phoneDigits = user.phone.replace(/\D/g, "");
    const message = encodeURIComponent(getCredentialsMessage());
    
    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/${phoneDigits}?text=${message}`, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          targetUserId: user.id,
          newPassword,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Senha alterada",
        description: data?.message || `A senha de ${user.name} foi resetada com sucesso.`,
      });

      setPasswordReset(true);
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast({
        title: "Erro ao resetar senha",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Resetar Senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para <strong>{user?.name}</strong>.
            <br />
            Telefone: <strong>{user?.phone}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="pr-10 bg-muted/50 shadow-sm"
                  disabled={passwordReset}
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
                disabled={passwordReset}
              >
                Gerar
              </Button>
            </div>
          </div>

          {newPassword && (
            <div className="p-3 bg-muted rounded-lg space-y-3">
              <p className="text-sm text-muted-foreground">
                Credenciais para enviar ao usuário:
              </p>
              <div className="flex items-start gap-2">
                <code className="text-xs bg-background p-2 rounded flex-1 whitespace-pre-wrap">
                  📞 {user?.phone}
                  {"\n"}🔑 {newPassword}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  title="Copiar credenciais"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {passwordReset && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleSendWhatsApp}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar via WhatsApp
                </Button>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              {passwordReset ? "Fechar" : "Cancelar"}
            </Button>
            {!passwordReset && (
              <Button type="submit" disabled={!newPassword || isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Resetar Senha
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
