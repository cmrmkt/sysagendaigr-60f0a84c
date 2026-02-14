import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  FileText,
  Activity,
  Eye,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { useOrganization, useUpdateOrganization, useSuspendOrganization } from "@/hooks/useOrganizations";
import { useInvoices, useCreateInvoice, useMarkInvoicePaid } from "@/hooks/useInvoices";
import { useUsageLogs } from "@/hooks/useUsageLogs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrganizationStatusBadge, SubscriptionStatusBadge, InvoiceStatusBadge } from "@/components/super-admin/StatusBadges";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResetPasswordModal } from "@/components/super-admin/ResetPasswordModal";

const OrganizationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setViewingAsOrganization } = useAuth();

  const { data: organization, isLoading } = useOrganization(id);
  const { data: invoices } = useInvoices(id);
  const { data: logs } = useUsageLogs({ organizationId: id, limit: 50 });
  const createInvoice = useCreateInvoice();
  const markPaid = useMarkInvoicePaid();
  const suspendOrganization = useSuspendOrganization();

  // Fetch users of this organization
  const { data: users } = useQuery({
    queryKey: ["org-users", id],
    queryFn: async () => {
      if (!id) return [];
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", id)
        .order("name");
      
      if (!profiles) return [];
      
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .maybeSingle();
          
          return {
            ...profile,
            role: roleData?.role || "viewer",
          };
        })
      );
      
      return usersWithRoles;
    },
    enabled: !!id,
  });

  const [newInvoiceDialog, setNewInvoiceDialog] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    amount: "",
    description: "",
    reference_month: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(), "yyyy-MM-dd"),
  });
  
  // Reset password modal state
  const [resetPasswordUser, setResetPasswordUser] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);

  const handleViewAs = () => {
    if (organization) {
      setViewingAsOrganization(organization);
      navigate("/dashboard");
    }
  };

  const handleCreateInvoice = async () => {
    if (!id) return;
    await createInvoice.mutateAsync({
      organization_id: id,
      amount: parseFloat(newInvoice.amount),
      description: newInvoice.description || null,
      reference_month: newInvoice.reference_month,
      due_date: newInvoice.due_date,
      status: "pending",
      paid_at: null,
      payment_method: null,
      notes: null,
    });
    setNewInvoiceDialog(false);
    setNewInvoice({
      amount: "",
      description: "",
      reference_month: format(new Date(), "yyyy-MM-dd"),
      due_date: format(new Date(), "yyyy-MM-dd"),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Organização não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/super-admin/organizacoes")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin/organizacoes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{organization.name}</h1>
            <OrganizationStatusBadge status={organization.status} />
            <SubscriptionStatusBadge status={organization.subscription_status} />
          </div>
          <p className="text-muted-foreground">{organization.slug}</p>
        </div>
        <Button onClick={handleViewAs}>
          <Eye className="w-4 h-4 mr-2" />
          Visualizar como
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info" className="gap-2">
            <Building2 className="w-4 h-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Usuários ({users?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" />
            Faturas ({invoices?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {organization.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{organization.email}</span>
                  </div>
                )}
                {organization.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{organization.phone}</span>
                  </div>
                )}
                {organization.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{organization.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>{organization.country_code}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <SubscriptionStatusBadge status={organization.subscription_status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor mensal:</span>
                  <span className="font-medium">
                    R$ {(organization.subscription_amount || 99.90).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dia de vencimento:</span>
                  <span className="font-medium">{organization.billing_day || 10}</span>
                </div>
                {organization.trial_ends_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trial até:</span>
                    <span className="font-medium">
                      {format(new Date(organization.trial_ends_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Usuários:</span>
                  <span className="font-medium">{users?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Criado em:</span>
                  <span className="font-medium">
                    {organization.created_at
                      ? format(new Date(organization.created_at), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {organization.status === "active" && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => suspendOrganization.mutate({ id: organization.id, suspend: true })}
                  >
                    Suspender Organização
                  </Button>
                )}
                {organization.status === "suspended" && (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => suspendOrganization.mutate({ id: organization.id, suspend: false })}
                  >
                    Reativar Organização
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              {user.email && (
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role || "viewer"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.created_at
                            ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setResetPasswordUser({
                              id: user.id,
                              name: user.name,
                              phone: user.phone,
                            })}
                            title="Resetar senha"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Faturas</CardTitle>
                <CardDescription>Histórico de cobranças desta organização</CardDescription>
              </div>
              <Button onClick={() => setNewInvoiceDialog(true)}>
                <CreditCard className="w-4 h-4 mr-2" />
                Nova Fatura
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma fatura encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices?.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {format(new Date(invoice.reference_month), "MMMM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {invoice.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          {invoice.paid_at
                            ? format(new Date(invoice.paid_at), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {invoice.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markPaid.mutate({ id: invoice.id })}
                            >
                              Marcar pago
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Uso</CardTitle>
              <CardDescription>Últimas 50 atividades desta organização</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Recurso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={log.user.avatar_url || undefined} />
                                <AvatarFallback>{log.user.name?.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{log.user.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          {log.resource_name || log.resource_type || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Invoice Dialog */}
      <Dialog open={newInvoiceDialog} onOpenChange={setNewInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Fatura</DialogTitle>
            <DialogDescription>Criar uma nova fatura para {organization.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                placeholder="99.90"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                placeholder="Mensalidade..."
              />
            </div>
            <div>
              <Label>Mês de Referência</Label>
              <Input
                type="date"
                value={newInvoice.reference_month}
                onChange={(e) => setNewInvoice({ ...newInvoice, reference_month: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={newInvoice.due_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewInvoiceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInvoice} disabled={!newInvoice.amount}>
              Criar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        open={!!resetPasswordUser}
        onOpenChange={(open) => !open && setResetPasswordUser(null)}
        user={resetPasswordUser}
      />
    </div>
  );
};

export default OrganizationDetails;
