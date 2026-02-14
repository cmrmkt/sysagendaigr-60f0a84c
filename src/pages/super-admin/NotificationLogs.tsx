import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCircle2, XCircle, AlertCircle, Smartphone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationLogs, NotificationLog } from "@/hooks/useNotificationLogs";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: {
    label: "Enviado",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    variant: "default",
  },
  failed: {
    label: "Falhou",
    icon: <XCircle className="h-3.5 w-3.5" />,
    variant: "destructive",
  },
  no_subscription: {
    label: "Sem dispositivo",
    icon: <Smartphone className="h-3.5 w-3.5" />,
    variant: "secondary",
  },
  pending: {
    label: "Pendente",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    variant: "outline",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}

function NotificationLogRow({ log }: { log: NotificationLog }) {
  const data = log.data as Record<string, unknown>;
  const type = data?.type as string | undefined;
  
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{log.title}</span>
          <span className="text-sm text-muted-foreground line-clamp-2">
            {log.body}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span>{log.recipient_name || "—"}</span>
          {type && (
            <Badge variant="outline" className="w-fit text-xs">
              {type === "new_organization" ? "Nova organização" : type}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={log.status} />
        {log.error_message && (
          <p className="text-xs text-destructive mt-1">{log.error_message}</p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
      </TableCell>
    </TableRow>
  );
}

export default function NotificationLogs() {
  const { data: logs, isLoading, error } = useNotificationLogs();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Histórico de Notificações</h1>
          <p className="text-muted-foreground">
            Registro de todas as notificações push enviadas pelo sistema
          </p>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Notificação</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-28" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-destructive py-8">
                  Erro ao carregar logs: {error.message}
                </TableCell>
              </TableRow>
            ) : logs && logs.length > 0 ? (
              logs.map((log) => <NotificationLogRow key={log.id} log={log} />)
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhuma notificação enviada ainda
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
