import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, RefreshCcw, Database, Bell, History, HardDrive, Clock, CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Camera, Minus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaintenanceStats {
  audit_log_total: number;
  audit_log_older_180d: number;
  notifications_read_older_90d: number;
  status_audit_older_365d: number;
}

interface CleanupResult {
  audit_log_deleted: number;
  notifications_deleted: number;
  status_audit_deleted: number;
  duration_ms?: number;
  executed_at: string;
}

interface MaintenanceRun {
  id: string;
  triggered_by: string | null;
  source: "cron" | "manual";
  status: "success" | "error" | "partial" | "skipped";
  audit_deleted: number;
  notifications_deleted: number;
  status_audit_deleted: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

interface TableSize {
  table: string;
  total_bytes: number;
  table_bytes: number;
  index_bytes: number;
  row_estimate: number;
}

interface GrowthRow {
  table: string;
  current_bytes: number;
  previous_bytes: number | null;
  delta_bytes: number | null;
  delta_pct: number | null;
  current_rows: number;
  previous_rows: number | null;
  delta_rows: number | null;
  latest_at: string;
  previous_at: string | null;
}

async function invokeMaintenance<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const STATUS_META: Record<MaintenanceRun["status"], { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "Sucesso", icon: CheckCircle2, className: "text-emerald-500" },
  error: { label: "Erro", icon: XCircle, className: "text-destructive" },
  partial: { label: "Parcial", icon: AlertTriangle, className: "text-amber-500" },
  skipped: { label: "Ignorada", icon: AlertTriangle, className: "text-muted-foreground" },
};

export function MaintenancePanel() {
  const qc = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ["maintenance-stats"],
    staleTime: 60_000,
    queryFn: () => invokeMaintenance<{ ok: true; stats: MaintenanceStats }>({ action: "stats" }),
  });

  const historyQuery = useQuery({
    queryKey: ["maintenance-history"],
    staleTime: 60_000,
    queryFn: () => invokeMaintenance<{ ok: true; history: MaintenanceRun[] }>({ action: "history", history_limit: 10 }),
  });

  const sizesQuery = useQuery({
    queryKey: ["maintenance-table-sizes"],
    staleTime: 5 * 60_000,
    queryFn: () => invokeMaintenance<{ ok: true; tables: TableSize[] }>({ action: "table_sizes" }),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => invokeMaintenance<{ ok: true; result: CleanupResult }>({ action: "cleanup" }),
    onSuccess: (data) => {
      const r = data.result;
      const total = (r.audit_log_deleted ?? 0) + (r.notifications_deleted ?? 0) + (r.status_audit_deleted ?? 0);
      toast.success(
        total > 0
          ? `Limpeza concluída: ${total} registros removidos${r.duration_ms ? ` em ${r.duration_ms}ms` : ""}`
          : "Limpeza executada — nenhum registro elegível"
      );
      qc.invalidateQueries({ queryKey: ["maintenance-stats"] });
      qc.invalidateQueries({ queryKey: ["maintenance-history"] });
      qc.invalidateQueries({ queryKey: ["maintenance-table-sizes"] });
    },
    onError: (e: Error) => toast.error(`Falha na limpeza: ${e.message}`),
  });

  const stats = statsQuery.data?.stats;
  const history = historyQuery.data?.history ?? [];
  const tables = sizesQuery.data?.tables ?? [];
  const maxBytes = tables.reduce((m, t) => Math.max(m, t.total_bytes), 0);

  const rows = [
    { icon: Database, label: "Logs de auditoria (>180 dias)", value: stats?.audit_log_older_180d ?? 0, total: stats?.audit_log_total ?? 0 },
    { icon: Bell, label: "Notificações lidas (>90 dias)", value: stats?.notifications_read_older_90d ?? 0 },
    { icon: History, label: "Histórico de status (>365 dias)", value: stats?.status_audit_older_365d ?? 0 },
  ];

  const totalPending =
    (stats?.audit_log_older_180d ?? 0) +
    (stats?.notifications_read_older_90d ?? 0) +
    (stats?.status_audit_older_365d ?? 0);

  const refetchAll = () => {
    statsQuery.refetch();
    historyQuery.refetch();
    sizesQuery.refetch();
  };

  const isFetchingAny = statsQuery.isFetching || historyQuery.isFetching || sizesQuery.isFetching;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-4 w-4" /> Manutenção do banco de dados
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={refetchAll} disabled={isFetchingAny} title="Atualizar tudo">
          <RefreshCcw className={`h-4 w-4 ${isFetchingAny ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">
          A limpeza automática roda todo domingo às 03:00 UTC. Apenas registros fora do período de retenção são removidos.
        </p>

        {/* Métricas de retenção */}
        {statsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando estatísticas…
          </div>
        ) : statsQuery.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar estatísticas. Verifique se você é owner/admin.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(({ icon: Icon, label, value, total }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={value > 0 ? "default" : "secondary"} className="font-mono">
                    {value.toLocaleString("pt-BR")}
                  </Badge>
                  {typeof total === "number" && (
                    <span className="text-[10px] text-muted-foreground font-mono">/ {total.toLocaleString("pt-BR")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {totalPending > 0
              ? `${totalPending.toLocaleString("pt-BR")} registros elegíveis para remoção`
              : "Nenhum registro elegível no momento"}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={cleanupMutation.isPending || totalPending === 0}
                className="gap-1.5"
              >
                {cleanupMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Executar limpeza agora
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar limpeza manual</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá permanentemente registros fora do período de retenção
                  (auditoria &gt; 180 dias, notificações lidas &gt; 90 dias, histórico &gt; 365 dias).
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => cleanupMutation.mutate()}>Executar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Uso em disco */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" /> Uso em disco por tabela
          </h3>
          {sizesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Medindo tabelas…
            </div>
          ) : tables.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados disponíveis.</p>
          ) : (
            <div className="space-y-1.5">
              {tables.map((t) => {
                const pct = maxBytes > 0 ? (t.total_bytes / maxBytes) * 100 : 0;
                return (
                  <div key={t.table} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{t.table}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          ~{t.row_estimate.toLocaleString("pt-BR")} linhas
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {formatBytes(t.total_bytes)}
                        </Badge>
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Histórico de execuções */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Últimas execuções
          </h3>
          {historyQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico…
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma execução registrada ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((run) => {
                const meta = STATUS_META[run.status];
                const Icon = meta.icon;
                const total = run.audit_deleted + run.notifications_deleted + run.status_audit_deleted;
                return (
                  <div key={run.id} className="flex items-center justify-between p-2.5 rounded-md border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.className}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] uppercase font-mono h-4 px-1">
                            {run.source}
                          </Badge>
                          <span className="text-muted-foreground">
                            {format(new Date(run.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>
                        {run.error_message && (
                          <p className="text-[10px] text-destructive truncate mt-0.5" title={run.error_message}>
                            {run.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                      <span className="text-muted-foreground">{total.toLocaleString("pt-BR")} rem.</span>
                      {run.duration_ms != null && <span className="text-muted-foreground">{run.duration_ms}ms</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
