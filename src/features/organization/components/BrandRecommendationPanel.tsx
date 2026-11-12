import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, TrendingUp, Users, Target, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { downloadCsv } from "@/features/audit/lib/audit-csv";
import { useBrandRecommendationStats } from "../hooks/use-brand-recommendation-stats";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useOrganizations } from "@/hooks/use-organization";

const SOURCE_LABEL: Record<string, string> = {
  client_pattern: "Padrão do cliente",
  brand_guidelines: "Diretrizes de marca",
  ai_inference: "Inferência de IA",
  organization: "Organização",
};

const PERIODS = [7, 30, 90] as const;

export function BrandRecommendationPanel() {
  const { currentOrgId } = useOrganizations();
  const [clientId, setClientId] = useState<string>("__all__");
  const [days, setDays] = useState<number>(30);
  const { clients = [] } = useClients(currentOrgId);
  const { data, isLoading } = useBrandRecommendationStats(
    days,
    clientId === "__all__" ? null : clientId,
  );

  function handleExportCsv() {
    const rows = data?.daily ?? [];
    const header = "Dia,Aplicacoes,ConfiancaMedia";
    const csv = [
      header,
      ...rows.map((d) => `${d.day},${d.n},${((d.avg_confidence ?? 0) * 100).toFixed(1)}%`),
    ].join("\n");
    downloadCsv(`recomendacoes-marca-${days}d.csv`, csv);
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Adoção de recomendações de marca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totals = data?.totals;
  const bySource = data?.by_source ?? {};
  const recent = data?.recent ?? [];
  const daily = data?.daily ?? [];
  const confidencePct = Math.round((totals?.avg_confidence ?? 0) * 100);
  const maxDaily = Math.max(1, ...daily.map((d) => d.n));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Adoção de recomendações de marca
          <div className="ml-auto flex items-center gap-2">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-7 w-[180px] text-xs">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
              {PERIODS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={days === p ? "secondary" : "ghost"}
                  className="h-6 px-2 font-mono text-[10px]"
                  onClick={() => setDays(p)}
                  aria-pressed={days === p}
                >
                  {p}d
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={handleExportCsv}
              disabled={daily.length === 0}
              aria-label="Exportar CSV das aplicações por dia"
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              CSV
            </Button>
            <Badge variant="outline" className="text-[10px] font-mono">
              {data?.window_days ?? days}d
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricTile
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Aplicações"
            value={totals?.total_applied ?? 0}
          />
          <MetricTile
            icon={<Users className="h-3.5 w-3.5" />}
            label="Clientes únicos"
            value={totals?.unique_clients ?? 0}
          />
          <MetricTile
            icon={<Target className="h-3.5 w-3.5" />}
            label="Confiança média"
            value={`${confidencePct}%`}
          />
          <MetricTile
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Amostra média"
            value={totals?.avg_sample_size ?? 0}
          />
        </div>

        {daily.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Aplicações por dia</p>
            <div className="flex h-14 items-end gap-0.5 rounded-md border border-border/60 bg-muted/20 p-2">
              {daily.map((d) => {
                const h = Math.max(2, Math.round((d.n / maxDaily) * 100));
                return (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.n} aplicações · ${Math.round((d.avg_confidence ?? 0) * 100)}% confiança`}
                    className="flex-1 rounded-sm bg-primary/70 transition-colors hover:bg-primary"
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(bySource).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Origem</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(bySource).map(([source, count]) => (
                <Badge key={source} variant="secondary" className="text-[11px]">
                  {SOURCE_LABEL[source] ?? source} · {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {recent.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Últimas aplicações</p>
            <ul className="divide-y divide-border/60 rounded-md border border-border/60 bg-muted/20">
              {recent.slice(0, 5).map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABEL[item.source ?? ""] ?? item.source ?? "—"}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {Math.round((item.confidence ?? 0) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma recomendação aplicada nos últimos {data?.window_days ?? 30} dias.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
