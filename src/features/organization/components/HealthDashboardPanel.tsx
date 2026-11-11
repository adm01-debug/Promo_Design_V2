import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Heart, ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaintenanceStats {
  audit_log_total: number;
  audit_log_older_180d: number;
  notifications_read_older_90d: number;
  status_audit_older_365d: number;
}

interface MaintenanceRun {
  id: string;
  status: "success" | "error" | "partial" | "skipped";
  created_at: string;
}

interface SizeHistoryRow {
  table_name: string;
  captured_at: string;
  total_bytes: number;
}

interface SloBaselineItem {
  source: string;
  status: "ok" | "warning" | "critical" | "insufficient_data";
  ratio: number | null;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

type HealthLevel = "excellent" | "good" | "warning" | "critical";

interface Signal {
  key: string;
  label: string;
  status: HealthLevel;
  detail: string;
  weight: number;
}

const LEVEL_META: Record<
  HealthLevel,
  { color: string; bg: string; icon: typeof ShieldCheck; label: string; score: number }
> = {
  excellent: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    icon: ShieldCheck,
    label: "Excelente",
    score: 100,
  },
  good: {
    color: "text-sky-500",
    bg: "bg-sky-500/10 border-sky-500/30",
    icon: ShieldCheck,
    label: "Saudável",
    score: 80,
  },
  warning: {
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
    icon: ShieldAlert,
    label: "Atenção",
    score: 55,
  },
  critical: {
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
    icon: ShieldX,
    label: "Crítico",
    score: 25,
  },
};

export function HealthDashboardPanel() {
  const statsQuery = useQuery({
    queryKey: ["maintenance-stats"],
    staleTime: 60_000,
    queryFn: () => invoke<{ ok: true; stats: MaintenanceStats }>({ action: "stats" }),
  });

  const historyQuery = useQuery({
    queryKey: ["maintenance-history"],
    staleTime: 60_000,
    queryFn: () =>
      invoke<{ ok: true; history: MaintenanceRun[] }>({ action: "history", history_limit: 10 }),
  });

  const sizeHistoryQuery = useQuery({
    queryKey: ["maintenance-size-history", 90],
    staleTime: 5 * 60_000,
    queryFn: () =>
      invoke<{ ok: true; history: SizeHistoryRow[] }>({
        action: "size_history",
        size_history_days: 90,
      }),
  });

  const sloQuery = useQuery({
    queryKey: ["slo-baseline", 60, 2],
    staleTime: 60_000,
    queryFn: () =>
      invoke<{ ok: true; items: SloBaselineItem[] }>({
        action: "slo_baseline",
        baseline_days: 60,
        slo_threshold: 2,
      }),
  });

  const signals = useMemo<Signal[]>(() => {
    const list: Signal[] = [];

    // 1. Retention pending
    const stats = statsQuery.data?.stats;
    if (stats) {
      const pending =
        stats.audit_log_older_180d +
        stats.notifications_read_older_90d +
        stats.status_audit_older_365d;
      let status: HealthLevel = "excellent";
      if (pending > 100_000) status = "critical";
      else if (pending > 10_000) status = "warning";
      else if (pending > 0) status = "good";
      list.push({
        key: "retention",
        label: "Retenção",
        status,
        detail:
          pending === 0
            ? "Nenhum registro elegível"
            : `${pending.toLocaleString("pt-BR")} registros elegíveis`,
        weight: 1,
      });
    }

    // 2. Recent execution success
    const history = historyQuery.data?.history ?? [];
    if (history.length > 0) {
      const recent = history.slice(0, 5);
      const errors = recent.filter((r) => r.status === "error").length;
      let status: HealthLevel = "excellent";
      if (errors >= 3) status = "critical";
      else if (errors >= 2) status = "warning";
      else if (errors === 1) status = "good";
      list.push({
        key: "executions",
        label: "Execuções recentes",
        status,
        detail:
          errors === 0
            ? `${recent.length} últimas execuções OK`
            : `${errors}/${recent.length} com erro`,
        weight: 2,
      });
    }

    // 3. Snapshot freshness
    const hist = sizeHistoryQuery.data?.history ?? [];
    if (hist.length > 0) {
      const latestIso = hist.reduce(
        (m, r) => (r.captured_at > m ? r.captured_at : m),
        hist[0].captured_at,
      );
      const ageMs = Date.now() - new Date(latestIso).getTime();
      const hours = ageMs / (60 * 60 * 1000);
      let status: HealthLevel = "excellent";
      if (hours > 72) status = "critical";
      else if (hours > 24) status = "warning";
      else if (hours > 12) status = "good";
      list.push({
        key: "snapshot",
        label: "Snapshot",
        status,
        detail: `Capturado há ${formatDistanceToNow(parseISO(latestIso), { locale: ptBR })}`,
        weight: 1,
      });
    }

    // 4. SLO regression
    const items = sloQuery.data?.items ?? [];
    if (items.length > 0) {
      const critical = items.filter((i) => i.status === "critical").length;
      const warning = items.filter((i) => i.status === "warning").length;
      let status: HealthLevel = "excellent";
      if (critical > 0) status = "critical";
      else if (warning > 0) status = "warning";
      list.push({
        key: "slo",
        label: "SLO p95",
        status,
        detail:
          critical > 0
            ? `${critical} regressão(ões) crítica(s)`
            : warning > 0
              ? `${warning} em atenção`
              : `${items.length} origens dentro do baseline`,
        weight: 2,
      });
    }

    return list;
  }, [statsQuery.data, historyQuery.data, sizeHistoryQuery.data, sloQuery.data]);

  const { score, overall } = useMemo(() => {
    if (signals.length === 0) return { score: 0, overall: "good" as HealthLevel };
    const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
    const weighted = signals.reduce((s, x) => s + LEVEL_META[x.status].score * x.weight, 0);
    const finalScore = Math.round(weighted / totalWeight);
    let level: HealthLevel = "excellent";
    if (finalScore < 40) level = "critical";
    else if (finalScore < 65) level = "warning";
    else if (finalScore < 90) level = "good";
    return { score: finalScore, overall: level };
  }, [signals]);

  const loading =
    statsQuery.isLoading ||
    historyQuery.isLoading ||
    sizeHistoryQuery.isLoading ||
    sloQuery.isLoading;

  const OverallIcon = LEVEL_META[overall].icon;

  return (
    <Card className={`border ${LEVEL_META[overall].bg} transition-colors`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className={`h-4 w-4 ${LEVEL_META[overall].color}`} /> Saúde do sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && signals.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Consolidando métricas…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <OverallIcon className={`h-8 w-8 ${LEVEL_META[overall].color}`} />
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {score}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${LEVEL_META[overall].color} text-[10px] mt-0.5`}
                  >
                    {LEVEL_META[overall].label}
                  </Badge>
                </div>
              </div>
              <div className="flex-1 max-w-xs">
                <Progress value={score} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {signals.length} sinal(is) monitorado(s)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {signals.map((s) => {
                const meta = LEVEL_META[s.status];
                const Icon = meta.icon;
                return (
                  <div
                    key={s.key}
                    className={`flex items-start gap-2 p-2.5 rounded-md border ${meta.bg}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${meta.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{s.label}</span>
                        <Badge variant="outline" className={`${meta.color} text-[9px] h-4 px-1`}>
                          {meta.label}
                        </Badge>
                      </div>
                      <p
                        className="text-[11px] text-muted-foreground mt-0.5 truncate"
                        title={s.detail}
                      >
                        {s.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t">
              <Activity className="h-3 w-3" />
              Score composto ponderado (retenção, execuções, snapshot, SLO). Atualiza a cada 60s.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
