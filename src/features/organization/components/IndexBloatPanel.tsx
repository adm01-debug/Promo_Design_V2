import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database } from "lucide-react";

interface IndexBloatRow {
  schema_name: string;
  table_name: string;
  index_name: string;
  index_size_bytes: number;
  index_size_pretty: string;
  estimated_bloat_bytes: number;
  estimated_bloat_pct: number;
  index_scans: number;
  is_unique: boolean;
  is_primary: boolean;
  severity: "ok" | "warning" | "critical";
}

const TONE: Record<IndexBloatRow["severity"], string> = {
  ok: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export function IndexBloatPanel() {
  const query = useQuery({
    queryKey: ["index-bloat-estimate"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: IndexBloatRow[] | null; error: Error | null }>
      )("get_index_bloat_estimate", { _min_bytes: 1048576, _limit: 30 });
      if (error) throw error;
      return (data as IndexBloatRow[]) ?? [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-4 w-4" /> Estimativa de bloat em índices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Analisando índices…
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar. Apenas owner/admin têm acesso.
          </p>
        ) : (query.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum índice acima do limite mínimo (1 MB).
          </p>
        ) : (
          <div className="space-y-1.5">
            {query.data!.map((r) => (
              <div
                key={`${r.schema_name}.${r.index_name}`}
                className="flex items-center justify-between gap-2 p-2 rounded-md border text-xs"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-mono truncate">{r.index_name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {r.schema_name}.{r.table_name}
                    {r.is_primary && " · PK"}
                    {r.is_unique && !r.is_primary && " · UNIQUE"}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-muted-foreground">{r.index_size_pretty}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {r.index_scans.toLocaleString("pt-BR")} scans
                  </span>
                  <Badge variant="outline" className={TONE[r.severity]}>
                    {r.severity === "critical"
                      ? "crítico"
                      : r.severity === "warning"
                        ? "aviso"
                        : "ok"}
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-2">
              Bloat estimado por heurística (fillfactor 90%). Rode{" "}
              <code className="font-mono">REINDEX INDEX CONCURRENTLY</code> em índices grandes com
              poucos scans.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
