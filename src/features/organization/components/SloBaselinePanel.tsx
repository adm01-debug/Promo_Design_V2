import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Gauge, Loader2, RefreshCcw } from "lucide-react";

interface SloRow {
  source: string;
  baseline_p95_ms: number | null;
  recent_p95_ms: number | null;
  baseline_samples: number;
  recent_samples: number;
  ratio: number | null;
  status: "ok" | "warning" | "critical" | "insufficient_data";
}

interface SloResponse {
  ok: true;
  baseline_days: number;
  recent_days: number;
  threshold: number;
  sources: SloRow[];
}

const SOURCE_LABELS: Record<string, string> = {
  cron: "Limpeza (cron)",
  manual: "Limpeza (manual)",
  cron_per_org: "Limpeza por org (cron)",
  manual_per_org: "Limpeza por org (manual)",
  cron_per_org_orphans: "Notificações órfãs",
  snapshot_cron: "Snapshot (cron)",
  snapshot_manual: "Snapshot (manual)",
};

const STATUS_META: Record<SloRow["status"], { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  warning: { label: "Atenção", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  critical: { label: "Crítico", className: "bg-destructive/15 text-destructive border-destructive/30" },
  insufficient_data: { label: "Sem dados", className: "bg-muted text-muted-foreground border-border" },
};

function fmtMs(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 1000) return `${v}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

async function fetchSlo(baselineDays: number, threshold: number): Promise<SloResponse> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "slo_baseline", slo_baseline_days: baselineDays, slo_threshold: threshold, slo_recent_days: 7 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as SloResponse;
}

export function SloBaselinePanel() {
  const [baselineDays, setBaselineDays] = useState(60);
  const [threshold, setThreshold] = useState(2);

  const query = useQuery({
    queryKey: ["maintenance-slo-baseline", baselineDays, threshold],
    staleTime: 60_000,
    queryFn: () => fetchSlo(baselineDays, threshold),
  });

  const rows = query.data?.sources ?? [];
  const anyCritical = rows.some((r) => r.status === "critical");

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" /> SLO — regressão de p95
          {anyCritical && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1">
              Regressão detectada
            </Badge>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Select value={String(baselineDays)} onValueChange={(v) => setBaselineDays(Number(v))}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Baseline 30 dias</SelectItem>
              <SelectItem value="60">Baseline 60 dias</SelectItem>
              <SelectItem value="90">Baseline 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(threshold)} onValueChange={(v) => setThreshold(Number(v))}>
            <SelectTrigger className="w-[110px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1.5">Limite 1.5×</SelectItem>
              <SelectItem value="2">Limite 2×</SelectItem>
              <SelectItem value="3">Limite 3×</SelectItem>
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

      <p className="text-[11px] text-muted-foreground">
        Compara o p95 dos últimos 7 dias com o baseline histórico. Regressão &ge; {threshold}× dispara alerta crítico.
      </p>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando baseline…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Falha ao carregar baseline de SLO.</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem execuções bem-sucedidas no baseline.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <Card key={r.source} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono truncate">
                    {SOURCE_LABELS[r.source] ?? r.source}
                  </span>
                  <Badge variant="outline" className={`text-[10px] h-4 px-1 ${meta.className}`}>
                    {meta.label}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="p-1 rounded bg-muted/40">
                    <div className="text-[9px] uppercase text-muted-foreground font-mono">baseline p95</div>
                    <div className="text-[11px] font-mono font-medium">{fmtMs(r.baseline_p95_ms)}</div>
                    <div className="text-[9px] text-muted-foreground font-mono">n={r.baseline_samples}</div>
                  </div>
                  <div className="p-1 rounded bg-muted/40">
                    <div className="text-[9px] uppercase text-muted-foreground font-mono">recente p95</div>
                    <div className="text-[11px] font-mono font-medium">{fmtMs(r.recent_p95_ms)}</div>
                    <div className="text-[9px] text-muted-foreground font-mono">n={r.recent_samples}</div>
                  </div>
                  <div className="p-1 rounded bg-muted/40">
                    <div className="text-[9px] uppercase text-muted-foreground font-mono">razão</div>
                    <div
                      className={`text-[11px] font-mono font-medium ${
                        r.status === "critical"
                          ? "text-destructive"
                          : r.status === "warning"
                            ? "text-amber-500"
                            : ""
                      }`}
                    >
                      {r.ratio != null ? `${r.ratio.toFixed(2)}×` : "—"}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
