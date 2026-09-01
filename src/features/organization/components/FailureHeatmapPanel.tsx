import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2 } from "lucide-react";

interface Run {
  status: "success" | "error" | "partial" | "skipped";
  created_at: string;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

async function fetchRuns(): Promise<Run[]> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "history", history_limit: 100 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.history ?? []) as Run[];
}

export function FailureHeatmapPanel() {
  const query = useQuery({
    queryKey: ["failure-heatmap"],
    staleTime: 5 * 60_000,
    queryFn: fetchRuns,
  });

  const { grid, max, totalErr, totalRuns } = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let m = 0;
    let err = 0;
    const runs = query.data ?? [];
    for (const r of runs) {
      if (r.status !== "error") continue;
      const d = new Date(r.created_at);
      const dow = d.getDay();
      const h = d.getHours();
      g[dow][h] += 1;
      if (g[dow][h] > m) m = g[dow][h];
      err += 1;
    }
    return { grid: g, max: m, totalErr: err, totalRuns: runs.length };
  }, [query.data]);

  const cellBg = (n: number): string => {
    if (n === 0) return "bg-muted/30";
    const intensity = max > 0 ? n / max : 0;
    if (intensity > 0.75) return "bg-destructive/90";
    if (intensity > 0.5) return "bg-destructive/70";
    if (intensity > 0.25) return "bg-destructive/50";
    return "bg-destructive/30";
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Flame className="h-4 w-4 text-muted-foreground" /> Heatmap de falhas (dia × hora)
        </h3>
        <span className="text-[10px] text-muted-foreground font-mono">
          {totalErr} erro(s) em {totalRuns} execução(ões)
        </span>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Agregando falhas…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Falha ao carregar heatmap.</p>
      ) : totalErr === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma falha no período coberto pelo histórico. 🎉</p>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-1 pl-8 text-[9px] text-muted-foreground font-mono">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="w-4 text-center">{h % 3 === 0 ? h : ""}</div>
            ))}
          </div>
          {grid.map((row, dow) => (
            <div key={dow} className="flex items-center gap-1">
              <span className="w-7 text-[10px] font-mono text-muted-foreground">{DAYS[dow]}</span>
              {row.map((n, h) => (
                <div
                  key={h}
                  className={`w-4 h-4 rounded-sm ${cellBg(n)} transition-colors cursor-help`}
                  title={`${DAYS[dow]} ${String(h).padStart(2, "0")}:00 — ${n} falha(s)`}
                />
              ))}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground">
            <span>Menos</span>
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <div className="w-3 h-3 rounded-sm bg-destructive/30" />
            <div className="w-3 h-3 rounded-sm bg-destructive/50" />
            <div className="w-3 h-3 rounded-sm bg-destructive/70" />
            <div className="w-3 h-3 rounded-sm bg-destructive/90" />
            <span>Mais</span>
          </div>
        </div>
      )}
    </div>
  );
}
