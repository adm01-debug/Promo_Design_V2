import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Inbox, ListPlus, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
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
import type {
  IntegrationDestination,
  IntegrationQueueEvent,
  IntegrationStatus,
} from "../hooks/use-integration-queue";

const STATUS_META: Record<
  IntegrationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendente", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  dead: { label: "Descartado", variant: "destructive" },
  skipped: { label: "Ignorado", variant: "outline" },
};

const DESTINATION_LABEL: Record<IntegrationDestination, string> = {
  champions: "Promo Champions",
  fast_gravacoes: "Fast Gravacoes",
  supply: "Promo Supply",
};

const EVENT_LABEL: Record<string, string> = {
  "os.closed": "OS pronta",
  "os.completed": "OS concluida",
  "design.created": "Design criado",
  "design.updated": "Design alterado",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function eventLabel(event: string): string {
  return EVENT_LABEL[event] ?? event;
}

/** Origem do evento: a OS editavel ou o design no editor de mockup. */
function referenceHref(event: IntegrationQueueEvent): string {
  if (event.entity === "service_order") return `/mockup/service-order?edit=${event.entity_id}`;
  return `/mockup/editor?id=${event.entity_id}`;
}

interface IntegrationQueueTableProps {
  events: IntegrationQueueEvent[];
  requeueingId: string | null;
  onRequeue: (eventId: string) => void;
  /** Owner/admin: mostra o atalho para cadastrar a tecnica que falta no mapa. */
  canManageMap?: boolean;
  onMapTechnique?: (technique: string) => void;
}

export function IntegrationQueueTable({
  events,
  requeueingId,
  onRequeue,
  canManageMap = false,
  onMapTechnique,
}: IntegrationQueueTableProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhum evento na fila</p>
        <p className="text-sm text-muted-foreground">
          Nenhum evento foi enfileirado para Champions, Fast Gravacoes ou Supply com os filtros
          atuais.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Evento</TableHead>
          <TableHead scope="col">Destino</TableHead>
          <TableHead scope="col">Origem</TableHead>
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
          const unmapped =
            event.destination === "fast_gravacoes" &&
            event.status !== "delivered" &&
            !event.fg_technique_id;

          return (
            <TableRow key={event.event_id}>
              <TableCell className="font-medium">{eventLabel(event.event)}</TableCell>
              <TableCell>
                <span>{DESTINATION_LABEL[event.destination] ?? event.destination}</span>
                {unmapped && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="w-fit">
                      Tecnica nao mapeada
                    </Badge>
                    {event.technique && (
                      <span className="text-xs text-muted-foreground">"{event.technique}"</span>
                    )}
                    {canManageMap && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => onMapTechnique?.(event.technique ?? "")}
                        aria-label={`Mapear a tecnica ${event.technique ?? "da OS"} no Fast Gravacoes`}
                      >
                        <ListPlus className="h-3 w-3" aria-hidden="true" />
                        <span className="ml-1">Mapear</span>
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Link
                  to={referenceHref(event)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {event.reference ?? "Abrir registro"}
                </Link>
                {event.detail && (
                  <span className="block text-xs text-muted-foreground">{event.detail}</span>
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
                      <span className="flex items-center gap-1 text-destructive">
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
                  aria-label={`Reprocessar evento ${eventLabel(event.event)} para ${
                    DESTINATION_LABEL[event.destination] ?? event.destination
                  }`}
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
