import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wrench, AlertCircle, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VacuumItem {
  schema: string;
  table_name: string;
  live_tuples: number;
  dead_tuples: number;
  modified_since_analyze: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
  vacuum_count: number;
  autovacuum_count: number;
  analyze_count: number;
  autoanalyze_count: number;
  days_since_vacuum: number;
  days_since_analyze: number;
  dead_ratio: number;
  total_bytes: number;
  total_pretty: string;
  priority_score: number;
  status: "ok" | "warning" | "critical";
}

function fmtDate(d: string | null): string {
  if (!d) return "nunca";
  try {
    return formatDistanceToNow(parseISO(d), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

function statusVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "critical") return "destructive";
  if (s === "warning") return "secondary";
  return "default";
}

export function VacuumHealthPanel() {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin-maintenance", "vacuum_health"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-maintenance", {
        body: { action: "vacuum_health" },
      });
      if (error) throw error;
      return data as { ok: boolean; result: { items: VacuumItem[]; captured_at: string } };
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const runVacuum = async (table: string, mode: "standard" | "analyze" | "full") => {
    setRunning(`${table}:${mode}`);
    try {
      const { data, error } = await supabase.functions.invoke("admin-maintenance", {
        body: { action: "manual_vacuum", vacuum_table: table, vacuum_mode: mode },
      });
      if (error) throw error;
      const dur = data?.result?.duration_ms;
      toast.success(`VACUUM ${mode} em ${table} concluído${dur ? ` (${dur}ms)` : ""}`);
      qc.invalidateQueries({ queryKey: ["admin-maintenance", "vacuum_health"] });
    } catch (e) {
      toast.error(`Falha em VACUUM ${mode}: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  };

  const items = query.data?.result.items ?? [];
  const critical = items.filter((i) => i.status === "critical").length;
  const warning = items.filter((i) => i.status === "warning").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Saúde de vacuum/analyze
          {items.length > 0 && (
            <>
              <Badge variant="destructive" className="ml-2">{critical} crítico</Badge>
              <Badge variant="secondary">{warning} atenção</Badge>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando saúde do autovacuum…
          </div>
        )}

        {query.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falha ao carregar</AlertTitle>
            <AlertDescription>
              {(query.error as Error)?.message ?? "Erro desconhecido"}
            </AlertDescription>
          </Alert>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Tabela</th>
                  <th className="py-2 pr-3">Tamanho</th>
                  <th className="py-2 pr-3">Vivos / Mortos</th>
                  <th className="py-2 pr-3">% mortos</th>
                  <th className="py-2 pr-3">Último vacuum</th>
                  <th className="py-2 pr-3">Último analyze</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 20).map((i) => (
                  <tr key={i.table_name} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono">{i.table_name}</td>
                    <td className="py-2 pr-3">{i.total_pretty}</td>
                    <td className="py-2 pr-3">
                      {i.live_tuples.toLocaleString("pt-BR")} /{" "}
                      <span className={i.dead_tuples > 1000 ? "text-destructive" : ""}>
                        {i.dead_tuples.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{i.dead_ratio}%</td>
                    <td className="py-2 pr-3">
                      {fmtDate(i.last_autovacuum ?? i.last_vacuum)}
                    </td>
                    <td className="py-2 pr-3">
                      {fmtDate(i.last_autoanalyze ?? i.last_analyze)}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
