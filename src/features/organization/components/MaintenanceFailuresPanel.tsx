import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertOctagon, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCcw,
  ChevronDown, ChevronRight, Bug,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type RunStatus = "success" | "error" | "skipped" | "partial";
type RunSource = "cron" | "manual" | "snapshot_cron" | "snapshot_manual";

interface FailureRow {
  id: string;
  source: RunSource;
  status: RunStatus;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

interface FailuresSummary {
  ok: true;
  days_back: number;
  totals: Record<RunStatus, number>;
  by_source: Record<RunSource, Record<RunStatus, number>>;
  failures: FailureRow[];
  last_success_by_source: Partial<Record<RunSource, string>>;
}

const SOURCE_LABELS: Record<RunSource, string> = {
  cron: "Limpeza (cron)",
  manual: "Limpeza (manual)",
  snapshot_cron: "Snapshot (cron)",
  snapshot_manual: "Snapshot (manual)",
};

const STATUS_META: Record<RunStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "Sucesso", icon: CheckCircle2, className: "text-emerald-500" },
  error: { label: "Erro", icon: XCircle, className: "text-destructive" },
  skipped: { label: "Ignorada", icon: AlertTriangle, className: "text-muted-foreground" },
  partial: { label: "Parcial", icon: AlertTriangle, className: "text-amber-500" },
};

async function fetchFailures(daysBack: number): Promise<FailuresSummary> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "failures_summary", failures_days_back: daysBack, failures_limit: 15 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as FailuresSummary;
}

export function MaintenanceFailuresPanel() {
  const [daysBack, setDaysBack] = useState<number>(30);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["maintenance-failures", daysBack],
    staleTime: 60_000,
    queryFn: () => fetchFailures(daysBack),
  });

  const data = query.data;
  const totalRuns = data ? Object.values(data.totals).reduce((a, b) => a + b, 0) : 0;
  const errorCount = data?.totals.error ?? 0;
  const skippedCount = data?.totals.skipped ?? 0;
  const partialCount = data?.totals.partial ?? 0;
  const problems = errorCount + partialCount;

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-muted-foreground" /> Falhas & diagnóstico de manutenção
        </h3>
        <div className="flex items-center gap-2">
          <Select value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v))}>
            <SelectTrigger className="w-[130px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            title="Atualizar"
            className="h-7 w-7"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando diagnóstico…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          Falha ao carregar diagnóstico. Verifique se você é owner/admin.
        </p>
      ) : !data ? null : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <SummaryTile
              label="Execuções"
              value={totalRuns}
              hint={`nos últimos ${data.days_back}d`}
              tone="neutral"
            />
            <SummaryTile
              label="Erros"
              value={errorCount}
              hint="requerem atenção"
              tone={errorCount > 0 ? "danger" : "ok"}
            />
            <SummaryTile
              label="Parciais"
              value={partialCount}
              hint="concluídas com falhas"
              tone={partialCount > 0 ? "warning" : "ok"}
            />
            <SummaryTile
              label="Ignoradas"
              value={skippedCount}
              hint="lock ocupado / concorrência"
              tone={skippedCount > 0 ? "warning" : "ok"}
            />
          </div>

          {/* Health per source */}
          <div className="space-y-1.5">
            {(Object.keys(SOURCE_LABELS) as RunSource[]).map((src) => {
              const stats = data.by_source[src];
              const lastOk = data.last_success_by_source[src];
              const total = stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0;
              const errs = stats?.error ?? 0;
              const isHealthy = total > 0 && errs === 0 && !!lastOk;
              const isDegraded = errs > 0 || (total === 0 && src.startsWith("snapshot_cron"));
              const dot = isHealthy
                ? "bg-emerald-500"
                : isDegraded
                  ? "bg-destructive"
                  : "bg-muted-foreground/40";
              return (
                <div key={src} className="flex items-center justify-between p-2 rounded-md border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                    <span className="font-mono">{SOURCE_LABELS[src]}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {total} exec · {errs} erros
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {lastOk
                        ? `ok há ${formatDistanceToNow(parseISO(lastOk), { locale: ptBR, addSuffix: false })}`
                        : "sem sucesso"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent failure list */}
          {problems + skippedCount > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Bug className="h-3 w-3" /> Ocorrências recentes
              </div>
              {data.failures.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nada registrado neste período.</p>
              ) : (
                data.failures.map((f) => {
                  const meta = STATUS_META[f.status];
                  const Icon = meta.icon;
                  const isOpen = openRow === f.id;
                  return (
                    <Collapsible key={f.id} open={isOpen} onOpenChange={(o) => setOpenRow(o ? f.id : null)}>
                      <Card className="p-2 text-xs">
                        <CollapsibleTrigger className="flex items-center justify-between w-full gap-2 text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            {isOpen ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.className}`} />
                            <Badge variant="outline" className="text-[9px] uppercase font-mono h-4 px-1 shrink-0">
                              {SOURCE_LABELS[f.source] ?? f.source}
                            </Badge>
                            <span className="text-muted-foreground truncate">
                              {f.error_message ?? meta.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {format(parseISO(f.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 mt-2 border-t space-y-1 font-mono text-[10px] text-muted-foreground">
                          <div>
                            <span className="text-foreground">status:</span> {meta.label}
                          </div>
                          <div>
                            <span className="text-foreground">origem:</span> {SOURCE_LABELS[f.source] ?? f.source}
                          </div>
                          <div>
                            <span className="text-foreground">iniciada:</span>{" "}
                            {format(parseISO(f.started_at), "dd/MM/yy HH:mm:ss.SSS", { locale: ptBR })}
                          </div>
                          {f.finished_at && (
                            <div>
                              <span className="text-foreground">finalizada:</span>{" "}
                              {format(parseISO(f.finished_at), "dd/MM/yy HH:mm:ss.SSS", { locale: ptBR })}
                            </div>
                          )}
                          {f.duration_ms != null && (
                            <div>
                              <span className="text-foreground">duração:</span> {f.duration_ms}ms
                            </div>
                          )}
                          {f.error_message && (
                            <pre className="mt-1 p-2 rounded bg-muted text-foreground whitespace-pre-wrap break-all">
                              {f.error_message}
                            </pre>
                          )}
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-md border text-xs text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" /> Nenhuma falha registrada nos últimos {data.days_back} dias.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "ok" | "warning" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-500"
        : tone === "ok"
          ? "text-emerald-500"
          : "text-foreground";
  return (
    <Card className="p-2.5">
      <div className="text-[10px] uppercase text-muted-foreground font-mono">{label}</div>
      <div className={`text-xl font-semibold font-mono ${toneClass}`}>{value.toLocaleString("pt-BR")}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </Card>
  );
}
