import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, RefreshCcw, Database, Bell, History } from "lucide-react";
import { toast } from "sonner";

interface MaintenanceStats {
  audit_log_total: number;
  audit_log_older_180d: number;
  notifications_read_older_90d: number;
  status_audit_older_365d: number;
}

interface CleanupResult {
  audit_log_deleted: number;
  notifications_deleted: number;
  status_audit_deleted: number;
  executed_at: string;
}

async function invokeMaintenance<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function MaintenancePanel() {
  const qc = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ["maintenance-stats"],
    staleTime: 60_000,
    queryFn: () => invokeMaintenance<{ ok: true; stats: MaintenanceStats }>({ action: "stats" }),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => invokeMaintenance<{ ok: true; result: CleanupResult }>({ action: "cleanup" }),
    onSuccess: (data) => {
      const r = data.result;
      const total = r.audit_log_deleted + r.notifications_deleted + r.status_audit_deleted;
      toast.success(
        total > 0
          ? `Limpeza concluída: ${total} registros removidos`
          : "Limpeza executada — nenhum registro elegível"
      );
      qc.invalidateQueries({ queryKey: ["maintenance-stats"] });
    },
    onError: (e: Error) => toast.error(`Falha na limpeza: ${e.message}`),
  });

  const stats = statsQuery.data?.stats;

  const rows = [
    {
      icon: Database,
      label: "Logs de auditoria (>180 dias)",
      value: stats?.audit_log_older_180d ?? 0,
      total: stats?.audit_log_total ?? 0,
    },
    {
      icon: Bell,
      label: "Notificações lidas (>90 dias)",
      value: stats?.notifications_read_older_90d ?? 0,
    },
    {
      icon: History,
      label: "Histórico de status (>365 dias)",
      value: stats?.status_audit_older_365d ?? 0,
    },
  ];

  const totalPending =
    (stats?.audit_log_older_180d ?? 0) +
    (stats?.notifications_read_older_90d ?? 0) +
    (stats?.status_audit_older_365d ?? 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-4 w-4" /> Manutenção do banco de dados
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => statsQuery.refetch()}
          disabled={statsQuery.isFetching}
          title="Atualizar estatísticas"
        >
          <RefreshCcw className={`h-4 w-4 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          A limpeza automática roda todo domingo às 03:00 UTC. Você pode disparar manualmente abaixo — apenas registros
          fora do período de retenção são removidos.
        </p>

        {statsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando estatísticas…
          </div>
        ) : statsQuery.isError ? (
          <p className="text-sm text-destructive">
            Não foi possível carregar estatísticas. Verifique se você é owner/admin.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map(({ icon: Icon, label, value, total }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={value > 0 ? "default" : "secondary"} className="font-mono">
                    {value.toLocaleString("pt-BR")}
                  </Badge>
                  {typeof total === "number" && (
                    <span className="text-[10px] text-muted-foreground font-mono">/ {total.toLocaleString("pt-BR")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {totalPending > 0
              ? `${totalPending.toLocaleString("pt-BR")} registros elegíveis para remoção`
              : "Nenhum registro elegível no momento"}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={cleanupMutation.isPending || totalPending === 0}
                className="gap-1.5"
              >
                {cleanupMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Executar limpeza agora
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar limpeza manual</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá permanentemente registros fora do período de retenção
                  (auditoria &gt; 180 dias, notificações lidas &gt; 90 dias, histórico &gt; 365 dias).
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => cleanupMutation.mutate()}>
                  Executar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
