import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EventTemplate, EventTemplateInput } from "@/hooks/useEventTemplates";
import { Loader2 } from "lucide-react";
import { MinistrySelectWithCreate } from "@/components/shared/MinistrySelectWithCreate";
import { MinistryMultiSelectWithCreate } from "@/components/shared/MinistryMultiSelectWithCreate";

interface TemplateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EventTemplate | null;
  onSubmit: (data: EventTemplateInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function TemplateFormModal({
  open,
  onOpenChange,
  template,
  onSubmit,
  isSubmitting,
}: TemplateFormModalProps) {

  const [title, setTitle] = useState("");
  const [ministryId, setMinistryId] = useState<string>("none");
  const [collaboratorMinistryIds, setCollaboratorMinistryIds] = useState<string[]>([]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setMinistryId(template.ministry_id || "none");
      setCollaboratorMinistryIds(template.collaborator_ministry_ids || []);
      setIsAllDay(template.is_all_day ?? false);
      setObservations(template.observations || "");
    } else {
      resetForm();
    }
  }, [template, open]);

  const resetForm = () => {
    setTitle("");
    setMinistryId("none");
    setCollaboratorMinistryIds([]);
    setIsAllDay(false);
    setObservations("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      title,
      ministry_id: ministryId === "none" ? null : ministryId,
      collaborator_ministry_ids: collaboratorMinistryIds.length > 0 ? collaboratorMinistryIds : null,
      is_all_day: isAllDay,
      observations: observations || null,
    });
    
    onOpenChange(false);
  };

  // Filter out the responsible ministry from collaborator options
  const excludedMinistryIds = ministryId !== "none" ? [ministryId] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-0 flex-shrink-0">
          <DialogTitle>
            {template ? "Editar Evento Padrão" : "Novo Evento Padrão"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 p-6 pt-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Evento *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Culto de Domingo"
                required
                className="bg-muted/50 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ministry">Ministério Responsável</Label>
              <MinistrySelectWithCreate
                value={ministryId}
                onValueChange={setMinistryId}
                showNone
                noneLabel="Nenhum"
              />
            </div>

            <MinistryMultiSelectWithCreate
              value={collaboratorMinistryIds}
              onValueChange={setCollaboratorMinistryIds}
              excludeIds={excludedMinistryIds}
              label="Ministérios Colaboradores"
            />

            <div className="flex items-center justify-between">
              <Label htmlFor="all-day">Dia Inteiro</Label>
              <Switch
                id="all-day"
                checked={isAllDay}
                onCheckedChange={setIsAllDay}
              />
            </div>

            <div className="space-y-2 pb-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observações padrão para este tipo de evento..."
                rows={3}
                className="bg-muted/50 shadow-sm"
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!title || isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {template ? "Salvar Alterações" : "Criar Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}