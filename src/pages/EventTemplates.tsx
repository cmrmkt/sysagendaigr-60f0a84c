import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarClock, Loader2, ArrowLeft } from "lucide-react";
import { useEventTemplates, EventTemplate } from "@/hooks/useEventTemplates";
import { TemplateCard } from "@/components/event-templates/TemplateCard";
import { TemplateFormModal } from "@/components/event-templates/TemplateFormModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const EventTemplates = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { canCreate } = useSubscriptionStatus();
  const {
    templates,
    isLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    toggleActive,
    isAdding,
    isUpdating,
  } = useEventTemplates();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null);
  
  const canManageTemplates = role !== "viewer" && canCreate;

  const handleEdit = (template: EventTemplate) => {
    setEditingTemplate(template);
    setShowFormModal(true);
  };

  const handleCloseModal = (open: boolean) => {
    setShowFormModal(open);
    if (!open) {
      setEditingTemplate(null);
    }
  };

  const handleSubmit = async (data: Parameters<typeof addTemplate>[0]) => {
    if (editingTemplate) {
      await updateTemplate({ ...data, id: editingTemplate.id });
    } else {
      await addTemplate(data);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await toggleActive({ id, is_active: isActive });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b p-4 lg:p-6 -m-4 lg:-m-6 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Eventos Padrões</h1>
              <p className="text-muted-foreground">
                Configure templates de eventos para agilizar a criação
              </p>
            </div>
          </div>
          {canManageTemplates && (
            <Button onClick={() => setShowFormModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          )}
        </div>
      </header>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum evento padrão cadastrado
            </h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Crie templates de eventos frequentes como "Culto de Domingo" ou
              "Reunião de Oração" para facilitar a criação de novos eventos.
            </p>
            {canManageTemplates && (
              <Button onClick={() => setShowFormModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              canManage={canManageTemplates}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <TemplateFormModal
        open={showFormModal}
        onOpenChange={handleCloseModal}
        template={editingTemplate}
        onSubmit={handleSubmit}
        isSubmitting={isAdding || isUpdating}
      />
    </div>
  );
};

export default EventTemplates;
