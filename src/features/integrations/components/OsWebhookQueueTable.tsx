import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Inbox, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OsWebhookEvent, OsWebhookStatus } from "../hooks/use-os-webhook-queue";

const STATUS_META: Record<
  OsWebhookStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendente", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  dead: { label: "Descartado", variant: "destructive" },
};

const EVENT_LABEL: Record<string, string> = {
  "os.created": "OS criada",
  "os.updated": "OS alterada",
  "os.status_changed": "Status alterado",
  "os.deleted": "OS excluida",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

interface OsWebhookQueueTableProps {
  events: OsWebhookEvent[];
  requeueingId: string | null;
  onRequeue: (eventId: string) => void;
}

export function OsWebhookQueueTable({ events, requeueingId, onRequeue }: OsWebhookQueueTableProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhum evento na fila</p>
        <p className="text-sm text-muted-foreground">
          Nenhum webhook foi enfileirado para o ERP com os filtros atuais.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Evento</TableHead>
          <TableHead scope="col">Ordem de servico</TableHead>
          <TableHead scope="col">Situacao</TableHead>
          <TableHead scope="col">Tentativas</TableHead>
          <TableHead scope="col">Criado em</TableHead>
          <TableHead scope="col">Proxima tentativa</TableHead>
          <TableHead scope="col">Ultimo erro</TableHead>
          <TableHead scope="col" className="text-right">
            Acoes
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const meta = STATUS_META[event.status] ?? STATUS_META.pending;
          const requeueing = requeueingId === event.event_id;

          return (
            <TableRow key={event.event_id}>
              <TableCell className="font-medium">
                {EVENT_LABEL[event.event] ?? event.event}
              </TableCell>
              <TableCell>
                <Link
                  to={`/mockup/service-order?edit=${event.os_id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {event.os_number ? `OS ${event.os_number}` : "Abrir OS"}
                </Link>
                {event.client_name && (
                  <span className="block text-xs text-muted-foreground">{event.client_name}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </TableCell>
              <TableCell>{event.attempts}</TableCell>
              <TableCell>
                <span title={formatDateTime(event.created_at)}>
                  {formatDistanceToNow(new Date(event.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </TableCell>
              <TableCell>{formatDateTime(event.next_attempt_at)}</TableCell>
              <TableCell className="max-w-[16rem]">
                {event.last_error ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 truncate text-destructive">
                        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{event.last_error}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm break-words">
                      {event.last_error}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={requeueing || event.status === "delivered"}
                  onClick={() => onRequeue(event.event_id)}
                  aria-label={`Reprocessar evento ${
                    EVENT_LABEL[event.event] ?? event.event
                  } da OS ${event.os_number ?? event.os_id}`}
                >
                  {requeueing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="ml-2">Reprocessar</span>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
