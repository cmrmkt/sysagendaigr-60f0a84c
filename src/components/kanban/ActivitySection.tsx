import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import type { EventTask } from "@/hooks/useEventTasks";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ActivitySectionProps {
  task: EventTask;
}

const ActivitySection = ({ task }: ActivitySectionProps) => {
  const { getUserById } = useData();
  const [showDetails, setShowDetails] = useState(true);
  const [comment, setComment] = useState("");

  // Mock activity data based on task info
  const activities = [
    {
      id: "1",
      userId: task.assigneeIds[0] || "1",
      action: `adicionou este cartão a ${task.status === "todo" ? "A fazer" : task.status === "in_progress" ? "Em andamento" : "Concluído"}`,
      timestamp: task.createdAt,
    },
  ];

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    // For now, just clear - would add to activity in real implementation
    setComment("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Comentários e atividade</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Ocultar" : "Mostrar"}
          {showDetails ? (
            <ChevronUp className="w-3 h-3 ml-1" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-1" />
          )}
        </Button>
      </div>

      {/* Comment Input - Trello Style */}
      <div className="flex items-start gap-2">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            EU
          </AvatarFallback>
        </Avatar>
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escrever um comentário..."
          className="flex-1 bg-muted border-0 focus-visible:ring-1"
        />
      </div>

      {/* Activity Log */}
      {showDetails && (
        <div className="space-y-3 mt-4">
          {activities.map((activity) => {
            const user = getUserById(activity.userId);
            return (
              <div key={activity.id} className="flex items-start gap-2">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="text-[10px] bg-muted">
                    {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm">
                  <div>
                    <span className="font-medium">{user?.name || "Usuário"}</span>
                    <span className="text-muted-foreground"> {activity.action}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(activity.timestamp), "d 'de' MMM. 'de' yyyy, HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivitySection;
