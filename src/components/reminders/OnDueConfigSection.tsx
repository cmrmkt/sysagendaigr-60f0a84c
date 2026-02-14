import { Input } from "@/components/ui/input";
import { RepeatConfig } from "@/hooks/useReminderSettings";

interface OnDueConfigSectionProps {
  repeat: RepeatConfig;
  onChange: (repeat: RepeatConfig) => void;
}

const ON_DUE_OPTIONS = [
  { type: "minutes" as const, label: "minuto", singular: "minuto", max: 59 },
  { type: "hours" as const, label: "horas", singular: "hora", max: 23 },
];

export const OnDueConfigSection = ({ repeat, onChange }: OnDueConfigSectionProps) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">Quando enviar no dia</h4>
      <div className="rounded-lg border bg-muted/30 divide-y">
        {/* Nenhum lembrete (na hora do evento) */}
        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="radio"
            checked={repeat.type === "none"}
            onChange={() => onChange({ ...repeat, type: "none", interval: 1, duration: "forever" })}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm font-medium">Na hora do evento</span>
        </label>

        {/* Minutos/Horas antes */}
        {ON_DUE_OPTIONS.map((opt) => (
          <label
            key={opt.type}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <input
              type="radio"
              checked={repeat.type === opt.type}
              onChange={() => onChange({ ...repeat, type: opt.type, interval: 1, duration: "count", count: 1 })}
              className="h-4 w-4 accent-primary"
            />
            <Input
              type="number"
              min={1}
              max={opt.max}
              className="w-14 h-7 text-center text-sm bg-background shadow-sm"
              value={repeat.type === opt.type ? repeat.interval : 1}
              onChange={(e) =>
                onChange({ ...repeat, type: opt.type, interval: parseInt(e.target.value) || 1 })
              }
              onClick={() => onChange({ ...repeat, type: opt.type, interval: 1, duration: "count", count: 1 })}
            />
            <span className="text-sm">{repeat.type === opt.type && repeat.interval === 1 ? opt.singular : opt.label} antes</span>
          </label>
        ))}
      </div>

      {/* Quantas vezes enviar */}
      {repeat.type !== "none" && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Quantas vezes enviar</h4>
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 rounded-lg border">
            <span className="text-sm">Enviar</span>
            <Input
              type="number"
              min={1}
              max={10}
              className="w-16 h-8 text-center text-sm bg-background shadow-sm"
              value={repeat.count || 1}
              onChange={(e) => onChange({ ...repeat, count: parseInt(e.target.value) || 1 })}
            />
            <span className="text-sm text-muted-foreground">
              {repeat.count === 1 ? "vez" : "vezes"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
