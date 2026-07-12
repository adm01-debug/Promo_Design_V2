import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Activity, Loader2, RefreshCcw, Download } from "lucide-react";
import { toast } from "sonner";

type SourceKey = "cron" | "manual" | "snapshot_cron" | "snapshot_manual";

interface DurationStats {
  ok: true;
  days_back: number;
  stats: Partial<Record<SourceKey, {
    count: number;
    p50: number | null;
    p95: number | null;
    p99: number | null;
    max: number | null;
    avg: number | null;
  }>>;
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  cron: "Limpeza (cron)",
  manual: "Limpeza (manual)",
  snapshot_cron: "Snapshot (cron)",
  snapshot_manual: "Snapshot (manual)",
};

function fmtMs(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 1000) return `${v}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

async function fetchDurationStats(daysBack: number): Promise<DurationStats> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "duration_stats", duration_days_back: daysBack },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as DurationStats;
}

export function MaintenanceDurationPanel() {
  const [daysBack, setDaysBack] = useState<number>(30);

  const query = useQuery({
    queryKey: ["maintenance-duration-stats", daysBack],
    staleTime: 60_000,
    queryFn: () => fetchDurationStats(daysBack),
  });

  const data = query.data;
  const sources: SourceKey[] = ["cron", "manual", "snapshot_cron", "snapshot_manual"];

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" /> Latência de manutenção (percentis)
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
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando percentis…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Falha ao carregar estatísticas de latência.</p>
      ) : !data ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sources.map((src) => {
            const s = data.stats[src];
            return (
              <Card key={src} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono">{SOURCE_LABELS[src]}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {s?.count ?? 0} execuções
                  </span>
                </div>
                {!s || s.count === 0 ? (
                  <p className="text-[10px] text-muted-foreground">Sem dados no período.</p>
                ) : (
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {[
                      { label: "avg", value: s.avg },
                      { label: "p50", value: s.p50 },
                      { label: "p95", value: s.p95 },
                      { label: "p99", value: s.p99 },
                      { label: "max", value: s.max },
                    ].map((m) => (
                      <div key={m.label} className="p-1 rounded bg-muted/40">
                        <div className="text-[9px] uppercase text-muted-foreground font-mono">{m.label}</div>
                        <div className="text-[11px] font-mono font-medium">{fmtMs(m.value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
