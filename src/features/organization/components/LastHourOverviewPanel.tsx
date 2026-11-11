import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Cpu,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLastHourOverview, type LastHourOverviewPayload } from "../hooks/use-last-hour-overview";

const WINDOW_OPTIONS = [
  { value: "15", label: "Últimos 15 min" },
  { value: "60", label: "Última hora" },
  { value: "180", label: "Últimas 3 h" },
  { value: "720", label: "Últimas 12 h" },
];

const EVENT_LABELS: Record<string, string> = {
  audit_alert: "Auditoria",
  replication_slot_alert: "Replicação",
  maintenance_failure: "Manutenção",
  maintenance_failure_critical: "Manutenção crítica",
  slo_regression: "SLO",
  lock_alert: "Lock",
  connection_saturation_alert: "Conexões",
  idle_in_txn_alert: "Idle in txn",
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "ok" | "warn" | "error" | "info";
  hint?: string;
}

const TONE_CLASS: Record<StatCardProps["tone"], string> = {
  ok: "border-emerald-500/30 bg-emerald-500/5",
  warn: "border-amber-500/30 bg-amber-500/5",
  error: "border-destructive/40 bg-destructive/5",
  info: "border-primary/30 bg-primary/5",
};

const TONE_ICON: Record<StatCardProps["tone"], string> = {
  ok: "text-emerald-500",
  warn: "text-amber-500",
  error: "text-destructive",
  info: "text-primary",
};

function StatCard({ icon, label, value, tone, hint }: StatCardProps) {
  return (
    <Card className={`p-4 border ${TONE_CLASS[tone]} transition-colors`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="text-[10px] text-muted-foreground truncate">{hint}</p>}
        </div>
        <div className={`shrink-0 ${TONE_ICON[tone]}`} aria-hidden>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function summarizeTopEntry(map: Record<string, number>): string | undefined {
  const entries = Object.entries(map);
  if (!entries.length) return undefined;
  const [name, count] = entries.sort((a, b) => b[1] - a[1])[0];
  const label = EVENT_LABELS[name] ?? name;
  return `${label} × ${count}`;
}

export function LastHourOverviewPanel() {
  const [minutes, setMinutes] = useState(60);
  const { data, isLoading, isFetching, error, refetch } = useLastHourOverview(minutes);

  const payload: LastHourOverviewPayload | undefined = data;
  const totals = payload?.totals;
  const hasIncidents = !!totals && (totals.maintenance_errors > 0 || totals.alerts > 0);

  const topMaintSource = useMemo(
    () => (payload ? summarizeTopEntry(payload.maintenance_errors_by_source) : undefined),
    [payload],
  );
  const topAlert = useMemo(
    () => (payload ? summarizeTopEntry(payload.alerts_by_type) : undefined),
    [payload],
  );
  const topFeature = payload?.top_ai_features[0];

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;
  const isForbidden = errorMessage?.toLowerCase().includes("forbidden");

  return (
    <Card className="p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold truncate">Visão consolidada</h2>
          {payload && (
            <Badge variant="outline" className="font-mono text-[10px]">
              atualizado{" "}
              {formatDistanceToNow(parseISO(payload.captured_at), {
                locale: ptBR,
                addSuffix: true,
              })}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(minutes)} onValueChange={(v) => setMinutes(Number(v))}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5"
          >
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {isForbidden && (
        <div className="flex items-center gap-2 p-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          Você não tem permissão para visualizar métricas consolidadas desta organização.
        </div>
      )}

      {!isForbidden && errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-xs text-destructive">
          <AlertOctagon className="h-4 w-4" />
          Falha ao carregar visão consolidada: {errorMessage}
        </div>
      )}

      {isLoading && !payload && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Consolidando sinais…
        </div>
      )}

      {payload && !hasIncidents && !errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Nenhum incidente registrado nos últimos {payload.window_minutes} minutos.
        </div>
      )}

      {payload && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Wrench className="h-5 w-5" />}
            label="Erros de manutenção"
            value={totals?.maintenance_errors ?? 0}
            tone={
              (totals?.maintenance_errors ?? 0) === 0
                ? "ok"
                : (totals?.maintenance_errors ?? 0) > 3
                  ? "error"
                  : "warn"
            }
            hint={topMaintSource ?? "Nenhuma falha"}
          />
          <StatCard
            icon={<ShieldAlert className="h-5 w-5" />}
            label="Alertas do sistema"
            value={totals?.alerts ?? 0}
            tone={
              (totals?.alerts ?? 0) === 0 ? "ok" : (totals?.alerts ?? 0) > 10 ? "error" : "warn"
            }
            hint={topAlert ?? "Sem alertas"}
          />
          <StatCard
            icon={<Sparkles className="h-5 w-5" />}
            label="Requisições de IA"
            value={payload.ai_usage.requests}
            tone="info"
            hint={
              topFeature
                ? `${topFeature.feature_name} × ${topFeature.requests}`
                : "Sem uso registrado"
            }
          />
          <StatCard
            icon={<Cpu className="h-5 w-5" />}
            label="Custo estimado (USD)"
            value={payload.ai_usage.total_cost.toFixed(4)}
            tone={payload.ai_usage.total_cost > 1 ? "warn" : "info"}
            hint={`${payload.ai_usage.tokens_in + payload.ai_usage.tokens_out} tokens`}
          />
        </div>
      )}
    </Card>
  );
}

export default LastHourOverviewPanel;
