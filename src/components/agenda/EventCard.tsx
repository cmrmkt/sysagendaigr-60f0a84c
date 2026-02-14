import { cn } from "@/lib/utils";
import { Repeat, MapPin, Lock } from "lucide-react";

interface EventCardProps {
  title: string;
  time: string;
  ministry: string;
  ministryColor: string;
  onClick?: () => void;
  isRecurring?: boolean;
  location?: string;
  isPrivate?: boolean;
  isAllDay?: boolean;
}

const EventCard = ({ 
  title, 
  time, 
  ministry, 
  ministryColor, 
  onClick,
  isRecurring,
  location,
  isPrivate,
  isAllDay
}: EventCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-2.5 rounded-md text-xs transition-all mb-1.5",
        "hover:opacity-80 hover:shadow-sm",
        "text-white truncate min-h-[36px]"
      )}
      style={{ backgroundColor: ministryColor }}
    >
      <div className="flex items-center gap-1">
        <p className="font-medium truncate flex-1">{title}</p>
        <div className="flex items-center gap-0.5 shrink-0">
          {isRecurring && <Repeat className="w-3 h-3 opacity-80" />}
          {isPrivate && <Lock className="w-3 h-3 opacity-80" />}
        </div>
      </div>
      <p className="opacity-90 text-[10px]">
        {isAllDay ? "Dia inteiro" : time}
      </p>
      {location && (
        <p className="opacity-80 text-[10px] flex items-center gap-0.5 truncate">
          <MapPin className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{location}</span>
        </p>
      )}
    </button>
  );
};

export default EventCard;