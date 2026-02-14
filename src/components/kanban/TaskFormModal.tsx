import { useState, useEffect } from "react";
import type { EventTask, TaskPriority, TaskStatus } from "@/hooks/useEventTasks";
import { useData } from "@/contexts/DataContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  task?: EventTask | null;
  initialStatus?: TaskStatus;
}

const TaskFormModal = ({ isOpen, onClose, eventId, task, initialStatus = "todo" }: TaskFormModalProps) => {
  const { ministries, users, addTask, updateTask, getTasksByEventId } = useData();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ministryId, setMinistryId] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setMinistryId(task.ministryId || "");
      setPriority(task.priority);
      setDueDate(task.dueDate || "");
      setAssigneeIds(task.assigneeIds);
    } else {
      setTitle("");
      setDescription("");
      setMinistryId("");
      setPriority("medium");
      setDueDate("");
      setAssigneeIds([]);
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const existingTasks = getTasksByEventId(eventId);
    const maxOrder = existingTasks.length > 0 
      ? Math.max(...existingTasks.filter(t => t.status === (task?.status || initialStatus)).map(t => t.order))
      : -1;

    if (isEditing && task) {
      updateTask(task.id, {
        title,
        description: description || undefined,
        ministryId: ministryId || undefined,
        priority,
        dueDate: dueDate || undefined,
        assigneeIds,
      });
      toast({
        title: "Tarefa atualizada",
        description: "As alterações foram salvas com sucesso",
      });
    } else {
      addTask({
        eventId,
        title,
        description: description || undefined,
        status: initialStatus,
        ministryId: ministryId || undefined,
        priority,
        dueDate: dueDate || undefined,
        order: maxOrder + 1,
        assigneeIds,
      });
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi adicionada ao quadro",
      });
    }

    onClose();
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const responsibleUsers = users.filter(u => u.canCreateEvents);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] w-[calc(100vw-2rem)] max-h-[85vh] p-0 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh] p-6">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Preparar materiais"
                className="bg-muted/50 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes da tarefa..."
                rows={3}
                className="bg-muted/50 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ministério</Label>
                <Select value={ministryId || "none"} onValueChange={(v) => setMinistryId(v === "none" ? "" : v)}>
                <SelectTrigger className="bg-muted/50 shadow-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {ministries.filter(m => m.isActive).map((ministry) => (
                      <SelectItem key={ministry.id} value={ministry.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ministry.color }}
                          />
                          {ministry.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="bg-muted/50 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data Limite</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-muted/50 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Responsáveis</Label>
              <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 shadow-sm bg-muted/30">
                {responsibleUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={assigneeIds.includes(user.id)}
                      onCheckedChange={() => toggleAssignee(user.id)}
                    />
                    <label
                      htmlFor={`user-${user.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {user.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? "Salvar" : "Criar Tarefa"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskFormModal;