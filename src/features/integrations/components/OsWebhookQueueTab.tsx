import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OsWebhookQueueTable } from "./OsWebhookQueueTable";
import {
  useOsWebhookQueue,
  type OsWebhookEventName,
  type OsWebhookStatus,
} from "../hooks/use-os-webhook-queue";
import { useRequeueOsWebhook } from "../hooks/use-requeue-os-webhook";

type StatusFilter = OsWebhookStatus | "all";
type EventFilter = OsWebhookEventName | "all";

/**
 * Fila de webhooks das ordens de servico para o ERP (os_webhook_queue). O
 * os-webhook-dispatcher roda em self-disable enquanto ERP_WEBHOOK_URL e
 * ERP_WEBHOOK_SECRET nao existirem, por isso o alerta de fila parada.
 */
export function OsWebhookQueueTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  const { data, isLoading, isError, error, refetch, isFetching } = useOsWebhookQueue({
    status: statusFilter,
    event: eventFilter,
  });
  const requeue = useRequeueOsWebhook();
  const events = data?.events ?? [];
  const stuck = data?.stuck ?? 0;

  const summary = [
    { label: "Pendentes", value: data?.pending ?? 0, icon: Clock3 },
    { label: "Aguardando retentativa", value: data?.waitingRetry ?? 0, icon: Send },
    { label: "Entregues", value: data?.delivered ?? 0, icon: CheckCircle2 },
    { label: "Descartados ou com falha", value: data?.dropped ?? 0, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      {stuck > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>A fila nao esta sendo enviada</AlertTitle>
          <AlertDescription>
            {stuck === 1
              ? "1 evento esta pendente ha mais de 15 minutos e o envio ja deveria ter acontecido."
              : `${stuck} eventos estao pendentes ha mais de 15 minutos e o envio ja deveria ter acontecido.`}{" "}
            Verifique a configuracao de ERP_WEBHOOK_URL e ERP_WEBHOOK_SECRET na edge function
            os-webhook-dispatcher.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium" htmlFor="filtro-situacao">
            Situacao
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger id="filtro-situacao" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="dead">Descartado</SelectItem>
            </SelectContent>
          </Select>

          <label className="text-sm font-medium" htmlFor="filtro-evento">
            Evento
          </label>
          <Select
            value={eventFilter}
            onValueChange={(value) => setEventFilter(value as EventFilter)}
          >
            <SelectTrigger id="filtro-evento" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="os.created">OS criada</SelectItem>
              <SelectItem value="os.updated">OS alterada</SelectItem>
              <SelectItem value="os.status_changed">Status alterado</SelectItem>
              <SelectItem value="os.deleted">OS excluida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              <span className="sr-only">Carregando a fila de integracao</span>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Nao foi possivel carregar a fila</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "Erro desconhecido ao consultar a fila."}
              </AlertDescription>
            </Alert>
          ) : (
            <OsWebhookQueueTable
              events={events}
              requeueingId={requeue.isPending ? (requeue.variables ?? null) : null}
              onRequeue={(eventId) => requeue.mutate(eventId)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
