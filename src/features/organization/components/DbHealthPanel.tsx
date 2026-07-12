import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, Loader2, RefreshCcw } from "lucide-react";

interface DbHealth {
  db_size_bytes: number;
  connections: {
    total: number;
    active: number;
    idle: number;
    idle_in_transaction?: number;
    max?: number;
    saturation_pct?: number;
  };
  longest_txn_ms?: number;
  cache_hit_ratio: number;
  deadlocks: number;
  xact_rollback: number;
  xact_commit: number;
  temp_bytes: number;
  captured_at: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function fetchDbHealth(): Promise<DbHealth> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "db_health" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.health as DbHealth;
}

export function DbHealthPanel() {
  const query = useQuery({
    queryKey: ["db-health"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: fetchDbHealth,
  });

  const h = query.data;
  const cacheStatus = h
    ? h.cache_hit_ratio >= 99
      ? { color: "text-emerald-500", label: "excelente" }
      : h.cache_hit_ratio >= 95
        ? { color: "text-sky-500", label: "bom" }
        : h.cache_hit_ratio >= 90
          ? { color: "text-amber-500", label: "atenção" }
          : { color: "text-destructive", label: "crítico" }
    : null;

  const totalXact = h ? h.xact_commit + h.xact_rollback : 0;
  const rollbackPct = h && totalXact > 0 ? (h.xact_rollback / totalXact) * 100 : 0;

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-muted-foreground" /> Saúde do Postgres
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="h-7 w-7"
          title="Atualizar"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando servidor…
        </div>
      ) : query.isError || !h ? (
        <p className="text-sm text-destructive">Falha ao consultar saúde do Postgres.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-md border">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">Tamanho DB</div>
            <div className="text-sm font-mono font-semibold mt-0.5">{formatBytes(h.db_size_bytes)}</div>
          </div>
          <div className="p-2.5 rounded-md border">
            <div className="text-[9px] uppercase text-muted-foreground font-mono flex items-center justify-between">
              <span>Conexões</span>
              {typeof h.connections.saturation_pct === "number" && (
                <Badge
                  variant="outline"
                  className={`text-[8px] h-3.5 px-1 ${
                    h.connections.saturation_pct >= 80
                      ? "text-destructive"
                      : h.connections.saturation_pct >= 60
                        ? "text-amber-500"
                        : "text-emerald-500"
                  }`}
                >
                  {h.connections.saturation_pct.toFixed(0)}%
                </Badge>
              )}
            </div>
            <div className="text-sm font-mono font-semibold mt-0.5">
              {h.connections.total}
              {h.connections.max ? (
                <span className="text-muted-foreground text-xs"> / {h.connections.max}</span>
              ) : null}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {h.connections.active} ativas · {h.connections.idle} idle
              {h.connections.idle_in_transaction ? ` · ${h.connections.idle_in_transaction} idle-txn` : ""}
            </div>
          </div>
            <div className={`text-sm font-mono font-semibold mt-0.5 ${cacheStatus?.color ?? ""}`}>
              {h.cache_hit_ratio.toFixed(2)}%
            </div>
          </div>
          <div className="p-2.5 rounded-md border">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">Deadlocks</div>
            <div className={`text-sm font-mono font-semibold mt-0.5 ${h.deadlocks > 0 ? "text-amber-500" : ""}`}>
              {h.deadlocks.toLocaleString("pt-BR")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">acumulado desde boot</div>
          </div>
          <div className="p-2.5 rounded-md border">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">Rollbacks</div>
            <div className={`text-sm font-mono font-semibold mt-0.5 ${rollbackPct > 5 ? "text-amber-500" : ""}`}>
              {h.xact_rollback.toLocaleString("pt-BR")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {rollbackPct.toFixed(2)}% do total
            </div>
          </div>
          <div className="p-2.5 rounded-md border">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">Commits</div>
            <div className="text-sm font-mono font-semibold mt-0.5">
              {h.xact_commit.toLocaleString("pt-BR")}
            </div>
          </div>
          <div className="p-2.5 rounded-md border col-span-2">
            <div className="text-[9px] uppercase text-muted-foreground font-mono">Temp files</div>
            <div className="text-sm font-mono font-semibold mt-0.5">{formatBytes(h.temp_bytes)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Uso de disco temporário (queries que estouraram work_mem)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
