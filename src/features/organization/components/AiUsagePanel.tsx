import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Coins, AlertTriangle } from "lucide-react";
import { useAiUsage } from "../hooks/use-ai-usage";

interface Props {
  organizationId: string | null | undefined;
}

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);

const compact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/**
 * Painel de custos de IA do mês corrente.
 * Reutiliza `ai_usage_log` (RLS já restringe a admins/owners).
 */
export function AiUsagePanel({ organizationId }: Props) {
  const { data, isLoading, error } = useAiUsage(organizationId);

  if (!organizationId) return null;

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-label="Carregando dados de uso de IA">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            Uso de IA — mês corrente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-md bg-muted/50" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
            Uso de IA indisponível
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Sem permissão ou erro ao carregar. Apenas administradores/donos visualizam custos.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isCritical = data.quotaUsedPct >= 90;
  const isWarning = data.quotaUsedPct >= 70 && !isCritical;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            Uso de IA — mês corrente
          </CardTitle>
          {isCritical && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              Cota quase esgotada
            </Badge>
          )}
          {isWarning && (
            <Badge variant="secondary" className="gap-1 border-amber-500/40 text-amber-500">
              Atenção
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              <Coins className="w-3 h-3" aria-hidden="true" /> Gasto
            </div>
            <div className="mt-1 text-lg font-bold font-display text-foreground tabular-nums">
              {currency(data.totalCost)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              <Zap className="w-3 h-3" aria-hidden="true" /> Chamadas
            </div>
            <div className="mt-1 text-lg font-bold font-display text-foreground tabular-nums">
              {compact(data.totalCalls)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Tokens (in / out)
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
              {compact(data.totalTokensIn)} <span className="text-muted-foreground">/</span> {compact(data.totalTokensOut)}
            </div>
          </div>
        </div>

        {data.quota > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cota mensal</span>
              <span className="font-mono tabular-nums">
                {currency(data.totalCost)} / {currency(data.quota)} ({data.quotaUsedPct.toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={data.quotaUsedPct}
              aria-label={`Cota mensal de IA: ${data.quotaUsedPct.toFixed(1)} por cento utilizada`}
              className={isCritical ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : undefined}
            />
          </div>
        )}

        {data.byFeature.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
              Top features
            </div>
            <ul className="space-y-1.5">
              {data.byFeature.slice(0, 5).map((f) => (
                <li key={f.feature} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate">{f.feature}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {currency(f.cost)} · {f.calls}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.totalCalls === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma chamada de IA registrada neste mês.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
