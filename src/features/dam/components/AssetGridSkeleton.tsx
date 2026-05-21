import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface AssetGridSkeletonProps {
  /** "grid" mirrors the AssetCard grid; "list" mirrors the AssetListView rows. */
  viewMode: "grid" | "list";
  /** How many placeholders to render. Capped internally. */
  count: number;
  /** Optional className applied to the wrapper. */
  className?: string;
  /**
   * When true, the skeleton is rendered as a non-interactive overlay
   * (absolute, semi-transparent) so it can sit on top of stale cached data
   * during background revalidation.
   */
  overlay?: boolean;
  /** Accessible label announced to screen readers via aria-label. */
  label?: string;
}

/**
 * Reusable placeholder grid for the DAM library. Use the same component for
 * the cold-start loading state AND for revalidation states where the cache
 * already has data — pass `overlay` to softly hint the user that data is
 * being refreshed without unmounting the existing list.
 */
export function AssetGridSkeleton({
  viewMode,
  count,
  className,
  overlay = false,
  label = "Carregando assets",
}: AssetGridSkeletonProps) {
  const safeCount = Math.max(1, Math.min(count, viewMode === "grid" ? 30 : 24));

  const inner =
    viewMode === "list" ? (
      <div className="space-y-2" data-testid="asset-grid-skeleton-list">
        {Array.from({ length: safeCount }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    ) : (
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        data-testid="asset-grid-skeleton-grid"
      >
        {Array.from({ length: safeCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );

  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      data-testid="asset-grid-skeleton"
      className={cn(
        overlay
          ? "absolute inset-0 z-10 bg-background/60 backdrop-blur-sm pointer-events-none animate-in fade-in duration-150"
          : "w-full",
        className,
      )}
    >
      {overlay ? <div className="p-2">{inner}</div> : inner}
    </div>
  );
}
