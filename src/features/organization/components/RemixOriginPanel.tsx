import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clapperboard, Download } from "lucide-react";
import { downloadCsv } from "@/features/audit/lib/audit-csv";
import { useOrganizations } from "@/hooks/use-organization";
import { useRemixOriginTimeseries } from "@/features/video/hooks/use-remix-origin-timeseries";
import { useRemixPopularity } from "@/features/video/hooks/use-remix-popularity";

const PERIODS = [7, 30, 90] as const;

/** Escapa campos para CSV (RFC 4180) — nomes de receita podem conter vírgula. */
const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.split('"').join('""')}"` : text;
};

export function RemixOriginPanel() {
  const { currentOrgId } = useOrganizations();
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useRemixOriginTimeseries(currentOrgId ?? null, days);
  const { data: popularity } = useRemixPopularity(currentOrgId ?? null, days);

  const chartData = useMemo(
    () =>
      (data?.points ?? []).map((point) => ({
        day: point.day.slice(5), // MM-DD
        Feed: point.feed,
        Sugestão: point.clientSuggestion,
        Link: point.deepLink,
      })),
    [data],
  );

  function handleExportCsv() {
    const header = "Receita,Remixes,UsuariosUnicos,Feed,Sugestao,Link,UltimoUso";
    const rows = (popularity?.items ?? []).map((item) =>
      [
        csvCell(item.recipeId),
        item.remixes,
        item.uniqueUsers,
        item.feedRemixes,
        item.clientSuggestionRemixes,
        item.deepLinkRemixes,
        csvCell(item.lastUsedAt ?? ""),
      ].join(","),
    );
    downloadCsv(`remixes-por-origem-${days}d.csv`, [header, ...rows].join("\n"));
  }

  const totals = data?.totals;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clapperboard className="h-4 w-4 text-primary" aria-hidden="true" />
          Remixes de vídeo por origem
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <SelectTrigger className="h-8 w-[110px] text-xs" aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((period) => (
                <SelectItem key={period} value={String(period)}>
                  {period} dias
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleExportCsv}
            disabled={!popularity || popularity.items.length === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Total", value: totals?.total ?? 0 },
                { label: "Feed", value: totals?.feed ?? 0 },
                { label: "Sugestão", value: totals?.clientSuggestion ?? 0 },
                { label: "Link", value: totals?.deepLink ?? 0 },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[11px] uppercase text-muted-foreground">{kpi.label}</p>
                  <p className="font-mono text-lg text-foreground">{kpi.value}</p>
                </div>
              ))}
            </div>

            {totals && totals.total > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="currentColor" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="Feed"
                      stackId="1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.3)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Sugestão"
                      stackId="1"
                      stroke="hsl(var(--accent))"
                      fill="hsl(var(--accent) / 0.3)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Link"
                      stackId="1"
                      stroke="hsl(var(--muted-foreground))"
                      fill="hsl(var(--muted-foreground) / 0.2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum remix registrado nos últimos {days} dias.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
