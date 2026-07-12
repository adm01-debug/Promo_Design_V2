import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, Recycle, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type BloatRow = {
  schema: string;
  table_name: string;
  live_tuples: number;
  dead_tuples: number;
  dead_ratio: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
  vacuum_count: number;
  autovacuum_count: number;
  total_bytes: number;
  total_pretty: string;
  status: "ok" | "warning" | "critical";
};

type Response = {
  ok: boolean;
  result: { items: BloatRow[]; captured_at: string };
};

function relativeTime(iso: string | null): string {
  if (!iso) return "nunca";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

const statusStyles: Record<BloatRow["status"], string> = {
  ok: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabel: Record<BloatRow["status"], string> = {
  ok: "OK",
  warning: "Atenção",
  critical: "Crítico",
};

export function TableBloatPanel() {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin-maintenance", "bloat_health"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Response>("admin-maintenance", {
        body: { action: "bloat_health" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("Falha ao carregar saúde de vacuum");
      return data.result;
    },
    staleTime: 60_000,
  });

  async function runAnalyze(tableName: string) {
    setAnalyzing(tableName);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; result: { duration_ms?: number } }>(
        "admin-maintenance",
        { body: { action: "manual_analyze", analyze_table: tableName } },
      );
      if (error) throw error;
      if (!data?.ok) throw new Error("Falha ao executar ANALYZE");
      toast.success(`ANALYZE em ${tableName} concluído em ${data.result?.duration_ms ?? "?"}ms`);
      await queryClient.invalidateQueries({ queryKey: ["admin-maintenance", "bloat_health"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-maintenance", "history"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao executar ANALYZE");
    } finally {
      setAnalyzing(null);
    }
  }


  const items = (query.data?.items ?? []).slice().sort((a, b) => b.dead_ratio - a.dead_ratio);
  const critical = items.filter((i) => i.status === "critical").length;
  const warning = items.filter((i) => i.status === "warning").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Recycle className="h-4 w-4" />
            Saúde do vacuum & tuplas mortas
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Ratio de tuplas mortas por tabela e histórico de autovacuum. Ratio alto indica bloat e
            queda de performance em leituras.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            query.refetch();
            toast.info("Atualizando…");
          }}
          disabled={query.isFetching}
        >
          {query.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : query.isError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {(query.error as Error)?.message ?? "Erro ao carregar"}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Nenhuma tabela monitorada com dados suficientes.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className={statusStyles.critical}>
                {critical} crítica{critical === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline" className={statusStyles.warning}>
                {warning} em atenção
              </Badge>
              <Badge variant="outline" className={statusStyles.ok}>
                {items.length - critical - warning} saudáveis
              </Badge>
            </div>
            <div className="max-h-[480px] overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Tabela</th>
                    <th className="px-3 py-2 text-right font-medium">Dead ratio</th>
                    <th className="px-3 py-2 text-right font-medium">Live / Dead</th>
                    <th className="px-3 py-2 font-medium">Último autovacuum</th>
                    <th className="px-3 py-2 text-right font-medium">Tamanho</th>
                    <th className="px-3 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={`${row.schema}.${row.table_name}`} className="border-t">
                      <td className="px-3 py-2 font-mono">{row.table_name}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {row.dead_ratio.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {row.live_tuples.toLocaleString("pt-BR")} /{" "}
                        <span className={row.dead_tuples > 0 ? "text-foreground" : ""}>
                          {row.dead_tuples.toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {relativeTime(row.last_autovacuum ?? row.last_vacuum)}
                      </td>
                      <td className="px-3 py-2 text-right">{row.total_pretty}</td>
                      <td className="px-3 py-2 text-right">
                        <Badge variant="outline" className={statusStyles[row.status]}>
                          {statusLabel[row.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Regras: ratio ≥ 30% = crítico, ≥ 15% = atenção. Tabelas com menos de 1.000 linhas são
              consideradas OK independentemente do ratio.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
