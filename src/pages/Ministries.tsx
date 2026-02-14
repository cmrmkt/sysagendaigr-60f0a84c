import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useData } from "@/contexts/DataContext";
import type { Ministry } from "@/hooks/useMinistries";
import { useToast } from "@/hooks/use-toast";
import { findSimilarityConflict } from "@/lib/colors/colorDistance";
import { MINISTRY_COLOR_OPTIONS } from "@/lib/colors/ministryColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { AlertCircle } from "lucide-react";
import { useNavigate as useNavigateRouter } from "react-router-dom";

// Limiar de similaridade: quanto MENOR, mais cores disponíveis
// Vamos afrouxar gradualmente (se necessário) para garantir no mínimo 8 opções,
// sem jamais exibir cores iguais às já usadas por outros ministérios.
const MIN_COLOR_DISTANCE_THRESHOLD_START = 0.32;
const MIN_COLOR_DISTANCE_THRESHOLD_MIN = 0.14;
const MIN_COLOR_DISTANCE_THRESHOLD_STEP = 0.03;
const MIN_AVAILABLE_COLORS = 8;

const allColorOptions = MINISTRY_COLOR_OPTIONS;

const Ministries = () => {
  const navigate = useNavigate();
  const navigateRouter = useNavigateRouter();
  const { ministries, users, addMinistry, updateMinistry } = useData();
  const { toast } = useToast();
  const { role } = useAuth();
  const { canCreate, canEdit } = useSubscriptionStatus();
  
  const canManageMinistries = role !== "viewer" && canCreate;
  const hasNoUsers = users.length === 0;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(allColorOptions[0].value);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formLeaderId, setFormLeaderId] = useState("");

  // Cores usadas por OUTROS ministérios (exclui o ministério sendo editado)
  const usedColorsExcludingCurrent = useMemo(() => {
    return ministries
      .filter((m) => (editingMinistry ? m.id !== editingMinistry.id : true))
      .map((m) => m.color);
  }, [ministries, editingMinistry]);

  const colorPicker = useMemo(() => {
    const compute = (threshold: number) => {
      const options = allColorOptions.filter((option) => {
        // nunca mostrar uma cor já em uso por OUTRO ministério
        if (usedColorsExcludingCurrent.includes(option.value)) return false;
        // nunca mostrar cores "parecidas" com as cores de OUTROS ministérios (conforme o threshold atual)
        const conflict = findSimilarityConflict(option.value, usedColorsExcludingCurrent, threshold);
        return !conflict;
      });
      return options;
    };

    let threshold = MIN_COLOR_DISTANCE_THRESHOLD_START;
    let options = compute(threshold);

    // Se ficarem poucas opções, afrouxa um pouco a regra de similaridade,
    // até atingir pelo menos MIN_AVAILABLE_COLORS (ou o mínimo permitido).
    while (options.length < MIN_AVAILABLE_COLORS && threshold > MIN_COLOR_DISTANCE_THRESHOLD_MIN) {
      threshold = Math.max(MIN_COLOR_DISTANCE_THRESHOLD_MIN, threshold - MIN_COLOR_DISTANCE_THRESHOLD_STEP);
      options = compute(threshold);
      if (threshold === MIN_COLOR_DISTANCE_THRESHOLD_MIN) break;
    }

    return { options, threshold };
  }, [usedColorsExcludingCurrent]);

  const availableColorOptions = colorPicker.options;
  const effectiveColorThreshold = colorPicker.threshold;

  const similarityConflict = useMemo(() => {
    return findSimilarityConflict(formColor, usedColorsExcludingCurrent, effectiveColorThreshold);
  }, [formColor, usedColorsExcludingCurrent, effectiveColorThreshold]);

  const isColorInvalid = Boolean(similarityConflict);

  const handleToggleActive = (ministryId: string, currentValue: boolean) => {
    updateMinistry(ministryId, { isActive: !currentValue });
    toast({
      title: "Status atualizado",
      description: `Ministério ${!currentValue ? "ativado" : "desativado"}.`,
    });
  };

  const handleEditMinistry = (ministry: Ministry) => {
    setEditingMinistry(ministry);
    setFormName(ministry.name);
    setFormColor(ministry.color);
    setFormIsActive(ministry.isActive);
    setFormLeaderId(ministry.leaderId || "");
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingMinistry(null);
    setFormName("");

    // Seleciona a primeira cor realmente disponível (não usada e não parecida)
    const firstAvailable = availableColorOptions[0]?.value ?? allColorOptions[0].value;
    setFormColor(firstAvailable);

    setFormIsActive(true);
    setFormLeaderId("");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const trimmedName = formName.trim();

    if (!trimmedName) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do ministério.",
        variant: "destructive",
      });
      return;
    }

    if (!formLeaderId) {
      toast({
        title: "Líder obrigatório",
        description: "Selecione um líder para o ministério.",
        variant: "destructive",
      });
      return;
    }

    // Garantia final: nunca permitir cor igual OU parecida com outro ministério
    const conflict = findSimilarityConflict(formColor, usedColorsExcludingCurrent, effectiveColorThreshold);
    if (conflict) {
      toast({
        title: "Cor muito parecida",
        description:
          "Escolha uma cor bem diferente. Não é permitido usar uma cor igual ou muito semelhante à de outro ministério.",
        variant: "destructive",
      });
      return;
    }

    if (editingMinistry) {
      updateMinistry(editingMinistry.id, {
        name: trimmedName,
        color: formColor,
        isActive: formIsActive,
        leaderId: formLeaderId,
      });
      toast({
        title: "Ministério atualizado",
        description: `"${trimmedName}" foi atualizado com sucesso.`,
      });
    } else {
      addMinistry({
        name: trimmedName,
        color: formColor,
        isActive: formIsActive,
        leaderId: formLeaderId,
      });
      toast({
        title: "Ministério criado",
        description: `"${trimmedName}" foi adicionado ao sistema.`,
      });
    }

    setIsModalOpen(false);
    setEditingMinistry(null);
  };

  return (
    <div className="min-h-full bg-background">
      <header className="bg-card border-b p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}
              aria-label="Voltar ao dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Ministérios</h1>
              <p className="text-sm text-muted-foreground">Gerencie os ministérios da igreja</p>
            </div>
          </div>
        {canManageMinistries && (
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Ministério
          </Button>
        )}
        </div>
      </header>

      <div className="p-4 lg:p-6">
        {hasNoUsers && canManageMinistries && (
          <Alert className="mb-6 border-yellow-200/50 bg-yellow-50/50 dark:bg-yellow-950/10">
            <AlertCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-200">Cadastre membros primeiro</AlertTitle>
            <AlertDescription className="text-yellow-800 dark:text-yellow-100 mt-2">
              Para criar um ministério, você precisa cadastrar pelo menos um membro que será designado como líder.{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-yellow-700 dark:text-yellow-300 underline"
                onClick={() => navigateRouter("/membros")}
              >
                Ir para Membros
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ministries.map((ministry) => (
            <Card
              key={ministry.id}
              className={`animate-fade-in transition-opacity ${!ministry.isActive ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: ministry.color }}
                    >
                      <span className="text-white text-lg font-semibold">{ministry.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{ministry.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ministry.leaderName ? `Líder: ${ministry.leaderName}` : "Sem líder"} · {ministry.isActive ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={ministry.isActive}
                      onCheckedChange={() => handleToggleActive(ministry.id, ministry.isActive)}
                      disabled={!canManageMinistries}
                    />
                    {canManageMinistries && (
                      <Button variant="ghost" size="icon" onClick={() => handleEditMinistry(ministry)} aria-label="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingMinistry(null);
        }}
      >
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden">
          <div className="overflow-y-auto max-h-[85vh] p-6">
            <DialogHeader>
              <DialogTitle>{editingMinistry ? "Editar Ministério" : "Novo Ministério"}</DialogTitle>
            </DialogHeader>

            <form
              className="space-y-6 pb-4 mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="ministryName">Nome do Ministério</Label>
                <Input
                  id="ministryName"
                  placeholder="Ex: Louvor, Infantil, Jovens..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="bg-muted/50 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Líder do Ministério *</Label>
                <Select value={formLeaderId} onValueChange={setFormLeaderId}>
                  <SelectTrigger className="bg-muted/50 shadow-sm">
                    <SelectValue placeholder="Selecione o líder" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor do Ministério</Label>

                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-4 w-4 rounded-sm border border-border"
                      style={{ backgroundColor: formColor }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground truncate">
                      Selecionada: {allColorOptions.find((c) => c.value === formColor)?.name || "Personalizada"}
                    </span>
                  </div>
                  {isColorInvalid ? <span className="text-xs text-destructive">muito parecida</span> : null}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {availableColorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormColor(color.value)}
                      className={`w-full aspect-square rounded-lg transition-all ${
                        formColor === color.value ? "ring-2 ring-offset-2 ring-primary scale-95" : "hover:scale-95"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                      aria-label={`Selecionar cor ${color.name}`}
                    />
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  As cores disponíveis são únicas e também filtradas para evitar cores muito parecidas entre si.
                </p>
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 shadow-sm">
                <Label htmlFor="isActive">Ministério ativo</Label>
                <Switch id="isActive" checked={formIsActive} onCheckedChange={setFormIsActive} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingMinistry(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isColorInvalid}>
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ministries;
