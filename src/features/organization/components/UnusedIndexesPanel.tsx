import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type UnusedIndex = {
  schema: string;
  table_name: string;
  index_name: string;
  scans: number;
  tuples_read: number;
  tuples_fetched: number;
  size_bytes: number;
  size_pretty: string;
  is_unique: boolean;
  is_primary: boolean;
};

type Response = {
  ok: boolean;
  result: { items: UnusedIndex[]; captured_at: string; min_size_kb: number };
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UnusedIndexesPanel() {
  const query = useQuery({
    queryKey: ["admin-maintenance", "unused_indexes"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Response>("admin-maintenance", {
        body: { action: "unused_indexes", unused_indexes_min_kb: 64 },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("Falha ao carregar índices não utilizados");
      return data.result;
    },
    staleTime: 60_000,
  });

  const items = query.data?.items ?? [];
  const totalBytes = items.reduce((sum, i) => sum + Number(i.size_bytes), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Índices não utilizados
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Índices com zero scans desde o último reset de estatísticas. Considere remover para
            economizar disco e acelerar writes.
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
            Nenhum índice ocioso detectado — bom trabalho.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {items.length} índice{items.length === 1 ? "" : "s"} ocioso
                {items.length === 1 ? "" : "s"}
              </span>
              <span>
                Total desperdiçado:{" "}
                <strong className="text-foreground">{formatBytes(totalBytes)}</strong>
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Índice</th>
                    <th className="px-3 py-2 font-medium">Tabela</th>
                    <th className="px-3 py-2 text-right font-medium">Tamanho</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((idx) => (
                    <tr key={`${idx.schema}.${idx.index_name}`} className="border-t">
                      <td className="px-3 py-2 font-mono">
                        {idx.index_name}
                        {idx.is_unique && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            unique
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{idx.table_name}</td>
                      <td className="px-3 py-2 text-right font-medium">{idx.size_pretty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Dica: estatísticas acumulam desde o último reset do pg_stat_statements. Índices
              recém-criados podem aparecer aqui até serem usados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
