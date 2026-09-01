import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AdherenceResult } from "@/features/dam/lib/brand-adherence";

export interface BrandAdherenceGaugeProps {
  result: AdherenceResult;
  className?: string;
  /** Compacto: só o número + label. Default: false (mostra breakdown). */
  compact?: boolean;
}

function toneFor(score: number): { ring: string; label: string; text: string } {
  if (score >= 80) return { ring: "stroke-emerald-400", label: "Excelente", text: "text-emerald-400" };
  if (score >= 60) return { ring: "stroke-sky-400", label: "Bom", text: "text-sky-400" };
  if (score >= 40) return { ring: "stroke-amber-400", label: "Atenção", text: "text-amber-400" };
  return { ring: "stroke-rose-400", label: "Crítico", text: "text-rose-400" };
}

/**
 * Gauge visual (0-100) da aderência à identidade de marca.
 * SVG puro para máxima performance e independência de deps.
 */
export function BrandAdherenceGauge({ result, className, compact = false }: BrandAdherenceGaugeProps) {
  const tone = useMemo(() => toneFor(result.score), [result.score]);
  const circumference = 2 * Math.PI * 42; // r=42
  const dashOffset = circumference * (1 - result.score / 100);

  return (
    <div className={cn("flex items-start gap-4 rounded-lg border border-border/60 bg-card/40 p-4", className)}>
      <div className="relative shrink-0" aria-label={`Aderência ${result.score} de 100 — ${tone.label}`}>
        <svg width="96" height="96" viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="42" strokeWidth="8" className="fill-none stroke-muted/40" />
          <circle
            cx="50"
            cy="50"
            r="42"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn("fill-none transition-[stroke-dashoffset] duration-700 ease-out", tone.ring)}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-mono text-2xl font-semibold tabular-nums", tone.text)}>{result.score}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{tone.label}</span>
        </div>
      </div>

      {!compact && (
        <div className="flex-1 space-y-2">
          <p className="text-xs font-medium text-foreground">Aderência à marca</p>
          <div className="space-y-1.5">
            <BreakdownBar label="Cores" value={result.breakdown.colors} weight={40} />
            <BreakdownBar label="Contraste" value={result.breakdown.contrast} weight={20} />
            <BreakdownBar label="Placement" value={result.breakdown.placement} weight={20} />
            <BreakdownBar label="Regras" value={result.breakdown.rules} weight={20} />
          </div>
          {result.notes.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
              {result.notes.slice(0, 3).map((n, i) => (
                <li key={i} className="leading-snug">• {n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  const tone = toneFor(value);
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-16 text-muted-foreground">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn("h-full rounded-full transition-all duration-500", tone.ring.replace("stroke-", "bg-"))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("w-10 text-right font-mono tabular-nums", tone.text)}>{value}</span>
      <span className="w-8 text-right text-muted-foreground/60">{weight}%</span>
    </div>
  );
}
