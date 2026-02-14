import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Search, ArrowLeft, Phone, Copy, MessageCircle, Star, Eye, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import type { User, UserMinistryAssociation, MinistryRole } from "@/hooks/useUsers";
import PhoneInput from "@/components/auth/PhoneInput";
import { cn } from "@/lib/utils";
import { hslToHsla } from "@/lib/colors/hslToHsla";
import { ResendCredentialsModal } from "@/components/members/ResendCredentialsModal";

const roleLabels = {
  admin: { label: "Administrador", variant: "default" as const },
  leader: { label: "Líder", variant: "secondary" as const },
  viewer: { label: "Visualizador", variant: "outline" as const },
};

const Members = () => {
  const navigate = useNavigate();
  const { users, ministries, addUser, updateUser, getMinistryById } = useData();
  const { toast } = useToast();
  const { role, isLoading: isAuthLoading } = useAuth();
  const { canCreate, canEdit } = useSubscriptionStatus();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Viewers e assinaturas bloqueadas ficam somente-leitura (sem CRUD)
  const isViewer = role === "viewer";
  const isReadOnly = isViewer || !canEdit;
  const canManageMembers = (role === "admin" || role === "super_admin" || role === "leader") && canCreate && canEdit;

  // Success modal state (for new user creation)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserData, setCreatedUserData] = useState<{
    name: string;
    phone: string;
    temporaryPassword: string;
    whatsappMessage: string;
  } | null>(null);

  // Resend credentials modal state
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendUser, setResendUser] = useState<User | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPhoneCountry, setFormPhoneCountry] = useState("BR");
  const [formRole, setFormRole] = useState<"admin" | "leader" | "viewer">("viewer");
  const [formCanCreate, setFormCanCreate] = useState(false);
  const [formMinistryRoles, setFormMinistryRoles] = useState<Record<string, MinistryRole | "none">>({});
  

  const activeMinistries = ministries.filter((m) => m.isActive);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
      user.phone.includes(search)
  );

  const handleToggleCanCreate = async (userId: string, currentValue: boolean) => {
    try {
      await updateUser(userId, { canCreateEvents: !currentValue });
      toast({
        title: "Permissão atualizada",
        description: `Permissão de criar eventos ${!currentValue ? "concedida" : "removida"}.`,
      });
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email || "");
    setFormPhone(user.phone);
    setFormPhoneCountry(user.phone_country || "BR");
    setFormRole(user.role);
    setFormCanCreate(user.canCreateEvents);
    
    
    // Convert ministryAssociations to form state
    const roles: Record<string, MinistryRole | "none"> = {};
    user.ministryAssociations.forEach((assoc) => {
      roles[assoc.ministryId] = assoc.role;
    });
    setFormMinistryRoles(roles);
    
    setIsModalOpen(true);
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPhoneCountry("BR");
    setFormRole("viewer");
    setFormCanCreate(false);
    setFormMinistryRoles({});
    setIsModalOpen(true);
  };

  const handleMinistryRoleChange = (ministryId: string, role: string) => {
    setFormMinistryRoles((prev) => {
      if (role === "none") {
        const { [ministryId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ministryId]: role as MinistryRole };
    });
  };

  // Convert form state to ministryAssociations array
  const getMinistryAssociations = (): UserMinistryAssociation[] => {
    return Object.entries(formMinistryRoles)
      .filter(([_, role]) => role !== "none")
      .map(([ministryId, role]) => ({
        ministryId,
        role: role as MinistryRole,
      }));
  };

  const handleSave = async () => {
    if (isReadOnly) {
      return;
    }

    if (!formName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do membro.",
        variant: "destructive",
      });
      return;
    }

    if (!formPhone.trim()) {
      toast({
        title: "Telefone obrigatório",
        description: "Informe o telefone do membro.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const ministryAssociations = getMinistryAssociations();
      
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formName,
          email: formEmail || undefined,
          role: formRole,
          canCreateEvents: formCanCreate,
          ministryAssociations,
        });
        toast({
          title: "Membro atualizado",
          description: `"${formName}" foi atualizado com sucesso.`,
        });
        setIsModalOpen(false);
        setEditingUser(null);
      } else {
        // Create new user via Edge Function
        const result = await addUser({
          name: formName,
          phone: formPhone,
          phoneCountry: formPhoneCountry,
          role: formRole,
          canCreateEvents: formCanCreate,
          ministryAssociations,
          email: formEmail || undefined,
        });

        // Show success modal with credentials
        setCreatedUserData({
          name: formName,
          phone: formPhone,
          temporaryPassword: result.temporaryPassword,
          whatsappMessage: result.whatsappMessage,
        });
        setIsModalOpen(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      // Error handling is done in the hook
      console.error("Error saving user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyWhatsApp = () => {
    if (createdUserData?.whatsappMessage) {
      navigator.clipboard.writeText(createdUserData.whatsappMessage);
      toast({
        title: "Copiado!",
        description: "Mensagem copiada para a área de transferência.",
      });
    }
  };

  const handleOpenWhatsApp = () => {
    if (createdUserData) {
      const phoneNumber = createdUserData.phone.replace(/\D/g, "");
      const countryCode = formPhoneCountry === "BR" ? "55" : "1";
      const fullNumber = `${countryCode}${phoneNumber}`;
      const encodedMessage = encodeURIComponent(createdUserData.whatsappMessage);
      window.open(`https://wa.me/${fullNumber}?text=${encodedMessage}`, "_blank");
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-[60vh] w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="bg-card border-b p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Membros</h1>
              <p className="text-sm text-muted-foreground">Gerencie os membros da igreja</p>
            </div>
          </div>
          {canManageMembers && (
            <Button onClick={handleNewUser}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Membro
            </Button>
          )}
        </div>

        {/* Busca */}
        <div className="relative mt-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </header>

      {/* Lista de Membros */}
      <div className="p-4 lg:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {user.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canManageMembers && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setResendUser(user);
                          setShowResendModal(true);
                        }}
                        title="Reenviar credenciais"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    )}
                    {canManageMembers ? (
                      <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Ministérios do membro com papel */}
                {user.ministryAssociations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {user.ministryAssociations.map(({ ministryId, role }) => {
                      const ministry = getMinistryById(ministryId);
                      if (!ministry) return null;
                      const isLeader = role === "leader";
                      return (
                        <Badge
                          key={ministryId}
                          className="text-xs font-medium flex items-center gap-1 border-transparent"
                          style={{
                            backgroundColor: ministry.color,
                            color: "#FFFFFF",
                            border: "none",
                            boxShadow: `0 2px 8px ${hslToHsla(ministry.color, 0.3)}`,
                          }}
                        >
                          {isLeader && <Star className="w-3 h-3 fill-current" />}
                          {ministry.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}


                <div className="flex items-center justify-between pt-3 border-t">
                  <Badge variant={roleLabels[user.role].variant}>
                    {roleLabels[user.role].label}
                  </Badge>

                  <span className="text-xs text-muted-foreground">
                    {user.canCreateEvents ? "Pode criar eventos" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum membro encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal de Edição/Criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden">
          <div className="overflow-y-auto max-h-[85vh] p-6">
            <DialogHeader>
              <DialogTitle>
                {isReadOnly ? "Visualizar Membro" : editingUser ? "Editar Membro" : "Novo Membro"}
              </DialogTitle>
            </DialogHeader>

            <form
              className="space-y-4 pb-4 mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required={!isReadOnly}
                  disabled={isReadOnly}
                  className={cn("bg-muted/50 shadow-sm", isReadOnly && "bg-muted")}
                />
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <PhoneInput
                    value={formPhone}
                    onValueChange={setFormPhone}
                    country={formPhoneCountry as "BR" | "US"}
                    onCountryChange={(c) => setFormPhoneCountry(c)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O telefone será usado para login no sistema
                  </p>
                </div>
              )}

              {editingUser && (
                <div className="space-y-2">
                  {role === "admin" || role === "super_admin" ? (
                    <>
                      <Label>Telefone</Label>
                      <PhoneInput
                        value={formPhone}
                        onValueChange={setFormPhone}
                        country={formPhoneCountry as "BR" | "US"}
                        onCountryChange={(c) => setFormPhoneCountry(c)}
                      />
                    </>
                  ) : (
                    <>
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Telefone (não editável)
                      </Label>
                      <Input value={editingUser.phone} disabled className="bg-muted" />
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={isReadOnly}
                  className={cn("bg-muted/50 shadow-sm", isReadOnly && "bg-muted")}
                />
              </div>

              <div className="space-y-2">
                <Label>Perfil no Sistema</Label>
                <Select
                  value={formRole}
                  onValueChange={(v) => setFormRole(v as "admin" | "leader" | "viewer")}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className={cn("bg-muted/50 shadow-sm", isReadOnly && "bg-muted")}>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="leader">Líder</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Participação em Ministérios</Label>
                <div
                  className={cn(
                    "space-y-3 p-3 border rounded-lg max-h-48 overflow-y-auto shadow-sm",
                    isReadOnly ? "bg-muted" : "bg-muted/30"
                  )}
                >
                  {activeMinistries.map((ministry) => {
                    const currentRole = formMinistryRoles[ministry.id] || "none";
                    return (
                      <div key={ministry.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ministry.color }}
                          />
                          <span className="text-sm">{ministry.name}</span>
                        </div>
                        <Select
                          value={currentRole}
                          onValueChange={(v) => handleMinistryRoleChange(ministry.id, v)}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger className={cn("w-32 h-8 text-xs", isReadOnly && "bg-muted")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não participa</SelectItem>
                            <SelectItem value="member">Participante</SelectItem>
                            <SelectItem value="leader">Líder</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isReadOnly ? (
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingUser(null);
                    }}
                  >
                    Fechar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingUser(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso - Credenciais */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 p-6">
            <DialogHeader>
              <DialogTitle className="text-green-600">✓ Membro Criado!</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                O membro <strong>{createdUserData?.name}</strong> foi criado com sucesso.
                Envie as credenciais abaixo para que ele possa acessar o sistema:
              </p>

              <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                <p>📱 <strong>Login:</strong> {createdUserData?.phone}</p>
                <p>🔑 <strong>Senha:</strong> {createdUserData?.temporaryPassword}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                  <strong>Mensagem pronta para WhatsApp:</strong>
                </p>
                <p className="text-sm whitespace-pre-wrap">{createdUserData?.whatsappMessage}</p>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={handleCopyWhatsApp} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copiar Mensagem
              </Button>
              <Button onClick={handleOpenWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Reenvio de Credenciais */}
      <ResendCredentialsModal
        open={showResendModal}
        onOpenChange={(open) => {
          setShowResendModal(open);
          if (!open) {
            setSearch("");
            setResendUser(null);
          }
        }}
        user={resendUser}
      />
    </div>
  );
};

export default Members;
