import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WriterRow {
  schema: string;
  table_name: string;
  inserts: number;
  updates: number;
  deletes: number;
  hot_updates: number;
  total_writes: number;
  hot_update_ratio: number | null;
  live_tuples: number;
  dead_tuples: number;
  last_autovacuum: string | null;
  last_autoanalyze: string | null;
  autovacuum_count: number;
  autoanalyze_count: number;
}

interface TopWritersResponse {
  ok: boolean;
  result: { items: WriterRow[]; captured_at: string };
}

const nf = new Intl.NumberFormat("pt-BR");

function relative(ts: string | null): string {
  if (!ts) return "nunca";
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

export function TopWritersPanel() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-maintenance", "top_writers"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<TopWritersResponse>(
        "admin-maintenance",
        { body: { action: "top_writers" } },
      );
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const items = data?.result?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Top escritores (autovacuum tuning)
          {isFetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Sem atividade de escrita registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Tabela</th>
                  <th className="py-2 pr-3 font-medium text-right">Writes</th>
                  <th className="py-2 pr-3 font-medium text-right">INS / UPD / DEL</th>
                  <th className="py-2 pr-3 font-medium text-right">HOT %</th>
                  <th className="py-2 pr-3 font-medium text-right">Dead</th>
                  <th className="py-2 pr-3 font-medium">Último autovacuum</th>
                  <th className="py-2 pr-3 font-medium">Último autoanalyze</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const hotLow =
                    r.hot_update_ratio !== null && r.updates > 100 && r.hot_update_ratio < 30;
                  return (
                    <tr key={r.table_name} className="border-b last:border-none">
                      <td className="py-2 pr-3 font-mono">{r.table_name}</td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {nf.format(r.total_writes)}
                      </td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">
                        {nf.format(r.inserts)} / {nf.format(r.updates)} / {nf.format(r.deletes)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {r.hot_update_ratio === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Badge variant={hotLow ? "destructive" : "secondary"} className="gap-1">
                            {hotLow && <AlertTriangle className="h-3 w-3" />}
                            {r.hot_update_ratio}%
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">
                        {nf.format(r.dead_tuples)}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {relative(r.last_autovacuum)}
                        {r.autovacuum_count > 0 && (
                          <span className="ml-1 text-[10px]">({r.autovacuum_count}x)</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {relative(r.last_autoanalyze)}
                        {r.autoanalyze_count > 0 && (
                          <span className="ml-1 text-[10px]">({r.autoanalyze_count}x)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-muted-foreground">
              HOT % baixo (&lt;30%) em tabelas com muitos updates indica falta de{" "}
              <code>fillfactor</code> ou índices demais — considere reduzir índices ou ajustar{" "}
              <code>fillfactor</code> para 80–90.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
