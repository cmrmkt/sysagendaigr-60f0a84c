import { useState } from "react";
import { Plus, Check, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMinistries } from "@/hooks/useMinistries";
import { useAuth } from "@/contexts/AuthContext";
import { MINISTRY_COLOR_OPTIONS } from "@/lib/colors/ministryColors";
import { isTooSimilarHslString } from "@/lib/colors/colorDistance";
import { cn } from "@/lib/utils";

interface MinistrySelectWithCreateProps {
  value: string;
  onValueChange: (id: string) => void;
  disabled?: boolean;
  showNone?: boolean;
  noneLabel?: string;
  filterActive?: boolean;
  className?: string;
}

const COLOR_THRESHOLD = 0.42;

export function MinistrySelectWithCreate({
  value,
  onValueChange,
  disabled = false,
  showNone = true,
  noneLabel = "Nenhum",
  filterActive = true,
  className,
}: MinistrySelectWithCreateProps) {
  const { ministries, addMinistry, isAdding } = useMinistries();
  const { role } = useAuth();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(MINISTRY_COLOR_OPTIONS[0].value);

  const canCreate = role !== "viewer";
  
  const displayedMinistries = filterActive 
    ? ministries.filter(m => m.isActive) 
    : ministries;

  // Check which colors are already in use
  const usedColors = ministries.map(m => m.color);
  
  const isColorTooClose = (color: string) => {
    return usedColors.some(
      usedColor => isTooSimilarHslString(color, usedColor, COLOR_THRESHOLD)
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    try {
      const result = await addMinistry({
        name: newName.trim(),
        color: newColor,
        isActive: true,
      });
      
      // Select the newly created ministry
      if (result?.id) {
        onValueChange(result.id);
      }
      
      // Reset and close
      setNewName("");
      setNewColor(MINISTRY_COLOR_OPTIONS[0].value);
      setIsCreateOpen(false);
    } catch (error) {
      // Error is handled by the hook's onError
    }
  };

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === "__create__") {
      setIsCreateOpen(true);
    } else {
      onValueChange(selectedValue);
    }
  };

  return (
    <div className="relative">
      <Popover open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <PopoverTrigger asChild>
          <div>
            <Select 
              value={value} 
              onValueChange={handleSelectChange}
              disabled={disabled}
            >
              <SelectTrigger className={cn("bg-muted/50 shadow-sm", className)}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {showNone && (
                  <SelectItem value="none">{noneLabel}</SelectItem>
                )}
                {displayedMinistries.map((ministry) => (
                  <SelectItem key={ministry.id} value={ministry.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ministry.color }}
                      />
                      {ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name}
                    </div>
                  </SelectItem>
                ))}
                {canCreate && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <SelectItem value="__create__">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Criar novo ministério...
                      </div>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-80 p-4 pointer-events-auto z-[100]" 
          align="start" 
          side="bottom"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Church className="w-5 h-5 text-primary" />
              <h4 className="font-medium">Novo Ministério</h4>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ministry-name">Nome</Label>
              <Input
                id="ministry-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Louvor"
                className="bg-muted/50 shadow-sm"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-1.5">
                {MINISTRY_COLOR_OPTIONS.slice(0, 16).map((colorOption) => {
                  const isTooClose = isColorTooClose(colorOption.value);
                  const isSelected = newColor === colorOption.value;
                  
                  return (
                    <button
                      key={colorOption.value}
                      type="button"
                      disabled={isTooClose}
                      onClick={() => setNewColor(colorOption.value)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all relative",
                        isSelected && "ring-2 ring-offset-2 ring-primary",
                        isTooClose && "opacity-30 cursor-not-allowed"
                      )}
                      style={{ 
                        backgroundColor: colorOption.value,
                        borderColor: 'transparent',
                      }}
                      title={isTooClose ? "Cor já em uso" : colorOption.name}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreateOpen(false);
                  setNewName("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || isAdding}
                className="flex-1"
              >
                {isAdding ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
