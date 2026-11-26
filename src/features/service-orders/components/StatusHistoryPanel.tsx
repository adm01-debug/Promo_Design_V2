import { History, UserRound } from "lucide-react";
import SectionTitle from "./SectionTitle";
import { STATUS_CONFIG, type OsStatus } from "../hooks/use-service-orders";
import { useStatusHistory } from "../hooks/use-status-history";
import { useAuth } from "@/hooks/use-auth";

function statusLabel(status: string | null): string {
  if (!status) return "Criação";
  return STATUS_CONFIG[status as OsStatus]?.label ?? status;
}

function statusBadgeClass(status: string): string {
  const config = STATUS_CONFIG[status as OsStatus];
  return config ? `${config.color} ${config.bg}` : "text-muted-foreground bg-muted/40";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

interface StatusHistoryPanelProps {
  serviceOrderId: string;
}

const StatusHistoryPanel = ({ serviceOrderId }: StatusHistoryPanelProps) => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useStatusHistory(serviceOrderId);
  const entries = data ?? [];

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <SectionTitle icon={History} title="Histórico de Status" />

      {isLoading && (
        <p role="status" className="text-xs text-muted-foreground">
          Carregando histórico...
        </p>
      )}

      {isError && (
        <p role="alert" className="text-xs text-destructive">
          Não foi possível carregar o histórico de status.
        </p>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma mudança de status registrada até agora.
        </p>
      )}

      {!isLoading && !isError && entries.length > 0 && (
        <ol className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 text-xs">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/60"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 font-medium ${
                      entry.old_status
                        ? statusBadgeClass(entry.old_status)
                        : "text-muted-foreground bg-muted/40"
                    }`}
                  >
                    {statusLabel(entry.old_status)}
                  </span>
                  <span className="text-muted-foreground" aria-hidden="true">
                    →
                  </span>
                  <span className="sr-only">para</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-medium ${statusBadgeClass(entry.new_status)}`}
                  >
                    {statusLabel(entry.new_status)}
                  </span>
                </div>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <time dateTime={entry.changed_at}>{formatDate(entry.changed_at)}</time>
                  <span aria-hidden="true">·</span>
                  <UserRound className="h-3 w-3" aria-hidden="true" />
                  {user?.id === entry.user_id ? "Você" : "Outro usuário"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default StatusHistoryPanel;
