import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, AlertTriangle } from "lucide-react";

interface CacheTableRow {
  table_name: string;
  seq_scans: number;
  seq_tup_read: number;
  idx_scans: number;
  idx_tup_fetch: number;
  index_use_ratio: number | null;
  heap_hit_ratio: number | null;
  live_tuples: number;
  status: "ok" | "warning";
}

interface CacheHitResponse {
  ok: boolean;
  result: {
    heap_hit_ratio: number | null;
    idx_hit_ratio: number | null;
    tables: CacheTableRow[];
    captured_at: string;
  };
}

const nf = new Intl.NumberFormat("pt-BR");

function ratioBadge(value: number | null, goodThreshold = 99, warnThreshold = 95) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const variant: "default" | "secondary" | "destructive" =
    value >= goodThreshold ? "default" : value >= warnThreshold ? "secondary" : "destructive";
  return <Badge variant={variant}>{value.toFixed(2)}%</Badge>;
}

export function CacheHitPanel() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-maintenance", "cache_hit"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<CacheHitResponse>(
        "admin-maintenance",
        { body: { action: "cache_hit" } },
      );
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const result = data?.result;
  const tables = result?.tables ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" /> Cache Hit Ratio & uso de índices
          {isFetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-md border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Heap cache global</p>
                <div className="mt-1 flex items-center gap-2">
                  {ratioBadge(result?.heap_hit_ratio ?? null)}
                  <span className="text-[11px] text-muted-foreground">alvo ≥ 99%</span>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Índice cache global</p>
                <div className="mt-1 flex items-center gap-2">
                  {ratioBadge(result?.idx_hit_ratio ?? null)}
                  <span className="text-[11px] text-muted-foreground">alvo ≥ 99%</span>
                </div>
              </div>
            </div>

            {tables.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Sem atividade registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Tabela</th>
                      <th className="py-2 pr-3 font-medium text-right">Seq scans</th>
                      <th className="py-2 pr-3 font-medium text-right">Idx scans</th>
                      <th className="py-2 pr-3 font-medium text-right">Uso de índice</th>
                      <th className="py-2 pr-3 font-medium text-right">Heap hit</th>
                      <th className="py-2 pr-3 font-medium text-right">Live tuples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((t) => (
                      <tr key={t.table_name} className="border-b last:border-none">
                        <td className="py-2 pr-3 font-mono flex items-center gap-1">
                          {t.status === "warning" && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                          {t.table_name}
                        </td>
                        <td className="py-2 pr-3 text-right">{nf.format(t.seq_scans)}</td>
                        <td className="py-2 pr-3 text-right">{nf.format(t.idx_scans)}</td>
                        <td className="py-2 pr-3 text-right">
                          {ratioBadge(t.index_use_ratio, 80, 50)}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {ratioBadge(t.heap_hit_ratio)}
                        </td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {nf.format(t.live_tuples)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Tabelas com muitos <em>seq scans</em> e baixa taxa de uso de índice em conjuntos &gt;10k linhas indicam índices ausentes ou seletividade baixa.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
