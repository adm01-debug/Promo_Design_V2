import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Download, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { downloadCsv } from "@/features/audit/lib/audit-csv";
import { useEndpointTelemetry } from "../hooks/use-endpoint-telemetry";

const PERIODS = [7, 30, 90] as const;

const COMPLIANCE_LABEL: Record<string, string> = {
  "order.edit_blocked": "Edições bloqueadas (ERR_ORDER_EDIT)",
  "brand.recommendation_applied": "Recomendações de marca aplicadas",
};

function relative(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "—";
  }
}

export function EndpointTelemetryPanel() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useEndpointTelemetry(days);

  function handleExportCsv() {
    const rows = data?.endpoints ?? [];
    const csv = [
      "Endpoint,Chamadas,UsuariosUnicos,TokensIn,TokensOut,CustoEstimado,UltimaChamada",
      ...rows.map((e) =>
        [e.endpoint, e.calls, e.unique_users, e.tokens_in, e.tokens_out, e.cost_estimate, e.last_call].join(","),
      ),
    ].join("\n");
    downloadCsv(`telemetria-endpoints-${days}d.csv`, csv);
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Telemetria por endpoint e conformidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totals = data?.totals;
  const endpoints = data?.endpoints ?? [];
  const compliance = data?.compliance ?? [];
  const maxCalls = Math.max(1, ...endpoints.map((e) => e.calls));
  const blocked = compliance.find((c) => c.event === "order.edit_blocked");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Telemetria por endpoint e conformidade
        </CardTitle>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={days === p ? "default" : "outline"}
              onClick={() => setDays(p)}
              aria-pressed={days === p}
            >
              {p}d
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportCsv}
            disabled={endpoints.length === 0}
            aria-label="Exportar telemetria em CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Chamadas</p>
            <p className="text-xl font-semibold">{totals?.total_calls ?? 0}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Endpoints ativos</p>
            <p className="text-xl font-semibold">{totals?.endpoints ?? 0}</p>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Custo estimado</p>
            <p className="text-xl font-semibold">
              ${Number(totals?.total_cost ?? 0).toFixed(4)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Uso por endpoint</p>
          {endpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem chamadas registradas no período.</p>
          ) : (
            <ul className="space-y-2">
              {endpoints.map((e) => (
                <li key={e.endpoint} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{e.endpoint}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {e.calls} · {e.unique_users} usuário(s) · {relative(e.last_call)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(e.calls / maxCalls) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {blocked ? (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-primary" />
            )}
            <p className="text-xs font-medium text-muted-foreground">Conformidade</p>
          </div>
          {compliance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma violação ou evento de conformidade no período.
            </p>
          ) : (
            <ul className="space-y-2">
              {compliance.map((c) => (
                <li
                  key={`${c.event}-${c.table_name}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="truncate">{COMPLIANCE_LABEL[c.event] ?? c.event}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={c.event === "order.edit_blocked" ? "destructive" : "secondary"}>
                      {c.events}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{relative(c.last_event)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EndpointTelemetryPanel;
