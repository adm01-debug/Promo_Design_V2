import { cn } from "@/lib/utils";

interface TagCounterProps {
  /** Current number of tags. */
  count: number;
  /** Maximum allowed tags. Defaults to 20. */
  max?: number;
  /**
   * Threshold (count) at which the counter switches to the warning color.
   * Defaults to 80% of `max`.
   */
  warnAt?: number;
  /** Optional extra classes. */
  className?: string;
}

/**
 * Reusable tag counter pill: displays `N/MAX` with progressive colors
 * (muted → warning near the limit → destructive at/over the limit).
 *
 * Uses semantic design tokens only — safe to drop into any tags input UI.
 */
export function TagCounter({ count, max = 20, warnAt, className }: TagCounterProps) {
  const warnThreshold = warnAt ?? Math.ceil(max * 0.8);
  const atLimit = count >= max;
  const nearLimit = count >= warnThreshold && !atLimit;

  return (
    <span
      className={cn(
        "text-[11px] tabular-nums font-mono transition-colors",
        atLimit
          ? "text-destructive font-semibold"
          : nearLimit
            ? "text-warning"
            : "text-muted-foreground",
        className,
      )}
      aria-live="polite"
      aria-label={`${count} de ${max} tags utilizadas`}
    >
      {count}/{max}
    </span>
  );
}
