import { useState } from "react";
import { Filter, X, Users, Tag, Calendar, ChevronDown } from "lucide-react";
import { defaultTaskLabels, TaskLabel } from "@/contexts/DataContext";
import type { User } from "@/hooks/useUsers";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface BoardFiltersState {
  memberIds: string[];
  labelIds: string[];
  dueFilter: "all" | "overdue" | "week" | "none";
}

interface BoardFiltersProps {
  filters: BoardFiltersState;
  onFiltersChange: (filters: BoardFiltersState) => void;
}

const dueFilterLabels: Record<BoardFiltersState["dueFilter"], string> = {
  all: "Todas",
  overdue: "Atrasadas",
  week: "Próximos 7 dias",
  none: "Sem data",
};

const BoardFilters = ({ filters, onFiltersChange }: BoardFiltersProps) => {
  const { users } = useData();
  const [labels] = useState<TaskLabel[]>(defaultTaskLabels);

  const hasActiveFilters = 
    filters.memberIds.length > 0 || 
    filters.labelIds.length > 0 || 
    filters.dueFilter !== "all";

  const activeFilterCount = 
    filters.memberIds.length + 
    filters.labelIds.length + 
    (filters.dueFilter !== "all" ? 1 : 0);

  const toggleMember = (userId: string) => {
    const newMemberIds = filters.memberIds.includes(userId)
      ? filters.memberIds.filter(id => id !== userId)
      : [...filters.memberIds, userId];
    onFiltersChange({ ...filters, memberIds: newMemberIds });
  };

  const toggleLabel = (labelId: string) => {
    const newLabelIds = filters.labelIds.includes(labelId)
      ? filters.labelIds.filter(id => id !== labelId)
      : [...filters.labelIds, labelId];
    onFiltersChange({ ...filters, labelIds: newLabelIds });
  };

  const setDueFilter = (dueFilter: BoardFiltersState["dueFilter"]) => {
    onFiltersChange({ ...filters, dueFilter });
  };

  const clearFilters = () => {
    onFiltersChange({ memberIds: [], labelIds: [], dueFilter: "all" });
  };

  return (
    <>
      {/* Filter Icon */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" />
      </div>

      {/* Members Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 shadow-sm bg-background border-border",
              filters.memberIds.length > 0 && "bg-primary/20 border-primary/50 hover:bg-primary/30"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Membros</span>
            {filters.memberIds.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 ml-1 bg-primary/30 text-foreground">
                {filters.memberIds.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 pointer-events-auto" align="start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">Filtrar por membro</p>
            {users.map((user) => (
              <button
                key={user.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                onClick={() => toggleMember(user.id)}
              >
                <Checkbox checked={filters.memberIds.includes(user.id)} />
                <span className="truncate">{user.name}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Labels Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 shadow-sm bg-background border-border",
              filters.labelIds.length > 0 && "bg-primary/20 border-primary/50 hover:bg-primary/30"
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Etiquetas</span>
            {filters.labelIds.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 ml-1 bg-primary/30 text-foreground">
                {filters.labelIds.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 pointer-events-auto" align="start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">Filtrar por etiqueta</p>
            {labels.map((label) => (
              <button
                key={label.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                onClick={() => toggleLabel(label.id)}
              >
                <Checkbox checked={filters.labelIds.includes(label.id)} />
                <div
                  className="w-4 h-4 rounded shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="truncate">{label.name}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Due Date Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 shadow-sm bg-background border-border",
              filters.dueFilter !== "all" && "bg-primary/20 border-primary/50 hover:bg-primary/30"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prazo</span>
            {filters.dueFilter !== "all" && (
              <Badge variant="secondary" className="h-5 px-1.5 ml-1 bg-primary/30 text-foreground">
                1
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 pointer-events-auto" align="start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1">Filtrar por prazo</p>
            {(Object.keys(dueFilterLabels) as BoardFiltersState["dueFilter"][]).map((key) => (
              <button
                key={key}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left",
                  filters.dueFilter === key ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
                onClick={() => setDueFilter(key)}
              >
                {dueFilterLabels[key]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters - Fixed width to prevent layout shift */}
      <div className="w-9 flex justify-center">
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={clearFilters}
            title={`Limpar filtros (${activeFilterCount})`}
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
    </>
  );
};

export default BoardFilters;