import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Church, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<"BR" | "US" | "CA" | "PT">("BR");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCountry, setForgotCountry] = useState<"BR" | "US" | "CA" | "PT">("BR");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResult, setForgotResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  

  useEffect(() => {
    if (isAuthenticated) {
      if (role === "super_admin") {
        navigate("/super-admin/organizacoes");
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone || phone.length < 10) {
      setError("Informe um número de telefone válido.");
      return;
    }

    if (!password || password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(phone, phoneCountry, password);
    if (!result.success) {
      setError(result.error || "Erro ao fazer login.");
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotResult(null);

    const digits = forgotPhone.replace(/\D/g, "");
    if (!digits || digits.length < 9) {
      toast.error("Informe um número de telefone válido.");
      return;
    }

    setForgotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("forgot-password", {
        body: { phone: forgotPhone, phoneCountry: forgotCountry },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setForgotResult(data);
    } catch (err: any) {
      toast.error(err.message || "Erro ao redefinir senha");
    } finally {
      setForgotLoading(false);
    }
  };


  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotResult(null);
    setForgotPhone("");
    
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center space-y-2 pb-2 pt-5">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <Church className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Agenda da Igreja</h1>
            <p className="text-muted-foreground text-xs">
              {showForgotPassword ? "Redefinir sua senha" : "Faça login para acessar o sistema"}
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-5 px-5">
          {showForgotPassword ? (
            // Forgot Password Form
            <div className="space-y-4">
              {forgotResult ? (
                // Result screen
                <div className="space-y-4">
                  <div className="rounded-lg p-3 text-sm bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400">
                    {forgotResult.message}
                  </div>

                  <Button
                    type="button"
                    className="w-full h-10"
                    onClick={handleBackToLogin}
                  >
                    Voltar para o Login
                  </Button>
                </div>
              ) : (
                // Phone input form
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Informe o telefone cadastrado. Uma nova senha será enviada via WhatsApp.
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Telefone</Label>
                    <PhoneInput
                      value={forgotPhone}
                      country={forgotCountry}
                      onValueChange={setForgotPhone}
                      onCountryChange={setForgotCountry}
                      disabled={forgotLoading}
                      showFieldLabels
                    />
                  </div>

                  <Button type="submit" className="w-full h-10" disabled={forgotLoading}>
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redefinindo...
                      </>
                    ) : (
                      "Redefinir Senha"
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Voltar para o login
                  </button>
                </form>
              )}
            </div>
          ) : (
            // Login Form
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-2.5 text-xs">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm">Telefone</Label>
                  <PhoneInput
                    value={phone}
                    country={phoneCountry}
                    onValueChange={(val) => {
                      setPhone(val);
                      setError(null);
                    }}
                    onCountryChange={setPhoneCountry}
                    disabled={isSubmitting}
                    showFieldLabels
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      disabled={isSubmitting}
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-10 mt-4" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="mt-3 text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  Sua igreja ainda não está cadastrada?
                </p>
                <Link
                  to="/registro"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Cadastre-se agora
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
