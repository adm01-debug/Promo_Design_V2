import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCcw, Skull, Timer, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Txn {
  pid: number;
  user_name: string;
  application_name: string | null;
  client_addr: string | null;
  state: string;
  wait_event_type: string | null;
  wait_event: string | null;
  xact_start: string | null;
  query_start: string;
  duration_ms: number;
  query: string;
  status: "ok" | "warning" | "critical";
  is_system: boolean;
}

interface Payload {
  threshold_seconds: number;
  transactions: Txn[];
  total: number;
  captured_at: string;
}

async function fetchTxns(minSeconds: number): Promise<Payload> {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: Payload | null; error: Error | null }>)(
    "get_long_running_txns",
    { _min_seconds: minSeconds },
  );
  if (error) throw error;
  return (data ?? { threshold_seconds: minSeconds, transactions: [], total: 0, captured_at: new Date().toISOString() }) as Payload;
}

function formatDuration(ms: number) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.floor(s % 60)}s`;
}

export function LongRunningTxnsPanel() {
  const [minSeconds, setMinSeconds] = useState(30);
  const [terminatingPid, setTerminatingPid] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["long_running_txns", minSeconds],
    queryFn: () => fetchTxns(minSeconds),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const handleTerminate = async (pid: number) => {
    setTerminatingPid(pid);
    try {
      type TerminateRes = { ok?: boolean; user?: string; elapsed_seconds?: number } | null;
      const { data: res, error: err } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: TerminateRes; error: Error | null }>)(
        "terminate_backend",
        { _pid: pid, _reason: reason.trim() || null },
      );
      if (err) throw err;
      const okRes = res;
      toast({
        title: okRes?.ok ? "Backend encerrado" : "Falha ao encerrar",
        description: `PID ${pid} (${okRes?.user ?? "?"}) — ${okRes?.elapsed_seconds ?? 0}s`,
      });
      setReason("");
      await refetch();
    } catch (e) {
      toast({
        title: "Erro ao encerrar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setTerminatingPid(null);
    }
  };

  const critical = (data?.transactions ?? []).filter((t) => t.status === "critical").length;
  const warning = (data?.transactions ?? []).filter((t) => t.status === "warning").length;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${critical > 0 ? "bg-destructive/15" : "bg-primary/10"}`}>
            <Timer className={`h-5 w-5 ${critical > 0 ? "text-destructive" : "text-primary"}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold">Transações longas</h3>
            <p className="text-xs text-muted-foreground">
              Backends ativos há mais de {minSeconds}s. Encerramento manual disponível para transações não-sistêmicas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Limite (s):</span>
            <Input
              type="number"
              min={5}
              max={3600}
              value={minSeconds}
              onChange={(e) => setMinSeconds(Math.max(5, Math.min(3600, parseInt(e.target.value) || 30)))}
              className="w-20 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">Total: {data?.total ?? 0}</Badge>
        {critical > 0 && (
          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">
            Crítico: {critical}
          </Badge>
        )}
        {warning > 0 && (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30">
            Aviso: {warning}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">Erro: {(error as Error).message}</div>
      ) : (data?.transactions.length ?? 0) === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          ✓ Nenhuma transação longa (limite de {minSeconds}s).
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {data!.transactions.map((t) => (
            <div
              key={t.pid}
              className={`p-3 rounded-md border ${
                t.status === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : t.status === "warning"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-card/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[10px]">PID {t.pid}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.user_name}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t.state}</Badge>
                    {t.wait_event && (
                      <Badge variant="outline" className="text-[10px] bg-muted">
                        {t.wait_event_type}:{t.wait_event}
                      </Badge>
                    )}
                    {t.is_system && (
                      <Badge variant="outline" className="text-[10px] bg-muted-foreground/10">
                        sistema
                      </Badge>
                    )}
                    <span className="text-xs font-semibold">
                      {formatDuration(t.duration_ms)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      iniciado {formatDistanceToNow(parseISO(t.xact_start ?? t.query_start), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-foreground/80 mt-2 line-clamp-3 whitespace-pre-wrap break-all">
                    {t.query}
                  </pre>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={t.is_system || terminatingPid === t.pid}
                      title={t.is_system ? "Backend de sistema — proteção ativa" : "Encerrar backend"}
                    >
                      {terminatingPid === t.pid ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Skull className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Encerrar backend PID {t.pid}?
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-2 text-sm">
                          <p>
                            Isso enviará <code className="font-mono">pg_terminate_backend</code> ao processo.
                            A transação será revertida (rollback). Use somente para transações travadas ou lentas.
                          </p>
                          <div className="p-2 rounded bg-muted text-xs font-mono line-clamp-4">
                            {t.query}
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Motivo (opcional, gravado em auditoria):</label>
                            <Input
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Ex.: lock bloqueando produção"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleTerminate(t.pid)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Encerrar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
