import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, Trophy } from "lucide-react";

interface GrowthRow {
  table: string;
  current_bytes: number;
  previous_bytes: number | null;
  delta_bytes: number | null;
  delta_pct: number | null;
  current_rows: number;
  previous_rows: number | null;
  delta_rows: number | null;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function fetchGrowth(): Promise<GrowthRow[]> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "growth", growth_days_back: 30 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.growth ?? []) as GrowthRow[];
}

export function MonthlyGrowthPanel() {
  const query = useQuery({
    queryKey: ["monthly-growth", 30],
    staleTime: 5 * 60_000,
    queryFn: fetchGrowth,
  });

  const growth = (query.data ?? [])
    .filter((g) => g.delta_pct !== null)
    .sort((a, b) => (b.delta_pct ?? 0) - (a.delta_pct ?? 0));

  const rankMeta = (pct: number): { color: string; label: string } => {
    if (pct >= 50) return { color: "text-destructive", label: "acelerado" };
    if (pct >= 20) return { color: "text-amber-500", label: "elevado" };
    if (pct >= 5) return { color: "text-sky-500", label: "moderado" };
    if (pct >= 0) return { color: "text-muted-foreground", label: "estável" };
    return { color: "text-emerald-500", label: "reduziu" };
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> Ranking de crescimento (30 dias)
        </h3>
        <span className="text-[10px] text-muted-foreground font-mono">
          {growth.length} tabela(s) com baseline
        </span>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Ranqueando…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Falha ao carregar ranking.</p>
      ) : growth.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Snapshots insuficientes há 30 dias. Aguarde a coleta ou capture manualmente.
        </p>
      ) : (
        <div className="space-y-1.5">
          {growth.slice(0, 8).map((g, idx) => {
            const pct = g.delta_pct ?? 0;
            const meta = rankMeta(pct);
            return (
              <div
                key={g.table}
                className="flex items-center justify-between p-2 rounded-md border text-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {idx < 3 && <Trophy className={`h-3.5 w-3.5 shrink-0 ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-muted-foreground" : "text-orange-700"}`} />}
                  <span className="font-mono text-muted-foreground truncate">{g.table}</span>
                  <Badge variant="outline" className={`${meta.color} text-[9px] h-4 px-1 shrink-0`}>
                    {meta.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-muted-foreground text-[10px]">
                    {formatBytes(g.current_bytes)}
                  </span>
                  <span className={`${meta.color} min-w-[60px] text-right`}>
                    {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
