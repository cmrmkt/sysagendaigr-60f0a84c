import { cn } from "@/lib/utils";
import { ExternalLink, AlertTriangle, AlertCircle } from "lucide-react";
import type { Announcement } from "@/hooks/useAnnouncements";

interface AnnouncementCardProps {
  announcement: Announcement;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const AnnouncementCard = ({ announcement, onClick, showActions = false, compact = false }: AnnouncementCardProps) => {
  const getPriorityIcon = () => {
    switch (announcement.priority) {
      case "urgent":
        return <AlertTriangle className="w-4 h-4" />;
      case "high":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPriorityLabel = () => {
    switch (announcement.priority) {
      case "urgent":
        return "Urgente";
      case "high":
        return "Importante";
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left p-4 rounded-lg transition-opacity hover:opacity-90"
        style={{ 
          backgroundColor: announcement.backgroundColor,
          color: announcement.textColor,
        }}
      >
        <div className="flex items-start gap-3">
          {getPriorityIcon() && (
            <div className="flex-shrink-0 mt-0.5">
              {getPriorityIcon()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{announcement.title}</h4>
              {getPriorityLabel() && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/20 flex-shrink-0">
                  {getPriorityLabel()}
                </span>
              )}
            </div>
            <p className="text-xs opacity-80 line-clamp-2">{announcement.content}</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg p-4 transition-all",
        onClick && "cursor-pointer hover:opacity-90"
      )}
      style={{ 
        backgroundColor: announcement.backgroundColor,
        color: announcement.textColor,
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {getPriorityIcon()}
          {getPriorityLabel() && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/20">
              {getPriorityLabel()}
            </span>
          )}
        </div>
        {announcement.externalLink && (
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        )}
      </div>

      {/* Content */}
      <h3 className="font-semibold text-lg mb-1">{announcement.title}</h3>
      <p className="text-sm opacity-90 line-clamp-3">{announcement.content}</p>

      {/* Footer */}
      {announcement.externalLink && (
        <a
          href={announcement.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs mt-3 underline hover:no-underline"
        >
          Saiba mais
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};

export default AnnouncementCard;
