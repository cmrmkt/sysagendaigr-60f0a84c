import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter, MoreVertical, Edit, Trash2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

type FilterType = "all" | "published" | "draft";

const Announcements = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { canCreate, canEdit, canDelete } = useSubscriptionStatus();
  const { announcements, deleteAnnouncement, updateAnnouncement, getUserById } = useData();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const canManageAnnouncements = role !== "viewer" && canCreate;

  const filteredAnnouncements = announcements.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  }).sort((a, b) => {
    // Ordenar por data de criação (mais recente primeiro)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteAnnouncement(deleteId);
      toast({
        title: "Aviso excluído",
        description: "O aviso foi removido com sucesso.",
      });
      setDeleteId(null);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: "published" | "draft") => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    updateAnnouncement(id, { status: newStatus });
    toast({
      title: newStatus === "published" ? "Aviso publicado" : "Aviso despublicado",
      description: newStatus === "published" 
        ? "O aviso agora está visível para todos." 
        : "O aviso foi movido para rascunhos.",
    });
  };

  const getStatusBadge = (status: "published" | "draft") => {
    if (status === "published") {
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Publicado</Badge>;
    }
    return <Badge variant="secondary">Rascunho</Badge>;
  };

  const getPriorityBadge = (priority: "normal" | "high" | "urgent") => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Urgente</Badge>;
      case "high":
        return <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30">Importante</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 lg:p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Mural de Avisos</h1>
            <p className="text-sm text-muted-foreground">Gerencie os avisos e comunicados da igreja</p>
          </div>
        </div>
      {canManageAnnouncements && (
        <Button onClick={() => navigate("/mural/novo")} className="hidden lg:flex">
          <Plus className="w-4 h-4 mr-2" />
          Novo Aviso
        </Button>
      )}
      </header>

      {/* Content */}
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1 bg-secondary p-1 rounded-lg">
            {(["all", "published", "draft"] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todos" : f === "published" ? "Publicados" : "Rascunhos"}
              </Button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            {filteredAnnouncements.length} {filteredAnnouncements.length === 1 ? "aviso" : "avisos"}
          </span>
        </div>

        {/* Announcements Grid */}
        {filteredAnnouncements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnnouncements.map((announcement) => {
              const creator = getUserById(announcement.createdBy);
              return (
                <div key={announcement.id} className="relative group">
                  <AnnouncementCard
                    announcement={announcement}
                    onClick={() => navigate(`/mural/editar/${announcement.id}`)}
                  />
                  
                  {/* Status overlay */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    {getStatusBadge(announcement.status)}
                    {getPriorityBadge(announcement.priority)}
                  </div>

                  {/* Actions dropdown */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      {canManageAnnouncements && (
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/mural/editar/${announcement.id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(announcement.id, announcement.status)}>
                            {announcement.status === "published" ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Despublicar
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Publicar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteId(announcement.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      )}
                    </DropdownMenu>
                  </div>

                  {/* Creator info */}
                  <p className="text-xs text-muted-foreground mt-2">
                    Por {creator?.name || "Desconhecido"} • {announcement.createdAt}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhum aviso encontrado
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filter === "all" 
                ? "Comece criando seu primeiro aviso."
                : `Não há avisos ${filter === "published" ? "publicados" : "em rascunho"}.`}
            </p>
            {filter === "all" && canManageAnnouncements && (
              <Button onClick={() => navigate("/mural/novo")}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Aviso
              </Button>
            )}
          </div>
        )}
      </div>

      {/* FAB Mobile */}
      {canManageAnnouncements && (
        <Button
          onClick={() => navigate("/mural/novo")}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O aviso será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Announcements;
