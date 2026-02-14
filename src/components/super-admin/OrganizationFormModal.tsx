import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrganizationWithStats } from "@/hooks/useOrganizations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Copy, 
  Check, 
  MessageCircle,
  User
} from "lucide-react";
import { formatPhoneDisplay } from "@/components/auth/PhoneInput";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country_code: z.string().default("BR"),
  status: z.enum(["pending", "active", "suspended"]),
  subscription_status: z.enum(["trial", "active", "suspended", "cancelled"]),
  subscription_amount: z.coerce.number().min(0).optional(),
  billing_day: z.coerce.number().min(1).max(28).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OrganizationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: OrganizationWithStats | null;
  onSubmit: (data: FormValues & { id?: string }) => Promise<void>;
  isLoading?: boolean;
}

const OrganizationFormModal = ({
  open,
  onOpenChange,
  organization,
  onSubmit,
  isLoading,
}: OrganizationFormModalProps) => {
  const isEditing = !!organization;
  
  // Admin credentials states
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch organization admin with extended profile data
  const { data: adminUser, isLoading: isLoadingAdmin } = useQuery({
    queryKey: ["org-admin", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, phone, phone_country, personal_id, national_id, whatsapp, whatsapp_country, address")
        .eq("organization_id", organization.id);
      
      if (profilesError || !profiles?.length) return null;
      
      for (const profile of profiles) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id)
          .eq("role", "admin")
          .maybeSingle();
        
        if (roleData) return profile;
      }
      return null;
    },
    enabled: !!organization?.id && open,
  });

  // Generate random 8-character password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setPasswordReset(false);
    setCopied(false);
  };

  // Get formatted phone based on organization country
  const getFormattedPhone = () => {
    if (!adminUser?.phone) return "";
    const country = (organization?.country_code || "BR") as "BR" | "US" | "CA" | "PT";
    return formatPhoneDisplay(adminUser.phone, country);
  };

  // Format credentials message
  const getCredentialsMessage = () => {
    if (!adminUser) return "";
    return `📱 Login: ${getFormattedPhone()}\n🔑 Senha: ${newPassword}`;
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCredentialsMessage());
      setCopied(true);
      toast.success("Credenciais copiadas!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
    if (!adminUser?.phone) return;
    
    const cleanPhone = adminUser.phone.replace(/\D/g, "");
    const countryDialCode = organization?.country_code === "BR" ? "55" : organization?.country_code === "PT" ? "351" : "1";
    const message = encodeURIComponent(
      `Olá! Seguem suas credenciais de acesso ao AgendaIGR:\n\n${getCredentialsMessage()}\n\nAcesse: https://agendaigr.lovable.app`
    );
    window.open(`https://wa.me/${countryDialCode}${cleanPhone}?text=${message}`, "_blank");
  };

  // Reset password via Edge Function
  const handleResetPassword = async () => {
    if (!adminUser || !newPassword || !organization) return;
    
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          targetUserId: adminUser.id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log action for audit
      await supabase.from("usage_logs").insert({
        organization_id: organization.id,
        user_id: null,
        action: "admin.password_reset",
        resource_type: "user",
        resource_id: adminUser.id,
        resource_name: adminUser.name,
        metadata: {
          reset_by: "super_admin",
          target_phone: adminUser.phone,
          target_role: "admin"
        }
      });

      toast.success("Senha alterada com sucesso!");
      setPasswordReset(true);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setIsResetting(false);
    }
  };

  // Reset credential states when modal closes
  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setShowPassword(false);
      setPasswordReset(false);
      setCopied(false);
    }
  }, [open]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      address: "",
      tax_id: "",
      city: "",
      state: "",
      postal_code: "",
      country_code: "BR",
      status: "pending",
      subscription_status: "trial",
      subscription_amount: 99.90,
      billing_day: 10,
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        slug: organization.slug,
        email: organization.email || "",
        phone: organization.phone || "",
        address: organization.address || "",
        tax_id: (organization as any).tax_id || "",
        city: (organization as any).city || "",
        state: (organization as any).state || "",
        postal_code: (organization as any).postal_code || "",
        country_code: organization.country_code,
        status: organization.status as "pending" | "active" | "suspended",
        subscription_status: organization.subscription_status as "trial" | "active" | "suspended" | "cancelled",
        subscription_amount: organization.subscription_amount || 99.90,
        billing_day: organization.billing_day || 10,
      });
    } else {
      form.reset({
        name: "",
        slug: "",
        email: "",
        phone: "",
        address: "",
        tax_id: "",
        city: "",
        state: "",
        postal_code: "",
        country_code: "BR",
        status: "pending",
        subscription_status: "trial",
        subscription_amount: 99.90,
        billing_day: 10,
      });
    }
  }, [organization, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      ...values,
      id: organization?.id,
    });
  };

  // Auto-generate slug from name
  const watchName = form.watch("name");
  const watchCountry = form.watch("country_code");
  useEffect(() => {
    if (!isEditing && watchName) {
      const slug = watchName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("slug", slug);
    }
  }, [watchName, isEditing, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>
              {isEditing ? "Editar Organização" : "Nova Organização"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Igreja Exemplo" className="bg-muted/50 shadow-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug *</FormLabel>
                    <FormControl>
                      <Input placeholder="igreja-exemplo" className="bg-muted/50 shadow-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={watchCountry === "BR" ? "contato@igreja.com" : watchCountry === "PT" ? "contato@igreja.pt" : "contact@church.com"} className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCountry === "BR" || watchCountry === "PT" ? "Telefone" : "Phone"}</FormLabel>
                      <FormControl>
                        <Input placeholder={watchCountry === "BR" ? "(11) 99999-9999" : watchCountry === "PT" ? "912 345 678" : "(555) 123-4567"} className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchCountry === "US" || watchCountry === "CA" ? "Address" : "Endereço"}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={watchCountry === "BR" ? "Rua Exemplo, 123" : watchCountry === "PT" ? "Rua Exemplo, 123" : "123 Main Street"} className="bg-muted/50 shadow-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCountry === "BR" ? "CNPJ" : watchCountry === "PT" ? "NIF" : "Tax ID (EIN)"}</FormLabel>
                      <FormControl>
                        <Input placeholder={watchCountry === "BR" ? "00.000.000/0000-00" : watchCountry === "PT" ? "000000000" : "00-0000000"} className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCountry === "BR" ? "CEP" : watchCountry === "PT" ? "Código Postal" : "ZIP Code"}</FormLabel>
                      <FormControl>
                        <Input placeholder={watchCountry === "BR" ? "00000-000" : watchCountry === "PT" ? "0000-000" : "00000"} className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCountry === "US" || watchCountry === "CA" ? "City" : watchCountry === "PT" ? "Localidade" : "Cidade"}</FormLabel>
                      <FormControl>
                        <Input placeholder={watchCountry === "US" || watchCountry === "CA" ? "City" : watchCountry === "PT" ? "Localidade" : "Cidade"} className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCountry === "BR" ? "Estado (UF)" : watchCountry === "PT" ? "Distrito" : watchCountry === "CA" ? "Province" : "State"}</FormLabel>
                      <FormControl>
                        <Input placeholder={watchCountry === "BR" ? "UF" : watchCountry === "PT" ? "Distrito" : watchCountry === "CA" ? "Province" : "State"} className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/50 shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BR">🇧🇷 Brasil</SelectItem>
                          <SelectItem value="US">🇺🇸 Estados Unidos</SelectItem>
                          <SelectItem value="CA">🇨🇦 Canadá</SelectItem>
                          <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/50 shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="suspended">Suspenso</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="subscription_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assinatura</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted/50 shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="suspended">Suspenso</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subscription_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchCountry === "BR" ? "Valor (R$)" : watchCountry === "PT" ? "Valor (€)" : "Amount (US$)"}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia Cobrança</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={28} className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Admin Data Section - Only when editing */}
              {isEditing && adminUser && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Dados do Administrador
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Nome</label>
                      <p className="text-sm font-medium">{adminUser.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Login (Telefone)</label>
                      <p className="text-sm font-medium font-mono">{getFormattedPhone()}</p>
                    </div>
                    {(adminUser as any).personal_id && (
                      <div>
                        <label className="text-xs text-muted-foreground font-medium">
                          {watchCountry === "BR" ? "CPF" : watchCountry === "PT" ? "NIF Pessoal" : watchCountry === "CA" ? "SIN" : "SSN"}
                        </label>
                        <p className="text-sm font-medium font-mono">{(adminUser as any).personal_id}</p>
                      </div>
                    )}
                    {(adminUser as any).national_id && (
                      <div>
                        <label className="text-xs text-muted-foreground font-medium">
                          {watchCountry === "BR" ? "RG" : watchCountry === "PT" ? "CC" : "Driver License"}
                        </label>
                        <p className="text-sm font-medium font-mono">{(adminUser as any).national_id}</p>
                      </div>
                    )}
                    {(adminUser as any).whatsapp && (
                      <div>
                        <label className="text-xs text-muted-foreground font-medium">WhatsApp</label>
                        <p className="text-sm font-medium font-mono">
                          {formatPhoneDisplay((adminUser as any).whatsapp, ((adminUser as any).whatsapp_country || watchCountry) as "BR" | "US" | "CA" | "PT")}
                        </p>
                      </div>
                    )}
                    {(adminUser as any).address && (
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground font-medium">Endereço Pessoal</label>
                        <p className="text-sm font-medium">{(adminUser as any).address}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Credentials Section - Only when editing */}
              {isEditing && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    Credenciais do Assinante
                  </h4>
                  
                  {isLoadingAdmin ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando...
                    </div>
                  ) : adminUser ? (
                    <div className="space-y-4">
                      {/* Password Reset Section */}
                      <div className="space-y-3">
                        <label className="text-xs text-muted-foreground font-medium">Alterar Senha</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              value={newPassword}
                              placeholder="Clique em 'Gerar' para criar nova senha"
                              readOnly
                              className="pr-10 font-mono bg-muted/50 shadow-sm"
                            />
                            {newPassword && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            )}
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={generatePassword}
                            className="shrink-0"
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Gerar
                          </Button>
                        </div>
                      </div>
                      
                      {/* Credentials Preview */}
                      {newPassword && (
                        <div className="bg-background border rounded-md p-3 text-sm font-mono whitespace-pre-line">
                          {getCredentialsMessage()}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      {newPassword && (
                        <div className="flex flex-wrap gap-2">
                          {!passwordReset ? (
                            <Button 
                              type="button"
                              onClick={handleResetPassword} 
                              disabled={isResetting}
                              size="sm"
                            >
                              {isResetting ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <KeyRound className="w-4 h-4 mr-1" />
                              )}
                              Salvar Senha
                            </Button>
                          ) : (
                            <>
                              <Button 
                                type="button"
                                variant="outline" 
                                onClick={handleCopy}
                                size="sm"
                              >
                                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                {copied ? "Copiado!" : "Copiar"}
                              </Button>
                              <Button 
                                type="button"
                                variant="default"
                                onClick={handleSendWhatsApp}
                                size="sm"
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Enviar via WhatsApp
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum administrador encontrado para esta organização.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 pb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditing ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizationFormModal;
