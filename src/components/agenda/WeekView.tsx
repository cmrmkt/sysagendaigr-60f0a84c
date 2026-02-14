import { cn } from "@/lib/utils";
import { Lock, Repeat, Plus } from "lucide-react";
import type { Event } from "@/hooks/useEvents";
import type { Ministry } from "@/hooks/useMinistries";

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (eventId: string) => void;
  onSlotClick?: (date: Date, time: string) => void;
  getMinistryById: (id: string) => Ministry | undefined;
}

const WeekView = ({ currentDate, events, onEventClick, onSlotClick, getMinistryById }: WeekViewProps) => {
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Get the start of the week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
  };

  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    return events.filter((event) => {
      if (event.date === dateStr) return true;
      if (event.endDate) {
        const eventStart = new Date(event.date);
        const eventEnd = new Date(event.endDate);
        const currentDate = new Date(dateStr);
        return currentDate >= eventStart && currentDate <= eventEnd;
      }
      return false;
    });
  };

  const getEventPosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    return ((hours - 6) * 60 + minutes) / 60;
  };

  const getEventDuration = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
  };

  const isEventRecurring = (event: Event) => {
    return (event.recurrence && event.recurrence.type !== "none") || !!event.parentEventId;
  };

  const today = new Date();

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Get all-day events for the week
  const allDayEventsPerDay = weekDays.map(day => {
    return getEventsForDate(day).filter(e => e.isAllDay);
  });
  const hasAllDayEvents = allDayEventsPerDay.some(events => events.length > 0);

  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  const nowPosition = ((currentHour - 6) * 60 + currentMinute) / 60;

  const handleSlotClick = (day: Date, hour: number) => {
    if (onSlotClick) {
      onSlotClick(day, `${String(hour).padStart(2, '0')}:00`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card rounded-lg border">
      {/* Header with days */}
      <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-border bg-muted/30">
        <div className="p-2" />
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={cn(
              "text-center py-2 border-l border-border",
              isToday(day) && "bg-primary/10"
            )}
          >
            <p className="text-xs text-muted-foreground">{daysOfWeek[index]}</p>
            <p className={cn(
              "text-lg font-semibold",
              isToday(day) ? "text-primary" : "text-foreground"
            )}>
              {day.getDate()}
            </p>
          </div>
        ))}
      </div>

      {/* All-day events section */}
      {hasAllDayEvents && (
        <div className="grid grid-cols-[4rem_repeat(7,1fr)] border-b border-border">
          <div className="p-1 flex items-center justify-end pr-2">
            <span className="text-xs text-muted-foreground">Dia</span>
          </div>
          {weekDays.map((day, dayIndex) => {
            const dayAllDayEvents = allDayEventsPerDay[dayIndex];
            return (
              <div
                key={dayIndex}
                className="border-l border-border p-1 min-h-[32px]"
              >
                {dayAllDayEvents.slice(0, 2).map((event) => {
                  const ministry = getMinistryById(event.ministryId);
                  const eventColor = event.customColor || ministry?.color || 'hsl(var(--primary))';
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event.id)}
                      className="w-full text-left text-xs px-1 py-0.5 rounded text-white truncate mb-0.5 hover:opacity-80"
                      style={{ backgroundColor: eventColor }}
                    >
                      {event.title}
                    </button>
                  );
                })}
                {dayAllDayEvents.length > 2 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{dayAllDayEvents.length - 2}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline grid */}
      <div className="flex-1 overflow-auto relative">
        <div
          className="grid grid-cols-[4rem_repeat(7,1fr)]"
          style={{ gridTemplateRows: `repeat(${hours.length}, 60px)` }}
        >
          {hours.map((hour, hourIndex) => (
            <div key={hour} className="contents">
              {/* Time label cell */}
              <div
                className={cn(
                  "flex items-start justify-end pr-2 pt-1",
                  hourIndex !== 0 && "border-t border-border"
                )}
                style={{ gridRow: hourIndex + 1, gridColumn: 1 }}
              >
                <span className="text-xs text-muted-foreground -mt-2">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>

              {/* Day cells for this hour */}
              {weekDays.map((day, dayIndex) => {
                const isTodayColumn = isToday(day);

                return (
                  <div
                    key={`${hour}-${dayIndex}`}
                    className={cn(
                      "border-l border-border relative group cursor-pointer transition-colors hover:bg-muted/50",
                      hourIndex !== 0 && "border-t",
                      isTodayColumn && "bg-primary/5"
                    )}
                    style={{ gridRow: hourIndex + 1, gridColumn: dayIndex + 2 }}
                    onClick={() => handleSlotClick(day, hour)}
                  >
                    {/* Add indicator on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Events and now indicator overlay */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none">
          <div className="grid grid-cols-[4rem_repeat(7,1fr)]">
            <div />
            {weekDays.map((day, dayIndex) => {
              const dayEvents = getEventsForDate(day).filter((e) => !e.isAllDay);
              const isTodayColumn = isToday(day);

              return (
                <div
                  key={dayIndex}
                  className="relative"
                  style={{ height: `${hours.length * 60}px` }}
                >
                  {/* Now indicator */}
                  {isTodayColumn && nowPosition >= 0 && nowPosition <= 18 && (
                    <div
                      className="absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: `${nowPosition * 60}px` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                      <div className="flex-1 h-0.5 bg-destructive" />
                    </div>
                  )}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const ministry = getMinistryById(event.ministryId);
                    const eventColor =
                      event.customColor || ministry?.color || "hsl(var(--primary))";
                    const top = getEventPosition(event.startTime);
                    const height = getEventDuration(event.startTime, event.endTime);

                    if (top < 0 || top > 17) return null;

                    return (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event.id);
                        }}
                        className="absolute left-0.5 right-0.5 rounded text-left text-white text-xs p-1 overflow-hidden hover:opacity-90 transition-opacity pointer-events-auto"
                        style={{
                          backgroundColor: eventColor,
                          top: `${top * 60}px`,
                          height: `${Math.max(height * 60, 20)}px`,
                        }}
                      >
                        <div className="flex items-center gap-0.5 font-medium truncate">
                          {isEventRecurring(event) && (
                            <Repeat className="w-2.5 h-2.5 flex-shrink-0" />
                          )}
                          {event.visibility === "private" && (
                            <Lock className="w-2.5 h-2.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{event.title}</span>
                        </div>
                        {height >= 0.75 && (
                          <p className="opacity-80 truncate">{event.startTime}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekView;
