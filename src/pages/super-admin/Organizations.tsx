import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Calendar,
  Search,
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { 
  useOrganizations, 
  useApproveOrganization, 
  useSuspendOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  OrganizationWithStats,
} from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationStatusBadge, SubscriptionStatusBadge } from "@/components/super-admin/StatusBadges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import OrganizationFormModal from "@/components/super-admin/OrganizationFormModal";

// Generate alert sound using Web Audio API
const playAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;
    
    // Create a few beeps with different frequencies
    const frequencies = [800, 1000, 800]; // Hz
    const duration = 0.15; // seconds
    const gap = 0.1; // seconds between beeps
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      // Fade in/out
      gainNode.gain.setValueAtTime(0, now + index * (duration + gap));
      gainNode.gain.linearRampToValueAtTime(0.3, now + index * (duration + gap) + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, now + index * (duration + gap) + duration);
      
      oscillator.start(now + index * (duration + gap));
      oscillator.stop(now + index * (duration + gap) + duration);
    });
  } catch (err) {
    console.error('Failed to play alert sound:', err);
  }
};

const Organizations = () => {
  const navigate = useNavigate();
  const { setViewingAsOrganization } = useAuth();
  const { data: organizations, isLoading } = useOrganizations();
  const approveOrganization = useApproveOrganization();
  const suspendOrganization = useSuspendOrganization();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; orgId: string; orgName: string }>({
    open: false,
    orgId: "",
    orgName: "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; orgId: string; orgName: string }>({
    open: false,
    orgId: "",
    orgName: "",
  });
  const [formModal, setFormModal] = useState<{ open: boolean; organization: OrganizationWithStats | null }>({
    open: false,
    organization: null,
  });

  // Polling for new organizations
  const previousOrgCountRef = useRef<number>(0);

  useEffect(() => {
    if (!organizations) return;

    const currentCount = organizations.length;
    const previousCount = previousOrgCountRef.current;

    // Skip first load
    if (previousCount === 0) {
      previousOrgCountRef.current = currentCount;
      return;
    }

    // Detect new organization
    if (currentCount > previousCount) {
      const newOrgs = organizations.slice(
        0,
        currentCount - previousCount
      );
      const newestOrg = newOrgs[0];

      // Play alert sound
      playAlertSound();

      // Show toast notification
      toast.success(
        `🎉 Nova organização cadastrada: ${newestOrg.name}`,
        {
          description: `País: ${newestOrg.country_code} | Período de teste: 7 dias`,
          duration: 5000,
        }
      );
    }

    previousOrgCountRef.current = currentCount;
  }, [organizations]);

  // Filter organizations
  const filteredOrgs = organizations?.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase()) ||
      org.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || org.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: organizations?.length || 0,
    active: organizations?.filter((o) => o.status === "active").length || 0,
    pending: organizations?.filter((o) => o.status === "pending").length || 0,
    suspended: organizations?.filter((o) => o.status === "suspended").length || 0,
  };

  const handleViewAs = (org: typeof organizations extends (infer T)[] | undefined ? T : never) => {
    setViewingAsOrganization(org);
    navigate("/dashboard");
  };

  const handleApprove = async (orgId: string) => {
    await approveOrganization.mutateAsync({ id: orgId });
  };

  const handleSuspend = async () => {
    if (suspendDialog.orgId) {
      await suspendOrganization.mutateAsync({ id: suspendDialog.orgId, suspend: true });
      setSuspendDialog({ open: false, orgId: "", orgName: "" });
    }
  };

  const handleReactivate = async (orgId: string) => {
    await suspendOrganization.mutateAsync({ id: orgId, suspend: false });
  };

  const handleDelete = async () => {
    if (deleteDialog.orgId) {
      await deleteOrganization.mutateAsync(deleteDialog.orgId);
      setDeleteDialog({ open: false, orgId: "", orgName: "" });
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (data.id) {
      await updateOrganization.mutateAsync(data);
    } else {
      await createOrganization.mutateAsync(data);
    }
    setFormModal({ open: false, organization: null });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as igrejas cadastradas no sistema
          </p>
        </div>
        <Button onClick={() => setFormModal({ open: true, organization: null })}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Organização
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspensas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.suspended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="suspended">Suspensas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead className="text-center">Eventos</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredOrgs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma organização encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs?.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt={org.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <OrganizationStatusBadge status={org.status} />
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge 
                        status={org.subscription_status} 
                        trialEndsAt={org.trial_ends_at}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{org.users_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{org.events_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.created_at
                        ? format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {org.last_activity_at ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(org.last_activity_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem atividade</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/super-admin/organizacoes/${org.id}`)}>
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setFormModal({ open: true, organization: org })}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewAs(org)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar como
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {org.status === "pending" && (
                            <DropdownMenuItem
                              onClick={() => handleApprove(org.id)}
                              className="text-emerald-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprovar
                            </DropdownMenuItem>
                          )}
                          {org.status === "suspended" && (
                            <DropdownMenuItem
                              onClick={() => handleReactivate(org.id)}
                              className="text-emerald-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Reativar
                            </DropdownMenuItem>
                          )}
                          {org.status === "active" && (
                            <DropdownMenuItem
                              onClick={() =>
                                setSuspendDialog({ open: true, orgId: org.id, orgName: org.name })
                              }
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteDialog({ open: true, orgId: org.id, orgName: org.name })
                            }
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => !open && setSuspendDialog({ open: false, orgId: "", orgName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender organização?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja suspender <strong>{suspendDialog.orgName}</strong>?
              Os usuários desta organização não conseguirão acessar o sistema enquanto estiver suspensa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, orgId: "", orgName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir organização?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteDialog.orgName}</strong>?
              Esta ação é irreversível e todos os dados desta organização serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Organization Form Modal */}
      <OrganizationFormModal
        open={formModal.open}
        onOpenChange={(open) => !open && setFormModal({ open: false, organization: null })}
        organization={formModal.organization}
        onSubmit={handleFormSubmit}
        isLoading={createOrganization.isPending || updateOrganization.isPending}
      />
    </div>
  );
};

export default Organizations;
