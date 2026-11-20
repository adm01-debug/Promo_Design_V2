import { useOrganizations } from "@/hooks/use-organization";
import { useAnalytics } from "../hooks/use-analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BarChart3, CalendarDays, Coins, Layers, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);

const compact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const COLORS = ["#8b5cf6", "#f97316", "#0ea5e9", "#22c55e", "#f43f5e"];

const DashboardAnalyticsPage = () => {
  const { currentOrgId } = useOrganizations();
  const { data, isLoading, error } = useAnalytics(currentOrgId);

  if (!currentOrgId) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 text-center text-muted-foreground">
        Crie ou selecione uma organização para visualizar as análises.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 space-y-6" aria-busy="true">
        <div className="h-8 w-64 rounded bg-muted/50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          Não foi possível carregar as análises. Apenas administradores/donos da organização
          visualizam estes dados.
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Custo total do mês",
      value: currency(data.totalCost),
      suffix: "",
      hint: "Soma de cost_estimate",
      icon: <Coins className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: "Chamadas de IA",
      value: compact(data.totalCalls),
      suffix: "",
      hint: "total do mês",
      icon: <Zap className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: "Tokens (in/out)",
      value: compact(data.totalTokensIn + data.totalTokensOut),
      suffix: "",
      hint: `${compact(data.totalTokensIn)} in · ${compact(data.totalTokensOut)} out`,
      icon: <Layers className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: "Dias ativos",
      value: String(data.activeDays),
      suffix: "",
      hint: `média de ${data.callsPerActiveDay.toFixed(1)} chamadas/dia`,
      icon: <CalendarDays className="w-4 h-4" aria-hidden="true" />,
    },
  ];

  const chartData = data.daily.map((d) => ({
    ...d,
    label: new Date(d.day + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
          Analytics de uso
        </h1>
        <p className="text-muted-foreground mt-2">
          Métricas de uso de IA da sua organização no mês corrente.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                {c.icon}
                {c.label}
              </div>
              <div className="mt-1 text-2xl font-bold font-display text-foreground tabular-nums">
                {c.value}
                {c.suffix}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chamadas e custo por dia</CardTitle>
          <CardDescription>Atividade diária de IA no mês corrente.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Nenhuma chamada de IA neste mês.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "calls" ? [`${value}`, "Chamadas"] : [currency(Number(value)), "Custo"]
                  }
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top features</CardTitle>
            <CardDescription>Maior custo acumulado no mês.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.byFeature.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p>
            ) : (
              data.byFeature.slice(0, 6).map((f) => (
                <div key={f.feature} className="flex items-center justify-between text-sm">
                  <span className="truncate">{f.feature}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {currency(f.cost)}
                    <span className="text-xs"> · {f.calls}</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top modelos</CardTitle>
            <CardDescription>Distribuição de uso por modelo de IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.byModel.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p>
            ) : (
              data.byModel.slice(0, 6).map((m) => (
                <div key={m.model} className="flex items-center justify-between text-sm">
                  <span className="truncate">{m.model}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {currency(m.cost)}
                    <span className="text-xs"> · {m.calls}</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardAnalyticsPage;
