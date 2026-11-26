import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, RefreshCw, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationQueueTable } from "./IntegrationQueueTable";
import { TechniqueMapTable } from "./TechniqueMapTable";
import {
  useIntegrationQueue,
  type IntegrationDestination,
  type IntegrationStatus,
} from "../hooks/use-integration-queue";
import { useRequeueIntegrationEvent } from "../hooks/use-requeue-integration-event";
import { useTechniqueMap } from "../hooks/use-technique-map";

type StatusFilter = IntegrationStatus | "all";
type DestinationFilter = IntegrationDestination | "all";

/**
 * Fila multi-destino: cada evento de OS ou design que precisa chegar em
 * Promo Champions, Fast Gravacoes ou Promo Supply. Destino sem credencial
 * (CHAMPIONS_WEBHOOK_URL, SUPPLY_WEBHOOK_URL, FAST_GRAVACOES_API_URL) fica
 * pendente para sempre - e o alerta abaixo denuncia isso.
 */
export function IntegrationQueueTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>("all");

  const { data, isLoading, isError, error, refetch, isFetching } = useIntegrationQueue({
    status: statusFilter,
    destination: destinationFilter,
  });
  const requeue = useRequeueIntegrationEvent();
  const techniqueMap = useTechniqueMap();

  const events = data?.events ?? [];
  const stuck = data?.stuck ?? 0;
  const unmapped = data?.unmappedTechnique ?? 0;
  const skipped = data?.skipped ?? 0;

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
            Confira as credenciais do destino (CHAMPIONS_WEBHOOK_URL, SUPPLY_WEBHOOK_URL,
            FAST_GRAVACOES_API_URL) na edge function integration-dispatcher.
          </AlertDescription>
        </Alert>
      )}

      {unmapped > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Tecnica sem mapeamento para o Fast Gravacoes</AlertTitle>
          <AlertDescription>
            {unmapped === 1
              ? "1 evento vai para o Fast Gravacoes com a tecnica da OS fora do mapa e nao gera job la."
              : `${unmapped} eventos vao para o Fast Gravacoes com a tecnica da OS fora do mapa e nao geram job la.`}{" "}
            Ajuste o mapa de tecnicas em integration_technique_map e reprocese o evento.
          </AlertDescription>
        </Alert>
      )}

      {skipped > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Eventos ignorados pelo dispatcher</AlertTitle>
          <AlertDescription>
            {skipped === 1
              ? "1 evento foi marcado como ignorado e nao sera reenviado automaticamente."
              : `${skipped} eventos foram marcados como ignorados e nao serao reenviados automaticamente.`}{" "}
            Veja o motivo na coluna Ultimo erro e reprocese se ainda fizer sentido.
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
          <label className="text-sm font-medium" htmlFor="filtro-destino">
            Destino
          </label>
          <Select
            value={destinationFilter}
            onValueChange={(value) => setDestinationFilter(value as DestinationFilter)}
          >
            <SelectTrigger id="filtro-destino" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="champions">Promo Champions</SelectItem>
              <SelectItem value="fast_gravacoes">Fast Gravacoes</SelectItem>
              <SelectItem value="supply">Promo Supply</SelectItem>
            </SelectContent>
          </Select>

          <label className="text-sm font-medium" htmlFor="filtro-situacao-integracao">
            Situacao
          </label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger id="filtro-situacao-integracao" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="dead">Descartado</SelectItem>
              <SelectItem value="skipped">Ignorado</SelectItem>
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
            <IntegrationQueueTable
              events={events}
              requeueingId={requeue.isPending ? (requeue.variables ?? null) : null}
              onRequeue={(eventId) => requeue.mutate(eventId)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de tecnicas do Fast Gravacoes</CardTitle>
          <CardDescription>
            Tecnica escrita na ordem de servico e a tecnica correspondente no Fast Gravacoes. O que
            nao estiver aqui nao gera job no Fast Gravacoes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {techniqueMap.isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              <span className="sr-only">Carregando o mapa de tecnicas</span>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : techniqueMap.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Nao foi possivel carregar o mapa de tecnicas</AlertTitle>
              <AlertDescription>
                {techniqueMap.error instanceof Error
                  ? techniqueMap.error.message
                  : "Erro desconhecido ao consultar o mapa de tecnicas."}
              </AlertDescription>
            </Alert>
          ) : (
            <TechniqueMapTable entries={techniqueMap.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
