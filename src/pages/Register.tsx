import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Church, Eye, EyeOff, Loader2, CheckCircle2, Building2, User, KeyRound, Globe, Star, Mail, Phone } from "lucide-react";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";

type CountryCode = "BR" | "US" | "CA" | "PT";

const COUNTRY_LABELS: Record<CountryCode, {
  country: string;
  taxId: string;
  taxIdPlaceholder: string;
  personalId: string;
  personalIdPlaceholder: string;
  postalCode: string;
  postalCodePlaceholder: string;
  state: string;
  statePlaceholder: string;
  stateMaxLength: number;
  addressPlaceholder: string;
  cityPlaceholder: string;
  formatTaxId: (v: string) => string;
  formatPostalCode: (v: string) => string;
  formatPersonalId: (v: string) => string;
}> = {
  BR: {
    country: "Brasil",
    taxId: "CNPJ",
    taxIdPlaceholder: "00.000.000/0000-00",
    personalId: "CPF",
    personalIdPlaceholder: "000.000.000-00",
    postalCode: "CEP",
    postalCodePlaceholder: "00000-000",
    state: "Estado",
    statePlaceholder: "UF",
    stateMaxLength: 2,
    addressPlaceholder: "Rua, número, bairro",
    cityPlaceholder: "Cidade",
    formatTaxId: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 14);
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
      if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
      if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    },
    formatPostalCode: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 8);
      if (digits.length <= 5) return digits;
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    },
    formatPersonalId: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    },
  },
  US: {
    country: "Estados Unidos",
    taxId: "EIN (Tax ID)",
    taxIdPlaceholder: "00-0000000",
    personalId: "SSN",
    personalIdPlaceholder: "000-00-0000",
    postalCode: "ZIP Code",
    postalCodePlaceholder: "00000",
    state: "State",
    statePlaceholder: "State",
    stateMaxLength: 2,
    addressPlaceholder: "Street, number, suite",
    cityPlaceholder: "City",
    formatTaxId: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      if (digits.length <= 2) return digits;
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    },
    formatPostalCode: (value: string) => value.replace(/\D/g, "").slice(0, 5),
    formatPersonalId: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      if (digits.length <= 3) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    },
  },
  CA: {
    country: "Canadá",
    taxId: "BN (Business Number)",
    taxIdPlaceholder: "000000000",
    personalId: "SIN",
    personalIdPlaceholder: "000-000-000",
    postalCode: "Postal Code",
    postalCodePlaceholder: "A0A 0A0",
    state: "Province",
    statePlaceholder: "Province",
    stateMaxLength: 2,
    addressPlaceholder: "Street, number, unit",
    cityPlaceholder: "City",
    formatTaxId: (value: string) => value.replace(/\D/g, "").slice(0, 9),
    formatPostalCode: (value: string) => {
      const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
      if (clean.length <= 3) return clean;
      return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    },
    formatPersonalId: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    },
  },
  PT: {
    country: "Portugal",
    taxId: "NIF",
    taxIdPlaceholder: "000000000",
    personalId: "NIF Pessoal",
    personalIdPlaceholder: "000000000",
    postalCode: "Código Postal",
    postalCodePlaceholder: "0000-000",
    state: "Distrito",
    statePlaceholder: "Distrito",
    stateMaxLength: 20,
    addressPlaceholder: "Rua, número, andar",
    cityPlaceholder: "Localidade",
    formatTaxId: (value: string) => value.replace(/\D/g, "").slice(0, 9),
    formatPostalCode: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 7);
      if (digits.length <= 4) return digits;
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    },
    formatPersonalId: (value: string) => value.replace(/\D/g, "").slice(0, 9),
  },
};

const Register = () => {
  const [searchParams] = useSearchParams();
  const planoParam = searchParams.get("plano");
  
  const [selectedPlan, setSelectedPlan] = useState<"mensal" | "anual">(
    planoParam === "anual" ? "anual" : "mensal"
  );

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("BR");
  const scrollRef = useRef<HTMLDivElement>(null);
  const labels = COUNTRY_LABELS[selectedCountry];

  // Church/Organization data
  const [orgName, setOrgName] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgPhoneCountry, setOrgPhoneCountry] = useState<CountryCode>("BR");
  const [orgTaxId, setOrgTaxId] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [orgState, setOrgState] = useState("");
  const [orgPostalCode, setOrgPostalCode] = useState("");
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  // Administrator data
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPhoneCountry, setAdminPhoneCountry] = useState<CountryCode>("BR");
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [adminWhatsappCountry, setAdminWhatsappCountry] = useState<CountryCode>("BR");

  // Login credentials
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPhoneCountry, setLoginPhoneCountry] = useState<CountryCode>("BR");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-fill address from CEP (Brazil only)
  useEffect(() => {
    if (selectedCountry !== "BR") return;
    const cepDigits = orgPostalCode.replace(/\D/g, "");
    if (cepDigits.length !== 8) return;

    const fetchAddress = async () => {
      setIsFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setOrgAddress(data.logradouro);
          if (data.localidade) setOrgCity(data.localidade);
          if (data.uf) setOrgState(data.uf);
        }
      } catch {
        // silently fail
      } finally {
        setIsFetchingCep(false);
      }
    };
    fetchAddress();
  }, [orgPostalCode, selectedCountry]);

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
    setOrgTaxId("");
    setOrgPostalCode("");
    setOrgState("");
    setAdminPhoneCountry(country);
    setAdminWhatsappCountry(country);
    setLoginPhoneCountry(country);
    setOrgPhoneCountry(country);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Church validations
    if (!orgName.trim() || orgName.length < 3) {
      setError("O nome da igreja deve ter pelo menos 3 caracteres.");
      return;
    }
    if (!orgPhone || orgPhone.replace(/\D/g, "").length < 8) {
      setError("Informe o telefone da igreja.");
      return;
    }
    const cepDigits = orgPostalCode.replace(/\D/g, "");
    if (!cepDigits || cepDigits.length < 4) {
      setError(`Informe o ${labels.postalCode} da igreja.`);
      return;
    }
    if (!orgAddress.trim()) {
      setError("Informe o endereço da igreja.");
      return;
    }
    if (!orgCity.trim()) {
      setError("Informe a cidade da igreja.");
      return;
    }
    if (!orgState.trim()) {
      setError(`Informe o ${labels.state} da igreja.`);
      return;
    }

    // Admin validations
    if (!adminName.trim() || adminName.length < 2) {
      setError("Informe o nome completo do administrador.");
      return;
    }
    if (!adminPhone || adminPhone.replace(/\D/g, "").length < 8) {
      setError("Informe o telefone do administrador.");
      return;
    }
    if (!adminWhatsapp || adminWhatsapp.replace(/\D/g, "").length < 8) {
      setError("Informe o WhatsApp do administrador.");
      return;
    }

    // Credentials validation
    if (loginMethod === "phone") {
      if (!loginPhone || loginPhone.length < 10) {
        setError("Informe um número de telefone válido para login.");
        return;
      }
    } else {
      if (!loginEmail || !loginEmail.includes("@") || loginEmail.length < 5) {
        setError("Informe um e-mail válido para login.");
        return;
      }
    }

    if (!password || password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("auth-register-org", {
        body: {
          orgName: orgName.trim(),
          orgTaxId: orgTaxId.replace(/\D/g, ""),
          orgAddress: orgAddress.trim(),
          orgCity: orgCity.trim(),
          orgState: orgState.trim(),
          orgPostalCode: orgPostalCode.replace(/[^a-zA-Z0-9]/g, ""),
          orgPhone: orgPhone,
          orgPhoneCountry: orgPhoneCountry,
          country: selectedCountry,
          phone: loginMethod === "phone" ? loginPhone : adminPhone,
          phoneCountry: loginMethod === "phone" ? loginPhoneCountry : adminPhoneCountry,
          loginEmail: loginMethod === "email" ? loginEmail.trim().toLowerCase() : undefined,
          loginMethod,
          password,
          adminName: adminName.trim(),
          adminPhone: adminPhone,
          adminPhoneCountry: adminPhoneCountry,
          adminWhatsapp: adminWhatsapp,
          adminWhatsappCountry: adminWhatsappCountry,
        },
      });

      if (fnError) {
        console.warn("Registration failed:", fnError.message);
        let extractedError: string | null = null;
        try {
          const errorBody = (fnError as any).context ? await (fnError as any).context.json() : null;
          if (errorBody?.error) extractedError = errorBody.error;
        } catch {}
        if (!extractedError && data?.error) extractedError = data.error;
        setError(extractedError || "Erro ao realizar cadastro. Verifique sua conexão com a internet e tente novamente.");
        setIsSubmitting(false);
        return;
      }

      if (data?.error) { setError(data.error); setIsSubmitting(false); return; }
      if (data?.success) setIsSuccess(true);
    } catch (err: any) {
      console.error("Unexpected registration error:", err);
      setError(`Erro inesperado: ${err?.message || "falha desconhecida"}. Verifique sua conexão e tente novamente.`);
    }

    setIsSubmitting(false);
  };

  // Success screen
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Cadastro Realizado!</h2>
            <p className="text-muted-foreground">Seu acesso foi liberado! Você já pode entrar no sistema.</p>
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">🎉 7 dias grátis ativados!</p>
              <p className="text-sm text-muted-foreground">Aproveite todas as funcionalidades durante o período de teste.</p>
            </div>
            <Link to="/login">
              <Button className="mt-4 w-full">Fazer Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="fixed inset-0 bg-background overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="min-h-full flex items-start justify-center p-4 py-6">
        <Card className="w-full max-w-2xl animate-fade-in">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
              <Church className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Cadastre sua Igreja</h1>
              <p className="text-muted-foreground text-sm mt-1">Preencha os dados abaixo para começar</p>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Country Selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">País</h2>
                </div>
                <Select value={selectedCountry} onValueChange={(v) => handleCountryChange(v as CountryCode)}>
                  <SelectTrigger className="h-11 bg-muted/50 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                    <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                    <SelectItem value="CA">🇨🇦 Canadá</SelectItem>
                    <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plan Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Star className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Plano Escolhido</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("mensal")}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedPlan === "mensal" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="font-semibold text-foreground text-sm">Mensal</p>
                    <p className="text-lg font-bold text-foreground">R$ 99,90<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("anual")}
                    className={`p-3 rounded-lg border-2 text-left transition-all relative ${
                      selectedPlan === "anual" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">Melhor Valor</span>
                    <p className="font-semibold text-foreground text-sm">Anual</p>
                    <p className="text-lg font-bold text-foreground">R$ 899<span className="text-xs font-normal text-muted-foreground">/ano</span></p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">≈ R$ 74,92/mês</p>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  <span className="text-primary font-medium">7 dias grátis</span> — você só paga após o período de teste
                </p>
              </div>

              {/* ========== Section 1: Church/Organization Data ========== */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Dados da Igreja</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="orgName">Nome da Igreja *</Label>
                    <Input
                      id="orgName"
                      type="text"
                      placeholder="Ex: Igreja Batista Central"
                      value={orgName}
                      onChange={(e) => { setOrgName(e.target.value); setError(null); }}
                      disabled={isSubmitting}
                      className="h-11 bg-muted/50 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Telefone da Igreja *</Label>
                    <PhoneInput
                      value={orgPhone}
                      country={orgPhoneCountry}
                      onValueChange={setOrgPhone}
                      onCountryChange={setOrgPhoneCountry}
                      disabled={isSubmitting}
                      showValidation={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgTaxId">{labels.taxId}</Label>
                    <Input
                      id="orgTaxId"
                      type="text"
                      placeholder={labels.taxIdPlaceholder}
                      value={orgTaxId}
                      onChange={(e) => setOrgTaxId(labels.formatTaxId(e.target.value))}
                      disabled={isSubmitting}
                      className="h-11 bg-muted/50 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgPostalCode">{labels.postalCode} *</Label>
                    <div className="relative">
                      <Input
                        id="orgPostalCode"
                        type="text"
                        placeholder={labels.postalCodePlaceholder}
                        value={orgPostalCode}
                        onChange={(e) => { setOrgPostalCode(labels.formatPostalCode(e.target.value)); setError(null); }}
                        disabled={isSubmitting}
                        className="h-11 bg-muted/50 shadow-sm"
                      />
                      {isFetchingCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {selectedCountry === "BR" && (
                      <p className="text-xs text-muted-foreground">O endereço será preenchido automaticamente</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="orgAddress">Endereço *</Label>
                    <Input
                      id="orgAddress"
                      type="text"
                      placeholder={labels.addressPlaceholder}
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                      disabled={isSubmitting}
                      className="h-11 bg-muted/50 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgCity">{labels.cityPlaceholder} *</Label>
                    <Input
                      id="orgCity"
                      type="text"
                      placeholder={labels.cityPlaceholder}
                      value={orgCity}
                      onChange={(e) => setOrgCity(e.target.value)}
                      disabled={isSubmitting}
                      className="h-11 bg-muted/50 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgState">{labels.state} *</Label>
                    <Input
                      id="orgState"
                      type="text"
                      placeholder={labels.statePlaceholder}
                      value={orgState}
                      onChange={(e) => setOrgState(e.target.value.toUpperCase().slice(0, labels.stateMaxLength))}
                      disabled={isSubmitting}
                      className="h-11 bg-muted/50 shadow-sm"
                      maxLength={labels.stateMaxLength}
                    />
                  </div>
                </div>
              </div>

              {/* ========== Section 2: Administrator Data ========== */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Dados do Administrador do Sistema</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="adminName">Nome Completo *</Label>
                    <Input
                      id="adminName"
                      type="text"
                      placeholder="Nome completo"
                      value={adminName}
                      onChange={(e) => { setAdminName(e.target.value); setError(null); }}
                      disabled={isSubmitting}
                      className="h-11 bg-muted/50 shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone *</Label>
                    <PhoneInput
                      value={adminPhone}
                      country={adminPhoneCountry}
                      onValueChange={setAdminPhone}
                      onCountryChange={setAdminPhoneCountry}
                      disabled={isSubmitting}
                      showValidation={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>WhatsApp *</Label>
                    <PhoneInput
                      value={adminWhatsapp}
                      country={adminWhatsappCountry}
                      onValueChange={setAdminWhatsapp}
                      onCountryChange={setAdminWhatsappCountry}
                      disabled={isSubmitting}
                      showValidation={false}
                    />
                  </div>
                </div>
              </div>

              {/* ========== Section 3: Login Credentials ========== */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Credenciais de Acesso ao Sistema</h2>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 border space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Escolha como deseja fazer login no sistema.
                  </p>

                  {/* Login method toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setLoginMethod("phone"); setError(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        loginMethod === "phone" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      Telefone
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLoginMethod("email"); setError(null); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        loginMethod === "email" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      E-mail
                    </button>
                  </div>

                  {loginMethod === "phone" ? (
                    <div className="space-y-2">
                      <Label>Telefone para Login *</Label>
                      <PhoneInput
                        value={loginPhone}
                        country={loginPhoneCountry}
                        onValueChange={(val) => { setLoginPhone(val); setError(null); }}
                        onCountryChange={setLoginPhoneCountry}
                        disabled={isSubmitting}
                        showFieldLabels
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="loginEmail">E-mail para Login *</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => { setLoginEmail(e.target.value); setError(null); }}
                        disabled={isSubmitting}
                        className="h-11 bg-muted/50 shadow-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(null); }}
                          disabled={isSubmitting}
                          className="h-11 pr-10 bg-muted/50 shadow-sm"
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

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite a senha novamente"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                        disabled={isSubmitting}
                        className="h-11 bg-muted/50 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar Igreja"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Já possui uma conta?{" "}
                <Link to="/" className="font-medium text-primary hover:underline">
                  Faça login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <ScrollToTopButton scrollRef={scrollRef} />
    </div>
  );
};

export default Register;
