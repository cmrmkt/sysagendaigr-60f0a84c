import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { defaultTaskLabels, TaskLabel } from "@/contexts/DataContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LabelsPopoverProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  children: React.ReactNode;
}

const labelColors = [
  "#B91C1C", // Vermelho tijolo
  "#92400E", // Marrom âmbar
  "#A16207", // Dourado escuro
  "#065F46", // Verde musgo
  "#155E75", // Azul petróleo
  "#5B21B6", // Roxo índigo
  "#831843", // Magenta escuro
  "#44403C", // Cinza pedra
];

const LabelsPopover = ({ selectedIds, onSelectionChange, children }: LabelsPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [labels, setLabels] = useState<TaskLabel[]>(defaultTaskLabels);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(labelColors[0]);

  const toggleLabel = (labelId: string) => {
    if (selectedIds.includes(labelId)) {
      onSelectionChange(selectedIds.filter(id => id !== labelId));
    } else {
      onSelectionChange([...selectedIds, labelId]);
    }
  };

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) return;
    
    const newLabel: TaskLabel = {
      id: `label-${Date.now()}`,
      name: newLabelName.trim(),
      color: newLabelColor,
    };
    
    setLabels(prev => [...prev, newLabel]);
    setNewLabelName("");
    setNewLabelColor(labelColors[0]);
    setIsCreating(false);
  };

  const handleUpdateLabel = (labelId: string, name: string) => {
    setLabels(prev => prev.map(l => 
      l.id === labelId ? { ...l, name } : l
    ));
    setEditingId(null);
  };

  const handleDeleteLabel = (labelId: string) => {
    setLabels(prev => prev.filter(l => l.id !== labelId));
    onSelectionChange(selectedIds.filter(id => id !== labelId));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 pointer-events-auto" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Etiquetas</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Labels List */}
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {labels.map((label) => (
              <div key={label.id} className="flex items-center gap-2">
                <button
                  className={cn(
                    "flex-1 flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium transition-all",
                    "hover:ring-2 hover:ring-offset-1 hover:ring-current"
                  )}
                  style={{ backgroundColor: label.color }}
                  onClick={() => toggleLabel(label.id)}
                >
                  {editingId === label.id ? (
                    <Input
                      value={label.name}
                      onChange={(e) => {
                        setLabels(prev => prev.map(l => 
                          l.id === label.id ? { ...l, name: e.target.value } : l
                        ));
                      }}
                      onBlur={() => handleUpdateLabel(label.id, label.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateLabel(label.id, label.name);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-6 bg-white/20 border-white/30 text-white placeholder:text-white/50"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="flex-1 text-left truncate">{label.name}</span>
                      {selectedIds.includes(label.id) && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(label.id);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Create New Label */}
          {isCreating ? (
            <div className="space-y-2 pt-2 border-t">
              <Input
                placeholder="Nome da etiqueta"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateLabel();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                {labelColors.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-7 h-7 rounded-md transition-all",
                      newLabelColor === color && "ring-2 ring-offset-1 ring-foreground"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewLabelColor(color)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateLabel} className="flex-1">
                  Criar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreating(false);
                    setNewLabelName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4" />
              Criar nova etiqueta
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LabelsPopover;