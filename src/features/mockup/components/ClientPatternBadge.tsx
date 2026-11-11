import { Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DesignRecommendation } from "@/features/mockup/hooks/use-client-design-recommendation";

export interface ClientPatternBadgeProps {
  recommendation: DesignRecommendation | undefined;
  onApply: (rec: DesignRecommendation) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Badge que exibe a recomendação de padrão de design derivada do
 * histórico do cliente (ou da organização como fallback), com um botão
 * para aplicar direto no editor.
 */
export function ClientPatternBadge({
  recommendation,
  onApply,
  onDismiss,
  className,
}: ClientPatternBadgeProps) {
  if (!recommendation || recommendation.source === "none" || recommendation.sampleSize < 3) {
    return null;
  }

  const pct = Math.round(recommendation.confidence * 100);
  const sourceLabel = recommendation.source === "client" ? "cliente" : "organização";

  return (
    <div
      className={cn("rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2", className)}
      role="region"
      aria-label="Recomendação de padrão de design"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-[11px] font-medium text-foreground">Padrão do {sourceLabel}</span>
        <Badge variant="secondary" className="ml-auto gap-1 text-[10px]">
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
          {pct}%
        </Badge>
      </div>

      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
        {recommendation.placement && (
          <li>
            Placement: {(recommendation.placement.x * 100).toFixed(0)}% ×{" "}
            {(recommendation.placement.y * 100).toFixed(0)}% · escala{" "}
            {recommendation.placement.scale.toFixed(2)}
          </li>
        )}
        {recommendation.suggestedBlendMode && (
          <li>Blend preferido: {recommendation.suggestedBlendMode}</li>
        )}
        {recommendation.suggestedSurfaceType && (
          <li>Superfície comum: {recommendation.suggestedSurfaceType}</li>
        )}
        {recommendation.opacity !== undefined && (
          <li>Opacidade: {Math.round(recommendation.opacity * 100)}%</li>
        )}
        <li className="text-muted-foreground/60">
          Baseado em {recommendation.sampleSize} rascunhos
        </li>
      </ul>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="h-7 flex-1 text-[11px]"
          onClick={() => onApply(recommendation)}
        >
          Usar padrão
        </Button>
        {onDismiss && (
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onDismiss}>
            Ignorar
          </Button>
        )}
      </div>
    </div>
  );
}
