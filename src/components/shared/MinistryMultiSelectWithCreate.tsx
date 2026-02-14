import { useState } from "react";
import { Plus, Check, Church, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMinistries } from "@/hooks/useMinistries";
import { useAuth } from "@/contexts/AuthContext";
import { MINISTRY_COLOR_OPTIONS } from "@/lib/colors/ministryColors";
import { isTooSimilarHslString } from "@/lib/colors/colorDistance";
import { cn } from "@/lib/utils";

interface MinistryMultiSelectWithCreateProps {
  value: string[];
  onValueChange: (ids: string[]) => void;
  excludeIds?: string[];
  disabled?: boolean;
  filterActive?: boolean;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

const COLOR_THRESHOLD = 0.42;

export function MinistryMultiSelectWithCreate({
  value,
  onValueChange,
  excludeIds = [],
  disabled = false,
  filterActive = true,
  label = "Ministérios Colaboradores",
  icon,
  className,
}: MinistryMultiSelectWithCreateProps) {
  const { ministries, addMinistry, isAdding } = useMinistries();
  const { role } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(MINISTRY_COLOR_OPTIONS[0].value);

  const canCreate = role !== "viewer";
  
  // Filter ministries: active only and exclude the responsible ministry
  // Always show all active ministries - don't filter by active status for display
  const displayedMinistries = ministries
    .filter(m => filterActive ? m.isActive : true)
    .filter(m => !excludeIds.includes(m.id));

  // Check which colors are already in use
  const usedColors = ministries.map(m => m.color);
  
  const isColorTooClose = (color: string) => {
    return usedColors.some(
      usedColor => isTooSimilarHslString(color, usedColor, COLOR_THRESHOLD)
    );
  };

  const toggleMinistry = (ministryId: string) => {
    if (value.includes(ministryId)) {
      onValueChange(value.filter(id => id !== ministryId));
    } else {
      onValueChange([...value, ministryId]);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    try {
      const result = await addMinistry({
        name: newName.trim(),
        color: newColor,
        isActive: true,
      });
      
      // Auto-select the newly created ministry (only if it's not excluded)
      if (result?.id && !excludeIds.includes(result.id)) {
        onValueChange([...value, result.id]);
      }
      
      // Reset and close create popover
      setNewName("");
      setNewColor(MINISTRY_COLOR_OPTIONS[0].value);
      setIsCreateOpen(false);
    } catch (error) {
      // Error is handled by the hook's onError
    }
  };

  const selectedMinistries = ministries.filter(m => value.includes(m.id));

  return (
    <div className={cn("relative", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              isOpen 
                ? "bg-primary/5 border-primary/40 hover:border-primary/60" 
                : "bg-muted/30 border-border hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              {icon || <Building2 className={cn("w-4 h-4 transition-colors", isOpen ? "text-primary" : "text-muted-foreground")} />}
              <span className={cn("font-medium transition-colors", isOpen ? "text-primary" : "text-foreground")}>{label}</span>
              {value.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {value.length} selecionado(s)
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-primary font-bold transition-colors" />
            ) : (
              <ChevronDown className="w-5 h-5 text-foreground/60 transition-colors" />
            )}
          </button>
        </CollapsibleTrigger>
        
        {/* Preview when collapsed */}
        {!isOpen && value.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedMinistries.map(ministry => (
              <span
                key={ministry.id}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white"
                style={{ 
                  backgroundColor: ministry.color,
                  boxShadow: `0 2px 8px ${ministry.color}50`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full bg-white/30 flex-shrink-0"
                />
                {ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name}
              </span>
            ))}
          </div>
        )}
        
        <CollapsibleContent className="mt-2">
          <div className="space-y-2 bg-background rounded-lg border p-2">
            <p className="text-xs text-muted-foreground px-2">
              Selecione os ministérios que colaborarão:
            </p>
            
            {displayedMinistries.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {displayedMinistries.map((ministry) => {
                  const isSelected = value.includes(ministry.id);
                  return (
                    <label
                      key={ministry.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMinistry(ministry.id)}
                      />
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ministry.color }}
                      />
                      <span className="text-sm font-medium flex-1 truncate">{ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {ministries.length === 0 
                  ? "Nenhum ministério cadastrado." 
                  : "Todos os ministérios já estão selecionados ou excluídos."}
              </p>
            )}
            
            {/* Create new ministry option */}
            {canCreate && (
              <Popover open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 p-2 text-sm text-primary hover:bg-primary/5 rounded-md transition-colors border-t mt-2 pt-3"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Criar novo ministério...
                  </button>
                </PopoverTrigger>
                
                <PopoverContent 
                  className="w-80 p-4" 
                  align="start" 
                  side="bottom"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Church className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">Novo Ministério</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="ministry-name-multi">Nome</Label>
                      <Input
                        id="ministry-name-multi"
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
            )}
            
            {/* Botão "Pronto" para fechar o collapsible */}
            <div className="border-t mt-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-full"
              >
                <Check className="w-4 h-4 mr-2" />
                Pronto
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
