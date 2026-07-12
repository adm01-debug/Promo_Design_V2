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
import { Loader2, Activity, Lock, AlertTriangle, Ban, Skull } from "lucide-react";
import { toast } from "sonner";

interface ActivityRow {
  pid: number;
  user_name: string | null;
  application_name: string | null;
  client_addr: string | null;
  state: string | null;
  wait_event_type: string | null;
  wait_event: string | null;
  duration_ms: number | null;
  query: string | null;
}

interface LockRow {
  blocked_pid: number;
  blocked_user: string | null;
  blocked_query: string | null;
  blocking_pid: number;
  blocking_user: string | null;
  blocking_query: string | null;
  blocked_ms: number | null;
}

interface LiveActivityResponse {
  ok: boolean;
  result: {
    activity: ActivityRow[];
    locks: LockRow[];
    connections_by_state: Record<string, number>;
    captured_at: string;
  };
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

export function LiveActivityPanel() {
  const qc = useQueryClient();
  const [killing, setKilling] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-maintenance", "live_activity"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<LiveActivityResponse>(
        "admin-maintenance",
        { body: { action: "live_activity" } },
      );
      if (error) throw error;
      return data;
    },
    refetchInterval: 5_000,
    staleTime: 3_000,
  });

  const killBackend = async (pid: number, mode: "cancel" | "terminate") => {
    setKilling(pid);
    try {
      const { data, error } = await supabase.functions.invoke("admin-maintenance", {
        body: { action: "kill_backend", kill_pid: pid, kill_mode: mode },
      });
      if (error) throw error;
      const ok = (data as { result?: { ok?: boolean } })?.result?.ok;
      if (ok) {
        toast.success(mode === "cancel" ? `Cancelamento enviado ao PID ${pid}` : `PID ${pid} terminado`);
      } else {
        toast.warning(`Comando enviado ao PID ${pid}, mas o backend não confirmou`);
      }
      await qc.invalidateQueries({ queryKey: ["admin-maintenance", "live_activity"] });
    } catch (err) {
      toast.error(`Falha ao encerrar PID ${pid}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setKilling(null);
    }
  };

  const activity = data?.result?.activity ?? [];
  const locks = data?.result?.locks ?? [];
  const states = data?.result?.connections_by_state ?? {};

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" /> Atividade em tempo real
          {isFetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">atualiza a cada 5s</span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke("admin-maintenance", {
                  body: { action: "check_lock_alerts", lock_threshold_ms: 30_000 },
                });
                if (error) throw error;
                const r = (data as { result?: { locks_found?: number; alerts_created?: number } })?.result;
                if ((r?.locks_found ?? 0) === 0) {
                  toast.success("Nenhum lock acima de 30s no momento");
                } else {
                  toast.warning(`${r?.locks_found} lock(s) detectado(s); ${r?.alerts_created ?? 0} alerta(s) criado(s)`);
                }
              } catch (err) {
                toast.error(`Falha na verificação: ${err instanceof Error ? err.message : String(err)}`);
              }
            }}
          >
            <Lock className="h-3 w-3 mr-1" /> Verificar locks &gt; 30s
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Conexões por estado */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(states).map(([state, cnt]) => (
                <Badge
                  key={state}
                  variant={state === "idle in transaction" ? "destructive" : "secondary"}
                >
                  {state}: {cnt}
                </Badge>
              ))}
            </div>

            {/* Locks */}
            {locks.length > 0 && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-destructive mb-2">
                  <Lock className="h-3.5 w-3.5" /> {locks.length} sessão(ões) bloqueada(s)
                </p>
                <div className="space-y-2">
                  {locks.map((l) => (
                    <div key={`${l.blocked_pid}-${l.blocking_pid}`} className="text-[11px] font-mono">
                      <div>
                        <span className="text-destructive">PID {l.blocked_pid}</span> aguarda{" "}
                        <span className="font-semibold">PID {l.blocking_pid}</span>{" "}
                        <span className="text-muted-foreground">({formatDuration(l.blocked_ms)})</span>
                      </div>
                      <div className="text-muted-foreground truncate">↳ {l.blocked_query}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Atividade */}
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhuma query ativa no momento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">PID</th>
                      <th className="py-2 pr-3 font-medium">Estado</th>
                      <th className="py-2 pr-3 font-medium">Duração</th>
                      <th className="py-2 pr-3 font-medium">Wait</th>
                      <th className="py-2 pr-3 font-medium">Query</th>
                      <th className="py-2 pr-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((a) => {
                      const long = (a.duration_ms ?? 0) >= 60_000;
                      const isKilling = killing === a.pid;
                      return (
                        <tr key={a.pid} className="border-b last:border-none align-top">
                          <td className="py-2 pr-3 font-mono">{a.pid}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={a.state === "active" ? "default" : "secondary"}>
                              {a.state}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 font-mono">
                            {long && <AlertTriangle className="inline h-3 w-3 text-amber-500 mr-1" />}
                            {formatDuration(a.duration_ms)}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {a.wait_event ? `${a.wait_event_type}:${a.wait_event}` : "—"}
                          </td>
                          <td className="py-2 pr-3 font-mono text-[11px] max-w-md truncate">
                            {a.query}
                          </td>
                          <td className="py-2 pr-3 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isKilling}
                                onClick={() => killBackend(a.pid, "cancel")}
                                title="Cancelar query (pg_cancel_backend)"
                              >
                                {isKilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isKilling}
                                    title="Terminar sessão (pg_terminate_backend)"
                                  >
                                    <Skull className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Terminar sessão PID {a.pid}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Isso encerra a conexão à força (rollback da transação atual).
                                      Prefira <strong>Cancelar</strong> antes de terminar.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => killBackend(a.pid, "terminate")}>
                                      Terminar sessão
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
