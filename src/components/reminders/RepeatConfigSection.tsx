import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RepeatConfig, RepeatType, DurationType } from "@/hooks/useReminderSettings";

const WEEK_DAYS = [
  { label: "D", index: 0 },
  { label: "S", index: 1 },
  { label: "T", index: 2 },
  { label: "Q", index: 3 },
  { label: "Q", index: 4 },
  { label: "S", index: 5 },
  { label: "S", index: 6 },
];

interface RepeatConfigSectionProps {
  repeat: RepeatConfig;
  onChange: (repeat: RepeatConfig) => void;
  allowedTypes?: RepeatType[];
}

export const RepeatConfigSection = ({ repeat, onChange, allowedTypes }: RepeatConfigSectionProps) => {
  const handleTypeChange = (type: RepeatType) => {
    onChange({
      ...repeat,
      type,
      interval: repeat.interval || 1,
      week_days: type === "weeks" ? repeat.week_days || [] : undefined,
    });
  };

  const toggleWeekDay = (dayIndex: number) => {
    const current = repeat.week_days || [];
    const newDays = current.includes(dayIndex)
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex].sort();
    onChange({ ...repeat, week_days: newDays });
  };

  const handleDurationChange = (duration: DurationType) => {
    onChange({ ...repeat, duration });
  };

  const allRepeatOptions: { type: RepeatType; label: string; max: number }[] = [
    { type: "minutes", label: "minuto", max: 59 },
    { type: "hours", label: "hora", max: 23 },
    { type: "days", label: "dia", max: 30 },
    { type: "weeks", label: "semana", max: 12 },
    { type: "months", label: "mês", max: 12 },
    { type: "years", label: "ano", max: 10 },
  ];

  const repeatOptions = allowedTypes
    ? allRepeatOptions.filter((o) => allowedTypes.includes(o.type))
    : allRepeatOptions;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground">Repetir</h4>
      <div className="rounded-lg border bg-muted/30 divide-y">
        {/* Não repetir */}
        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="radio"
            checked={repeat.type === "none"}
            onChange={() => handleTypeChange("none")}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm font-medium">Não repetir</span>
        </label>

        {repeatOptions.map((opt) => (
          <div key={opt.type}>
            <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                checked={repeat.type === opt.type}
                onChange={() => handleTypeChange(opt.type)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm">A cada</span>
              <Input
                type="number"
                min={1}
                max={opt.max}
                className="w-14 h-7 text-center text-sm bg-background shadow-sm"
                value={repeat.type === opt.type ? repeat.interval : 1}
                onChange={(e) =>
                  onChange({ ...repeat, type: opt.type, interval: parseInt(e.target.value) || 1 })
                }
                onClick={() => handleTypeChange(opt.type)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
            {opt.type === "weeks" && repeat.type === "weeks" && (
              <div className="flex items-center gap-1.5 px-4 pb-3 pl-11">
                {WEEK_DAYS.map((day) => {
                  const selected = repeat.week_days?.includes(day.index);
                  return (
                    <button
                      key={day.index}
                      type="button"
                      onClick={() => toggleWeekDay(day.index)}
                      className={cn(
                        "h-8 w-8 rounded-full text-xs font-medium border transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : day.index === 0
                          ? "text-destructive border-muted hover:bg-muted"
                          : "text-foreground border-muted hover:bg-muted"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Duration */}
      {repeat.type !== "none" && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Duração</h4>
          <div className="rounded-lg border bg-muted/30 divide-y">
            <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                checked={repeat.duration === "forever"}
                onChange={() => handleDurationChange("forever")}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm font-medium">Sempre</span>
            </label>

            <div className="px-4 py-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={repeat.duration === "count"}
                  onChange={() => handleDurationChange("count")}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">Número específico de vezes</span>
              </label>
              {repeat.duration === "count" && (
                <div className="flex items-center gap-2 pl-7 mt-2">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    className="w-20 h-8 text-center text-sm bg-background shadow-sm"
                    value={repeat.count || 3}
                    onChange={(e) =>
                      onChange({ ...repeat, count: parseInt(e.target.value) || 1 })
                    }
                  />
                  <span className="text-sm text-muted-foreground">vezes</span>
                </div>
              )}
            </div>

            <div className="px-4 py-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={repeat.duration === "until"}
                  onChange={() => handleDurationChange("until")}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">Até</span>
              </label>
              {repeat.duration === "until" && (
                <div className="pl-7 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-sm bg-background shadow-sm">
                        {repeat.until
                          ? format(new Date(repeat.until), "dd/MM/yyyy", { locale: ptBR })
                          : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={repeat.until ? new Date(repeat.until) : undefined}
                        onSelect={(date) =>
                          onChange({
                            ...repeat,
                            until: date ? format(date, "yyyy-MM-dd") : undefined,
                          })
                        }
                        locale={ptBR}
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
