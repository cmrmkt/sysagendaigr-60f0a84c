import { cn } from "@/lib/utils";
import { Lock, MapPin, Repeat, Plus } from "lucide-react";
import type { Event } from "@/hooks/useEvents";
import type { Ministry } from "@/hooks/useMinistries";

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (eventId: string) => void;
  onSlotClick?: (date: Date, time: string) => void;
  getMinistryById: (id: string) => Ministry | undefined;
}

interface PositionedEvent extends Event {
  columnIndex: number;
  columnsCount: number;
}

const DayView = ({ currentDate, events, onEventClick, onSlotClick, getMinistryById }: DayViewProps) => {
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

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

  const dayEvents = getEventsForDate(currentDate);
  const allDayEvents = dayEvents.filter(e => e.isAllDay);
  const timedEvents = dayEvents.filter(e => !e.isAllDay);

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

  // Calculate overlapping events and assign columns
  const getPositionedEvents = (events: Event[]): PositionedEvent[] => {
    if (events.length === 0) return [];

    // Sort by start time
    const sorted = [...events].sort((a, b) => {
      const aStart = a.startTime.split(':').map(Number);
      const bStart = b.startTime.split(':').map(Number);
      return (aStart[0] * 60 + aStart[1]) - (bStart[0] * 60 + bStart[1]);
    });

    const positioned: PositionedEvent[] = [];
    const clusters: Event[][] = [];

    // Group overlapping events into clusters
    sorted.forEach(event => {
      const eventStart = event.startTime.split(':').map(Number);
      const eventEnd = event.endTime.split(':').map(Number);
      const eventStartMinutes = eventStart[0] * 60 + eventStart[1];
      const eventEndMinutes = eventEnd[0] * 60 + eventEnd[1];

      // Find a cluster this event overlaps with
      let foundCluster = false;
      for (const cluster of clusters) {
        const overlaps = cluster.some(e => {
          const eStart = e.startTime.split(':').map(Number);
          const eEnd = e.endTime.split(':').map(Number);
          const eStartMinutes = eStart[0] * 60 + eStart[1];
          const eEndMinutes = eEnd[0] * 60 + eEnd[1];
          return eventStartMinutes < eEndMinutes && eventEndMinutes > eStartMinutes;
        });

        if (overlaps) {
          cluster.push(event);
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push([event]);
      }
    });

    // Assign column positions within each cluster
    clusters.forEach(cluster => {
      const columnsCount = cluster.length;
      cluster.forEach((event, index) => {
        positioned.push({
          ...event,
          columnIndex: index,
          columnsCount,
        });
      });
    });

    return positioned;
  };

  const positionedEvents = getPositionedEvents(timedEvents);

  const today = new Date();
  const isToday = 
    currentDate.getDate() === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  const nowPosition = isToday ? ((currentHour - 6) * 60 + currentMinute) / 60 : -1;

  const handleSlotClick = (hour: number) => {
    if (onSlotClick) {
      onSlotClick(currentDate, `${String(hour).padStart(2, '0')}:00`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card rounded-lg border">
      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-border bg-muted/30">
          <div className="p-2 text-xs text-muted-foreground border-b border-border/50">
            Dia inteiro
          </div>
          <div className="flex flex-col">
            {allDayEvents.map((event) => {
              const ministry = getMinistryById(event.ministryId);
              const eventColor = event.customColor || ministry?.color || 'hsl(var(--primary))';
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event.id)}
                  className="flex items-center gap-3 px-4 py-3 text-left text-white transition-opacity hover:opacity-90 border-b border-white/10 last:border-b-0"
                  style={{ backgroundColor: eventColor }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      {isEventRecurring(event) && <Repeat className="w-3.5 h-3.5 flex-shrink-0" />}
                      {event.visibility === "private" && <Lock className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span className="truncate">{event.title}</span>
                    </div>
                    <div className="text-sm opacity-90 mt-0.5">
                      {ministry ? (ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name) : "Sem ministério"}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-sm opacity-80 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline - relative container for event overlay */}
      <div className="flex-1 overflow-auto relative">
        {/* Grid background with time slots */}
        <div className="grid" style={{ gridTemplateRows: `repeat(${hours.length}, 60px)` }}>
          {hours.map((hour, index) => (
            <div
              key={hour}
              className={cn(
                "grid grid-cols-[4rem_1fr] group",
                index !== 0 && "border-t border-border"
              )}
            >
              {/* Time label */}
              <div className="flex items-start justify-end pr-3 pt-1">
                <span className="text-xs text-muted-foreground -mt-2">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>

              {/* Slot area - clickable */}
              <div 
                className={cn(
                  "border-l border-border cursor-pointer transition-colors hover:bg-muted/50",
                  isToday && hour === currentHour && "bg-primary/5"
                )}
                onClick={() => handleSlotClick(hour)}
              >
                {/* Add button on hover */}
                <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
                    <Plus className="w-3 h-3" />
                    <span>Adicionar evento</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Now indicator - absolute within scroll container */}
        {isToday && nowPosition >= 0 && nowPosition <= 18 && (
          <div
            className="absolute left-16 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: `${nowPosition * 60}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <div className="flex-1 h-0.5 bg-destructive" />
          </div>
        )}

        {/* Events overlay - absolute within scroll container */}
        <div 
          className="absolute left-16 right-4 top-0 pointer-events-none" 
          style={{ height: `${hours.length * 60}px` }}
        >
          {positionedEvents.map((event) => {
            const ministry = getMinistryById(event.ministryId);
            const eventColor = event.customColor || ministry?.color || 'hsl(var(--primary))';
            const top = getEventPosition(event.startTime);
            const height = getEventDuration(event.startTime, event.endTime);

            if (top < 0 || top > 17) return null;

            // Calculate width and left position for overlapping events
            const widthPercent = 100 / event.columnsCount;
            const leftPercent = event.columnIndex * widthPercent;

            return (
              <button
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event.id);
                }}
                className="absolute rounded-md p-1.5 text-left text-white transition-opacity hover:opacity-90 overflow-hidden pointer-events-auto border-r border-white/20"
                style={{
                  backgroundColor: eventColor,
                  top: `${top * 60}px`,
                  height: `${Math.max(height * 60, 28)}px`,
                  left: `calc(${leftPercent}% + 2px)`,
                  width: `calc(${widthPercent}% - 4px)`,
                }}
              >
                {/* Title + Ministry - ALWAYS visible */}
                <div className="text-xs font-medium leading-tight truncate flex items-center gap-1">
                  {isEventRecurring(event) && <Repeat className="w-3 h-3 flex-shrink-0" />}
                  {event.visibility === "private" && <Lock className="w-3 h-3 flex-shrink-0" />}
                  <span className="truncate">{event.title}</span>
                  <span className="opacity-80 truncate">— {ministry ? (ministry.leaderName ? `${ministry.name} (${ministry.leaderName})` : ministry.name) : "Sem ministério"}</span>
                </div>

                {/* Time - shown if height allows */}
                {height >= 0.75 && (
                  <div className="text-[10px] opacity-90 mt-0.5 leading-tight truncate">
                    {event.startTime} - {event.endTime}
                  </div>
                )}

                {/* Location - shown if height allows */}
                {height >= 1.25 && event.location && (
                  <div className="flex items-center gap-1 text-[10px] opacity-80 mt-0.5">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayView;
