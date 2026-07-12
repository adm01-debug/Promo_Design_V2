import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, GitBranch, AlertCircle, Bell } from "lucide-react";
import { toast } from "sonner";

interface Replica {
  pid: number;
  user_name: string | null;
  application_name: string | null;
  client_addr: string | null;
  state: string | null;
  sync_state: string | null;
  uptime_seconds: number | null;
  sent_lag_bytes: number | null;
  write_lag_bytes: number | null;
  flush_lag_bytes: number | null;
  replay_lag_bytes: number | null;
  write_lag_ms: number | null;
  flush_lag_ms: number | null;
  replay_lag_ms: number | null;
  status: "ok" | "warning" | "critical";
}

interface Slot {
  slot_name: string;
  slot_type: string;
  database: string | null;
  active: boolean;
  restart_lsn: string | null;
  confirmed_flush_lsn: string | null;
  retained_bytes: number | null;
  status: "ok" | "warning" | "critical";
}

interface ReplicationResult {
  replicas: Replica[];
  slots: Slot[];
  wal: { current_wal_lsn: string; wal_insert_lsn: string };
  captured_at: string;
}

function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes} B`;
  if (abs < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (abs < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function statusVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "critical") return "destructive";
  if (s === "warning") return "secondary";
  return "default";
}

export function ReplicationStatusPanel() {
  const query = useQuery({
    queryKey: ["admin-maintenance", "replication_status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-maintenance", {
        body: { action: "replication_status" },
      });
      if (error) throw error;
      return data as { ok: boolean; result: ReplicationResult };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const result = query.data?.result;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Replicação e WAL
          {result && (
            <Badge variant="outline" className="ml-2">
              {result.replicas.length} réplica(s) · {result.slots.length} slot(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando status de replicação…
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

        {result && (
          <>
            <div className="text-xs text-muted-foreground font-mono">
              WAL atual: {result.wal.current_wal_lsn} · insert: {result.wal.wal_insert_lsn}
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Réplicas conectadas</div>
              {result.replicas.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhuma réplica conectada no momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="text-left border-b">
                        <th className="py-2 pr-3">App</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Sync</th>
                        <th className="py-2 pr-3">Replay lag</th>
                        <th className="py-2 pr-3">Flush lag</th>
                        <th className="py-2 pr-3">Write lag</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.replicas.map((r) => (
                        <tr key={r.pid} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-mono">{r.application_name ?? r.pid}</td>
                          <td className="py-2 pr-3">{r.state ?? "—"}</td>
                          <td className="py-2 pr-3">{r.sync_state ?? "—"}</td>
                          <td className="py-2 pr-3">
                            {fmtBytes(r.replay_lag_bytes)}{" "}
                            {r.replay_lag_ms != null && (
                              <span className="text-muted-foreground">({r.replay_lag_ms}ms)</span>
                            )}
                          </td>
                          <td className="py-2 pr-3">{fmtBytes(r.flush_lag_bytes)}</td>
                          <td className="py-2 pr-3">{fmtBytes(r.write_lag_bytes)}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Slots de replicação</div>
              {result.slots.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nenhum slot de replicação configurado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="text-left border-b">
                        <th className="py-2 pr-3">Slot</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Ativo</th>
                        <th className="py-2 pr-3">WAL retido</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.slots.map((s) => (
                        <tr key={s.slot_name} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-mono">{s.slot_name}</td>
                          <td className="py-2 pr-3">{s.slot_type}</td>
                          <td className="py-2 pr-3">{s.active ? "sim" : "não"}</td>
                          <td className="py-2 pr-3">{fmtBytes(s.retained_bytes)}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
