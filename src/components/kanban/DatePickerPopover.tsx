import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DatePickerPopoverProps {
  children: React.ReactNode;
  dueDate?: string;
  startDate?: string;
  onDateChange: (dueDate?: string, startDate?: string) => void;
}

const DatePickerPopover = ({ 
  children, 
  dueDate, 
  startDate, 
  onDateChange 
}: DatePickerPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Checkboxes
  const [hasStartDate, setHasStartDate] = useState(!!startDate);
  const [hasDueDate, setHasDueDate] = useState(!!dueDate);
  
  // Dates
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(
    startDate ? new Date(startDate) : undefined
  );
  const [localDueDate, setLocalDueDate] = useState<Date | undefined>(
    dueDate ? new Date(dueDate) : undefined
  );
  
  // Time for due date
  const [dueTime, setDueTime] = useState("12:00");
  
  // Recurrence and reminder
  const [recurrence, setRecurrence] = useState("none");
  const [reminder, setReminder] = useState("none");
  
  // Currently editing which date
  const [editingDate, setEditingDate] = useState<"start" | "due">("due");

  useEffect(() => {
    setLocalStartDate(startDate ? new Date(startDate) : undefined);
    setLocalDueDate(dueDate ? new Date(dueDate) : undefined);
    setHasStartDate(!!startDate);
    setHasDueDate(!!dueDate);
  }, [startDate, dueDate]);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (editingDate === "start") {
      setLocalStartDate(date);
      if (!hasStartDate && date) setHasStartDate(true);
    } else {
      setLocalDueDate(date);
      if (!hasDueDate && date) setHasDueDate(true);
    }
  };

  const handleSave = () => {
    const formatDate = (date?: Date) => 
      date ? format(date, "yyyy-MM-dd") : undefined;
    
    const finalDueDate = hasDueDate ? formatDate(localDueDate) : undefined;
    const finalStartDate = hasStartDate ? formatDate(localStartDate) : undefined;
    
    onDateChange(finalDueDate, finalStartDate);
    setIsOpen(false);
  };

  const handleRemove = () => {
    setLocalStartDate(undefined);
    setLocalDueDate(undefined);
    setHasStartDate(false);
    setHasDueDate(false);
    onDateChange(undefined, undefined);
    setIsOpen(false);
  };

  const selectedDate = editingDate === "start" ? localStartDate : localDueDate;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 max-h-[70vh] overflow-y-auto overscroll-contain pointer-events-auto" align="start">
        <div className="space-y-4">
          <h4 className="font-medium text-center">Datas</h4>

          {/* Single Calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            className={cn("p-0 pointer-events-auto")}
          />

          {/* Start Date Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="start-date" 
                checked={hasStartDate}
                onCheckedChange={(checked) => {
                  setHasStartDate(!!checked);
                  if (checked) setEditingDate("start");
                }}
              />
              <Label 
                htmlFor="start-date" 
                className="text-sm cursor-pointer"
                onClick={() => setEditingDate("start")}
              >
                Data de início
              </Label>
            </div>
            {hasStartDate && (
              <Input
                type="text"
                value={localStartDate ? format(localStartDate, "dd/MM/yyyy", { locale: ptBR }) : ""}
                onClick={() => setEditingDate("start")}
                readOnly
                className={cn(
                  "cursor-pointer text-sm h-8",
                  editingDate === "start" && "ring-2 ring-primary"
                )}
              />
            )}
          </div>

          {/* Due Date Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="due-date" 
                checked={hasDueDate}
                onCheckedChange={(checked) => {
                  setHasDueDate(!!checked);
                  if (checked) setEditingDate("due");
                }}
              />
              <Label 
                htmlFor="due-date" 
                className="text-sm cursor-pointer"
                onClick={() => setEditingDate("due")}
              >
                Data de entrega
              </Label>
            </div>
            {hasDueDate && (
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={localDueDate ? format(localDueDate, "dd/MM/yyyy", { locale: ptBR }) : ""}
                  onClick={() => setEditingDate("due")}
                  readOnly
                  className={cn(
                    "cursor-pointer text-sm h-8 flex-1",
                    editingDate === "due" && "ring-2 ring-primary"
                  )}
                />
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="text-sm h-8 w-24"
                />
              </div>
            )}
          </div>

          {/* Recurrence Select */}
          <div className="space-y-2">
            <Label className="text-sm">Recorrente</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nunca</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="monthly">Mensalmente</SelectItem>
                <SelectItem value="yearly">Anualmente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reminder Select */}
          <div className="space-y-2">
            <Label className="text-sm">Definir lembrete</Label>
            <Select value={reminder} onValueChange={setReminder}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="at_time">No momento do vencimento</SelectItem>
                <SelectItem value="5_min">5 minutos antes</SelectItem>
                <SelectItem value="10_min">10 minutos antes</SelectItem>
                <SelectItem value="15_min">15 minutos antes</SelectItem>
                <SelectItem value="1_hour">1 hora antes</SelectItem>
                <SelectItem value="2_hours">2 horas antes</SelectItem>
                <SelectItem value="1_day">1 dia antes</SelectItem>
                <SelectItem value="2_days">2 dias antes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Salvar
            </Button>
            {(hasStartDate || hasDueDate) && (
              <Button size="sm" variant="outline" onClick={handleRemove}>
                <X className="w-4 h-4" />
                Remover
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DatePickerPopover;
