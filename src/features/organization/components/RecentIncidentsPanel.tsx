import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertOctagon,
  Bell,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaintenanceError {
  id: string;
  source: string;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface AlertRow {
  id: string;
  event_type: string;
  os_number: string | null;
  product_name: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  read: boolean;
}

interface IncidentsPayload {
  window_minutes: number;
  since: string;
  captured_at: string;
  maintenance_errors: MaintenanceError[];
  alerts: AlertRow[];
  counts_by_type: Record<string, number>;
  maintenance_error_count: number;
  alert_count: number;
}

const EVENT_LABELS: Record<string, string> = {
  audit_alert: "Alerta de auditoria",
  replication_slot_alert: "Slot de replicação",
  maintenance_failure: "Falha de manutenção",
  maintenance_failure_critical: "Falha crítica",
  slo_regression: "Regressão de SLO",
  lock_alert: "Lock prolongado",
  connection_saturation_alert: "Saturação de conexões",
  idle_in_txn_alert: "Sessão ociosa em transação",
};

const EVENT_TONE: Record<string, string> = {
  audit_alert: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  replication_slot_alert: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  maintenance_failure: "bg-destructive/15 text-destructive border-destructive/30",
  maintenance_failure_critical: "bg-destructive/25 text-destructive border-destructive/40",
  slo_regression: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  lock_alert: "bg-red-500/15 text-red-500 border-red-500/30",
  connection_saturation_alert: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  idle_in_txn_alert: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
};

const WINDOW_OPTIONS = [
  { value: "15", label: "Últimos 15 min" },
  { value: "60", label: "Últimos 60 min" },
  { value: "180", label: "Últimas 3 h" },
  { value: "720", label: "Últimas 12 h" },
];

async function fetchIncidents(minutes: number): Promise<IncidentsPayload> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: IncidentsPayload | null; error: Error | null }>
  )("get_recent_incidents", { _minutes: minutes });
  if (error) throw error;
  return (data ?? {}) as IncidentsPayload;
}

export function RecentIncidentsPanel() {
  const [windowMin, setWindowMin] = useState<string>("60");
  const minutes = parseInt(windowMin, 10);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["recent_incidents", minutes],
    queryFn: () => fetchIncidents(minutes),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const totalIncidents = (data?.maintenance_error_count ?? 0) + (data?.alert_count ?? 0);
  const criticalCount = data?.counts_by_type?.maintenance_failure_critical ?? 0;
  const isCritical = criticalCount > 0 || (data?.maintenance_error_count ?? 0) > 0;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isCritical ? "bg-destructive/15" : "bg-primary/10"}`}>
            <ShieldAlert
              className={`h-5 w-5 ${isCritical ? "text-destructive" : "text-primary"}`}
            />
          </div>
          <div>
            <h3 className="text-base font-semibold">Incidentes recentes</h3>
            <p className="text-xs text-muted-foreground">
              Consolidação de falhas de manutenção e alertas ativos na janela selecionada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={windowMin} onValueChange={setWindowMin}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando incidentes...
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">Erro ao carregar: {(error as Error).message}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              icon={Activity}
              label="Total"
              value={totalIncidents}
              tone={isCritical ? "critical" : "ok"}
            />
            <StatTile
              icon={AlertOctagon}
              label="Falhas manut."
              value={data?.maintenance_error_count ?? 0}
              tone={(data?.maintenance_error_count ?? 0) > 0 ? "critical" : "ok"}
            />
            <StatTile
              icon={Bell}
              label="Alertas"
              value={data?.alert_count ?? 0}
              tone={(data?.alert_count ?? 0) > 0 ? "warning" : "ok"}
            />
            <StatTile
              icon={Clock}
              label="Janela"
              value={`${data?.window_minutes ?? minutes}min`}
              tone="neutral"
            />
          </div>

          {Object.keys(data?.counts_by_type ?? {}).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(data!.counts_by_type).map(([type, count]) => (
                <Badge key={type} variant="outline" className={EVENT_TONE[type] ?? ""}>
                  {EVENT_LABELS[type] ?? type}: {count}
                </Badge>
              ))}
            </div>
          )}

          {(data?.maintenance_errors.length ?? 0) > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Falhas de manutenção
              </h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {data!.maintenance_errors.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-destructive/20 bg-destructive/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {row.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(row.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {row.error_message && (
                        <p className="text-xs text-foreground/90 mt-1 line-clamp-2 font-mono">
                          {row.error_message}
                        </p>
                      )}
                    </div>
                    {row.duration_ms != null && (
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {row.duration_ms}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data?.alerts.length ?? 0) > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Alertas ({data!.alerts.length})
              </h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {data!.alerts.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-md border bg-card/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${EVENT_TONE[row.event_type] ?? ""}`}
                        >
                          {EVENT_LABELS[row.event_type] ?? row.event_type}
                        </Badge>
                        {!row.read && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(row.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {row.product_name && (
                        <p className="text-xs text-foreground/90 mt-1 line-clamp-1">
                          {row.product_name}
                        </p>
                      )}
                      {row.new_status && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {row.new_status}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalIncidents === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              ✓ Nenhum incidente registrado nos últimos {data?.window_minutes ?? minutes} minutos.
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: number | string;
  tone: "ok" | "warning" | "critical" | "neutral";
}) {
  const toneClass =
    tone === "critical"
      ? "text-destructive bg-destructive/10 border-destructive/30"
      : tone === "warning"
        ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
        : tone === "ok"
          ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
          : "text-muted-foreground bg-muted/40 border-border";

  return (
    <div className={`p-3 rounded-lg border ${toneClass}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
