import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ListPlus,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useOrganizations } from "@/hooks/use-organization";
import { IntegrationQueueTable } from "./IntegrationQueueTable";
import { TechniqueMapFormDialog } from "./TechniqueMapFormDialog";
import { TechniqueMapTable } from "./TechniqueMapTable";
import {
  useIntegrationQueue,
  type IntegrationDestination,
  type IntegrationStatus,
} from "../hooks/use-integration-queue";
import { useRequeueIntegrationEvent } from "../hooks/use-requeue-integration-event";
import {
  useDeleteTechniqueMapEntry,
  useSaveTechniqueMapEntry,
  useTechniqueMap,
  type TechniqueMapEntry,
  type TechniqueMapInput,
} from "../hooks/use-technique-map";

type StatusFilter = IntegrationStatus | "all";
type DestinationFilter = IntegrationDestination | "all";

interface MapDialogState {
  open: boolean;
  originalTechnique: string | null;
  values: TechniqueMapInput;
}

const CLOSED_MAP_DIALOG: MapDialogState = {
  open: false,
  originalTechnique: null,
  values: { promoTechnique: "", fgTechniqueId: "" },
};

/**
 * Fila multi-destino: cada evento de OS ou design que precisa chegar em
 * Promo Champions, Fast Gravacoes ou Promo Supply. Destino sem credencial
 * (CHAMPIONS_WEBHOOK_URL, SUPPLY_WEBHOOK_URL, FAST_GRAVACOES_API_URL) fica
 * pendente para sempre - e o alerta abaixo denuncia isso.
 */
export function IntegrationQueueTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [destinationFilter, setDestinationFilter] = useState<DestinationFilter>("all");
  const [mapDialog, setMapDialog] = useState<MapDialogState>(CLOSED_MAP_DIALOG);
  const [entryToDelete, setEntryToDelete] = useState<TechniqueMapEntry | null>(null);

  const { can } = useOrganizations();
  const canManageMap = can(["owner", "admin"]);

  const { data, isLoading, isError, error, refetch, isFetching } = useIntegrationQueue({
    status: statusFilter,
    destination: destinationFilter,
  });
  const requeue = useRequeueIntegrationEvent();
  const techniqueMap = useTechniqueMap();
  const saveEntry = useSaveTechniqueMapEntry();
  const deleteEntry = useDeleteTechniqueMapEntry();

  const entries = useMemo(() => techniqueMap.data ?? [], [techniqueMap.data]);
  const events = data?.events ?? [];
  const stuck = data?.stuck ?? 0;
  const unmapped = data?.unmappedTechnique ?? 0;
  const skipped = data?.skipped ?? 0;

  // Ids de tecnica ja usados no Fast Gravacoes: viram sugestao no formulario
  // (id inventado faz a entrega falhar no destino).
  const destinations = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.fg_technique_id))).sort(),
    [entries],
  );

  const busyTechnique = saveEntry.isPending
    ? (saveEntry.variables?.originalTechnique ?? null)
    : deleteEntry.isPending
      ? (deleteEntry.variables ?? null)
      : null;

  const summary = [
    { label: "Pendentes", value: data?.pending ?? 0, icon: Clock3 },
    { label: "Aguardando retentativa", value: data?.waitingRetry ?? 0, icon: Send },
    { label: "Entregues", value: data?.delivered ?? 0, icon: CheckCircle2 },
    { label: "Descartados ou com falha", value: data?.dropped ?? 0, icon: AlertTriangle },
  ];

  function openNewMapDialog(technique = "") {
    setMapDialog({
      open: true,
      originalTechnique: null,
      values: { promoTechnique: technique, fgTechniqueId: "" },
    });
  }

  function openEditMapDialog(entry: TechniqueMapEntry) {
    setMapDialog({
      open: true,
      originalTechnique: entry.promo_technique,
      values: {
        promoTechnique: entry.promo_technique,
        fgTechniqueId: entry.fg_technique_id,
      },
    });
  }

  function submitMapEntry(values: TechniqueMapInput) {
    saveEntry.mutate(
      { values, originalTechnique: mapDialog.originalTechnique },
      {
        onSuccess: () => {
          setMapDialog(CLOSED_MAP_DIALOG);
        },
      },
    );
  }

  function confirmDelete() {
    if (!entryToDelete) return;
    deleteEntry.mutate(entryToDelete.promo_technique, {
      onSettled: () => setEntryToDelete(null),
    });
  }

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
            Cadastre a tecnica no mapa abaixo (Mapear, na linha do evento) e clique em Reprocessar
            para reenviar o evento com a tecnica nova.
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
              canManageMap={canManageMap}
              onMapTechnique={(technique) => openNewMapDialog(technique)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Mapeamento de tecnicas do Fast Gravacoes</CardTitle>
            <CardDescription>
              Tecnica escrita na ordem de servico e a tecnica correspondente no Fast Gravacoes. O
              que nao estiver aqui nao gera job no Fast Gravacoes, e quem mantem o mapa e owner ou
              admin da organizacao.
            </CardDescription>
          </div>
          {canManageMap && (
            <Button type="button" size="sm" onClick={() => openNewMapDialog()}>
              <ListPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo mapeamento
            </Button>
          )}
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
            <TechniqueMapTable
              entries={entries}
              canManage={canManageMap}
              busyTechnique={busyTechnique}
              onEdit={openEditMapDialog}
              onDelete={(entry) => setEntryToDelete(entry)}
            />
          )}
        </CardContent>
      </Card>

      <TechniqueMapFormDialog
        open={mapDialog.open}
        onOpenChange={(open) => setMapDialog((current) => ({ ...current, open }))}
        originalTechnique={mapDialog.originalTechnique}
        initialValues={mapDialog.values}
        destinations={destinations}
        isSaving={saveEntry.isPending}
        onSubmit={submitMapEntry}
      />

      <AlertDialog
        open={entryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEntryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mapeamento</AlertDialogTitle>
            <AlertDialogDescription>
              A tecnica "{entryToDelete?.promo_technique}" deixa de gerar job no Fast Gravacoes: as
              OS com essa tecnica passam a ir sem a tecnica e aparecem como Tecnica nao mapeada na
              fila.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntry.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteEntry.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              Excluir mapeamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
