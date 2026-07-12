import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, RefreshCcw, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface SlowQuery {
  query: string;
  calls: number;
  total_exec_ms: number;
  mean_exec_ms: number;
  max_exec_ms: number;
  rows_returned: number;
  shared_blks_hit: number;
  shared_blks_read: number;
}

interface SlowQueriesResult {
  ok: true;
  result: { items: SlowQuery[] | { error: string; items: SlowQuery[] }; captured_at: string };
}

async function fetchSlowQueries(limit: number): Promise<SlowQuery[]> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", {
    body: { action: "slow_queries", slow_queries_limit: limit },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const payload = (data as SlowQueriesResult).result?.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function fmtMs(v: number): string {
  if (v < 1) return `${(v * 1000).toFixed(0)}µs`;
  if (v < 1000) return `${v.toFixed(1)}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

function meanStatus(ms: number): { color: string; label: string } {
  if (ms >= 500) return { color: "text-destructive", label: "crítico" };
  if (ms >= 100) return { color: "text-amber-500", label: "lento" };
  if (ms >= 20) return { color: "text-sky-500", label: "ok" };
  return { color: "text-emerald-500", label: "rápido" };
}

export function SlowQueriesPanel() {
  const [limit, setLimit] = useState(15);
  const [expanded, setExpanded] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["slow-queries", limit],
    staleTime: 60_000,
    queryFn: () => fetchSlowQueries(limit),
  });

  const items = query.data ?? [];

  const copy = async (q: string) => {
    try {
      await navigator.clipboard.writeText(q);
      toast.success("Query copiada");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" /> Queries mais lentas
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLimit((l) => (l === 15 ? 30 : 15))}
            className="h-7 text-xs"
          >
            Top {limit}
          </Button>
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
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando pg_stat_statements…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          Falha ao carregar queries. Verifique se pg_stat_statements está habilitado.
        </p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma query registrada ainda ou pg_stat_statements ainda não capturou dados suficientes.
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((q, i) => {
            const meta = meanStatus(q.mean_exec_ms);
            const isOpen = expanded === i;
            const cacheEff = q.shared_blks_hit + q.shared_blks_read;
            const cacheHit = cacheEff > 0 ? (q.shared_blks_hit / cacheEff) * 100 : 100;
            return (
              <Card key={i} className="p-2.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={`${meta.color} text-[9px] h-4 px-1 shrink-0`}>
                      {meta.label}
                    </Badge>
                    <span className="font-mono text-muted-foreground text-[10px]">
                      #{i + 1}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {q.calls.toLocaleString("pt-BR")} chamadas · média {fmtMs(q.mean_exec_ms)} · max {fmtMs(q.max_exec_ms)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copy(q.query)}
                      className="h-6 w-6"
                      title="Copiar query"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className="h-6 w-6"
                      title={isOpen ? "Recolher" : "Expandir"}
                    >
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <pre className={`text-[10px] font-mono bg-muted/40 rounded p-1.5 whitespace-pre-wrap break-all ${isOpen ? "" : "line-clamp-2"}`}>
                  {q.query}
                </pre>
                {isOpen && (
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    <div className="p-1 rounded bg-muted/40 text-center">
                      <div className="text-[9px] uppercase text-muted-foreground font-mono">total</div>
                      <div className="text-[10px] font-mono">{fmtMs(q.total_exec_ms)}</div>
                    </div>
                    <div className="p-1 rounded bg-muted/40 text-center">
                      <div className="text-[9px] uppercase text-muted-foreground font-mono">linhas</div>
                      <div className="text-[10px] font-mono">{q.rows_returned.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="p-1 rounded bg-muted/40 text-center">
                      <div className="text-[9px] uppercase text-muted-foreground font-mono">cache hit</div>
                      <div className={`text-[10px] font-mono ${cacheHit < 90 ? "text-amber-500" : ""}`}>
                        {cacheHit.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-1 rounded bg-muted/40 text-center">
                      <div className="text-[9px] uppercase text-muted-foreground font-mono">blks lidos</div>
                      <div className="text-[10px] font-mono">{q.shared_blks_read.toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Dados agregados por pg_stat_statements desde o último reset. Queries com &lt; 2 chamadas são ignoradas.
      </p>
    </div>
  );
}
