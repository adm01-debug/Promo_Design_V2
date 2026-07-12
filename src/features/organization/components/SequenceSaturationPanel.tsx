import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Hash } from "lucide-react";

interface SequenceRow {
  schema_name: string;
  sequence_name: string;
  owned_table: string | null;
  owned_column: string | null;
  last_value: number;
  max_value: number;
  used_pct: number;
  severity: "ok" | "warning" | "critical";
}

const TONE: Record<SequenceRow["severity"], string> = {
  ok: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export function SequenceSaturationPanel() {
  const query = useQuery({
    queryKey: ["sequence-saturation"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: SequenceRow[] | null; error: Error | null }>)(
        "get_sequence_saturation",
        { _min_pct: 0 },
      );
      if (error) throw error;
      return (data ?? []).sort((a, b) => b.used_pct - a.used_pct);
    },
  });

  const rows = query.data ?? [];
  const alerts = rows.filter((r) => r.severity !== "ok");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hash className="h-4 w-4" /> Saturação de sequências
          {alerts.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">
              {alerts.length} em risco
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Analisando sequências…
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">Falha ao carregar. Apenas owner/admin têm acesso.</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma sequência encontrada no schema public.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={`${r.schema_name}.${r.sequence_name}`} className="flex items-center justify-between gap-2 p-2 rounded-md border text-xs">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-mono truncate">{r.sequence_name}</span>
                  {r.owned_table && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {r.owned_table}.{r.owned_column}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-muted-foreground">
                    {r.last_value.toLocaleString("pt-BR")} / {r.max_value.toLocaleString("pt-BR")}
                  </span>
                  <Badge variant="outline" className={TONE[r.severity]}>
                    {r.used_pct}%
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-2">
              Sequências acima de 70% devem ser migradas para <code className="font-mono">bigint</code> antes do overflow.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
