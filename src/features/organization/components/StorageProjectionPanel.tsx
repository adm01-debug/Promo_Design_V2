import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Rocket, Loader2, AlertTriangle } from "lucide-react";

interface SizeHistoryRow {
  table_name: string;
  captured_at: string;
  total_bytes: number;
}

function formatBytes(bytes: number): string {
  if (!bytes || !isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function fetchHistory(): Promise<SizeHistoryRow[]> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "size_history", size_history_days: 90 },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.history ?? []) as SizeHistoryRow[];
}

interface Projection {
  table: string;
  current: number;
  slopeBytesPerDay: number;
  in30d: number;
  in90d: number;
  daysTo1GB: number | null;
  samples: number;
}

// Simple linear regression: y = a + b*x, returns slope b (bytes/day)
function linreg(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function StorageProjectionPanel() {
  const query = useQuery({
    queryKey: ["storage-projection"],
    staleTime: 5 * 60_000,
    queryFn: fetchHistory,
  });

  const projections = useMemo<Projection[]>(() => {
    const rows = query.data ?? [];
    if (rows.length < 2) return [];
    // Group by table
    const byTable = new Map<string, SizeHistoryRow[]>();
    for (const r of rows) {
      const arr = byTable.get(r.table_name) ?? [];
      arr.push(r);
      byTable.set(r.table_name, arr);
    }

    const result: Projection[] = [];
    const DAY = 86_400_000;
    const ONE_GB = 1024 ** 3;

    for (const [table, points] of byTable) {
      if (points.length < 3) continue;
      points.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
      const t0 = new Date(points[0].captured_at).getTime();
      const pts = points.map((p) => ({
        x: (new Date(p.captured_at).getTime() - t0) / DAY,
        y: p.total_bytes,
      }));
      const slope = linreg(pts);
      const current = points[points.length - 1].total_bytes;
      const in30d = Math.max(0, current + slope * 30);
      const in90d = Math.max(0, current + slope * 90);
      let daysTo1GB: number | null = null;
      if (slope > 0 && current < ONE_GB) {
        daysTo1GB = (ONE_GB - current) / slope;
      }
      result.push({
        table,
        current,
        slopeBytesPerDay: slope,
        in30d,
        in90d,
        daysTo1GB,
        samples: points.length,
      });
    }
    // Sort by growth rate desc
    result.sort((a, b) => b.slopeBytesPerDay - a.slopeBytesPerDay);
    return result;
  }, [query.data]);

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Rocket className="h-4 w-4 text-muted-foreground" /> Projeção linear de armazenamento
        </h3>
        <span className="text-[10px] text-muted-foreground font-mono">
          Regressão linear · histórico de 90 dias
        </span>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculando projeções…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Falha ao carregar projeção.</p>
      ) : projections.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Snapshots insuficientes (mínimo 3 por tabela). Capture manualmente para acelerar.
        </p>
      ) : (
        <div className="space-y-1.5">
          {projections.slice(0, 8).map((p) => {
            const growing = p.slopeBytesPerDay > 0;
            const alertClose = p.daysTo1GB !== null && p.daysTo1GB < 90;
            return (
              <div key={p.table} className="p-2 rounded-md border text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-muted-foreground truncate">{p.table}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                      {p.samples} snapshots
                    </Badge>
                    {alertClose && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1 shrink-0 gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" /> 1GB em {Math.round(p.daysTo1GB!)}d
                      </Badge>
                    )}
                  </div>
                  <span className={`font-mono ${growing ? "text-amber-500" : "text-emerald-500"}`}>
                    {growing ? "+" : ""}{formatBytes(p.slopeBytesPerDay)}/dia
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {[
                    { label: "hoje", value: p.current },
                    { label: "+30d", value: p.in30d },
                    { label: "+90d", value: p.in90d },
                  ].map((m) => (
                    <div key={m.label} className="p-1 rounded bg-muted/40 text-center">
                      <div className="text-[9px] uppercase text-muted-foreground font-mono">{m.label}</div>
                      <div className="text-[10px] font-mono font-medium">{formatBytes(m.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
