import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetFilters } from "../hooks/use-assets";
import { MIN_SEARCH_LENGTH } from "../hooks/use-assets";

const PAGE_SIZE = 500;
/** Hard cap to protect the browser from runaway exports. */
export const MAX_EXPORT_ROWS = 5000;

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%,()]/g, " ").trim();
}

export interface FetchAllResult {
  assets: Asset[];
  /** True when the result was clamped at MAX_EXPORT_ROWS. */
  truncated: boolean;
  /** Total reported by the backend (pre-clamp). */
  totalReported: number;
}

/**
 * Iterates the assets table in chunks, applying the same filters used by the
 * library page so the export covers ALL filtered rows (not just the current
 * page). Honors `signal` for cancellation and stops at MAX_EXPORT_ROWS.
 *
 * Note: `relevance` sort and OCR-only client-side filter are NOT used here —
 * exports always use stable created_at-desc ordering and skip the OCR-only
 * post-filter (it is a UI affordance, not a server-side filter).
 */
export async function fetchAllFilteredAssets(
  organizationId: string,
  filters: AssetFilters,
  options: { signal?: AbortSignal; onProgress?: (loaded: number, total: number) => void } = {},
): Promise<FetchAllResult> {
  const { signal, onProgress } = options;
  const out: Asset[] = [];
  let from = 0;
  let totalReported = 0;

  // Build a base query factory so each page reuses the same filters.
  const baseQuery = () => {
    let q = supabase
      .from("assets")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (filters.archivedOnly) q = q.eq("is_archived", true);
    else if (!filters.includeArchived) q = q.eq("is_archived", false);

    if (filters.clientId) q = q.eq("client_id", filters.clientId);

    if (filters.assetTypes && filters.assetTypes.length > 0) {
      q = q.in("asset_type", filters.assetTypes);
    } else if (filters.assetType && filters.assetType !== "all") {
      q = q.eq("asset_type", filters.assetType);
    }

    if (filters.tags && filters.tags.length > 0) {
      if ((filters.tagsMode ?? "all") === "any") q = q.overlaps("tags", filters.tags);
      else q = q.contains("tags", filters.tags);
    }

    const term = filters.search?.trim() ?? "";
    if (term.length >= MIN_SEARCH_LENGTH) {
      const safe = sanitizeSearchTerm(term);
      if (safe) q = q.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    if (typeof filters.minSize === "number") q = q.gte("file_size", filters.minSize);
    if (typeof filters.maxSize === "number") q = q.lte("file_size", filters.maxSize);
    if (filters.updatedAfter) q = q.gte("updated_at", filters.updatedAfter);

    return q;
  };

  while (out.length < MAX_EXPORT_ROWS) {
    if (signal?.aborted) throw new DOMException("Export aborted", "AbortError");

    const remaining = MAX_EXPORT_ROWS - out.length;
    const size = Math.min(PAGE_SIZE, remaining);
    const to = from + size - 1;
    const { data, error, count } = await baseQuery().range(from, to);
    if (error) throw error;

    const rows = (data ?? []) as unknown as Asset[];
    if (typeof count === "number") totalReported = count;
    out.push(...rows);
    onProgress?.(out.length, totalReported || out.length);

    if (rows.length < size) break; // Reached the end.
    from += size;
  }

  const truncated = totalReported > out.length;
  return { assets: out, truncated, totalReported };
}

/**
 * Returns a rough estimate (in seconds) of how long an export will take.
 * Used for proactively warning the user before they kick off a big export.
 */
export function estimateExportSeconds(rowCount: number, kind: "csv" | "pdf"): number {
  // Empirical, conservative: CSV is fast (~5k rows/s), PDF is slower (~1.5k rows/s).
  const rate = kind === "csv" ? 5000 : 1500;
  return Math.max(1, Math.ceil(rowCount / rate));
}
