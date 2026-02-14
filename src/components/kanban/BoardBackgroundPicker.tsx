import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type KanbanBackground = 
  | "default"
  | "ocean"
  | "forest"
  | "sunset"
  | "purple"
  | "neutral";

interface BoardBackgroundPickerProps {
  value: KanbanBackground;
  onChange: (value: KanbanBackground) => void;
}

const backgrounds: { id: KanbanBackground; name: string; preview: string }[] = [
  { id: "default", name: "Azul Clássico", preview: "bg-[hsl(200,60%,50%)]" },
  { id: "ocean", name: "Oceano", preview: "bg-gradient-to-br from-[hsl(200,80%,55%)] to-[hsl(220,70%,45%)]" },
  { id: "forest", name: "Floresta", preview: "bg-gradient-to-br from-[hsl(150,60%,45%)] to-[hsl(170,50%,35%)]" },
  { id: "sunset", name: "Pôr do Sol", preview: "bg-gradient-to-br from-[hsl(30,80%,50%)] to-[hsl(350,70%,50%)]" },
  { id: "purple", name: "Roxo", preview: "bg-gradient-to-br from-[hsl(270,60%,55%)] to-[hsl(290,50%,45%)]" },
  { id: "neutral", name: "Neutro", preview: "bg-[hsl(220,15%,60%)]" },
];

export const getBackgroundClasses = (bg: KanbanBackground): string => {
  switch (bg) {
    case "ocean":
      return "bg-gradient-to-br from-[hsl(var(--kanban-bg-ocean))] to-[hsl(220,70%,45%)] dark:to-[hsl(220,50%,30%)]";
    case "forest":
      return "bg-gradient-to-br from-[hsl(var(--kanban-bg-forest))] to-[hsl(170,50%,35%)] dark:to-[hsl(170,40%,25%)]";
    case "sunset":
      return "bg-gradient-to-br from-[hsl(var(--kanban-bg-sunset))] to-[hsl(350,70%,50%)] dark:to-[hsl(350,50%,35%)]";
    case "purple":
      return "bg-gradient-to-br from-[hsl(var(--kanban-bg-purple))] to-[hsl(290,50%,45%)] dark:to-[hsl(290,40%,30%)]";
    case "neutral":
      return "bg-[hsl(var(--kanban-bg-neutral))]";
    default:
      return "bg-[hsl(var(--kanban-bg-default))]";
  }
};

export const getHeaderBackgroundClasses = (bg: KanbanBackground): string => {
  switch (bg) {
    case "ocean":
      return "bg-gradient-to-r from-[hsl(200,80%,40%)] to-[hsl(220,70%,35%)]";
    case "forest":
      return "bg-gradient-to-r from-[hsl(150,60%,35%)] to-[hsl(170,50%,28%)]";
    case "sunset":
      return "bg-gradient-to-r from-[hsl(30,80%,42%)] to-[hsl(350,70%,42%)]";
    case "purple":
      return "bg-gradient-to-r from-[hsl(270,60%,45%)] to-[hsl(290,50%,38%)]";
    case "neutral":
      return "bg-[hsl(220,15%,50%)]";
    default:
      return "bg-[hsl(200,60%,42%)]";
  }
};

export const getToolbarBackgroundClasses = (bg: KanbanBackground): string => {
  switch (bg) {
    case "ocean":
      return "bg-[hsl(200,80%,55%)]/20";
    case "forest":
      return "bg-[hsl(150,60%,45%)]/20";
    case "sunset":
      return "bg-[hsl(30,80%,50%)]/20";
    case "purple":
      return "bg-[hsl(270,60%,55%)]/20";
    case "neutral":
      return "bg-[hsl(220,15%,60%)]/20";
    default:
      return "bg-primary/10";
  }
};

const BoardBackgroundPicker = ({ value, onChange }: BoardBackgroundPickerProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm bg-background/80 hover:bg-background">
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Cor</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <h4 className="text-sm font-medium mb-3">Cor de fundo</h4>
        <div className="grid grid-cols-3 gap-2">
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              className={cn(
                "relative h-12 rounded-lg transition-all",
                bg.preview,
                value === bg.id && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => onChange(bg.id)}
              title={bg.name}
            >
              {value === bg.id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white drop-shadow" />
                </div>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BoardBackgroundPicker;
