import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, TrendingUp, Users, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBrandRecommendationStats } from "../hooks/use-brand-recommendation-stats";

const SOURCE_LABEL: Record<string, string> = {
  client_pattern: "Padrão do cliente",
  brand_guidelines: "Diretrizes de marca",
  ai_inference: "Inferência de IA",
  organization: "Organização",
};

export function BrandRecommendationPanel() {
  const { data, isLoading } = useBrandRecommendationStats(30);

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
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Adoção de recomendações de marca
          <Badge variant="outline" className="ml-auto text-[10px] font-mono">
            {data?.window_days ?? 30}d
          </Badge>
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
                    {formatDistanceToNow(new Date(item.created_at), { locale: ptBR, addSuffix: true })}
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
