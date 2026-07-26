import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RemixPopularityItem {
  readonly recipeId: string;
  readonly remixes: number;
  readonly uniqueUsers: number;
  readonly lastUsedAt: string | null;
}

export interface RemixPopularity {
  readonly windowDays: number;
  readonly items: RemixPopularityItem[];
  /** Acesso O(1) por receita — usado para ordenar o feed. */
  readonly byRecipeId: Record<string, RemixPopularityItem>;
}

const EMPTY: RemixPopularity = { windowDays: 30, items: [], byRecipeId: {} };

/** Parser defensivo: a RPC devolve jsonb livre, então nada é presumido. */
function parse(payload: unknown): RemixPopularity {
  if (!payload || typeof payload !== "object") return EMPTY;
  const raw = payload as Record<string, unknown>;
  const windowDays = typeof raw.window_days === "number" ? raw.window_days : 30;
  const rawItems = Array.isArray(raw.items) ? raw.items : [];

  const items: RemixPopularityItem[] = [];
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.recipe_id !== "string" || row.recipe_id.length === 0) continue;
    items.push({
      recipeId: row.recipe_id,
      remixes: Number(row.remixes ?? 0),
      uniqueUsers: Number(row.unique_users ?? 0),
      lastUsedAt: typeof row.last_used_at === "string" ? row.last_used_at : null,
    });
  }

  const byRecipeId: Record<string, RemixPopularityItem> = {};
  for (const item of items) byRecipeId[item.recipeId] = item;

  return { windowDays, items, byRecipeId };
}

/**
 * Popularidade real das receitas do Feed de Inspiração dentro da organização,
 * derivada dos eventos `video.remix_applied` do audit_log.
 */
export function useRemixPopularity(organizationId: string | null, days = 30) {
  return useQuery({
    queryKey: ["remix_popularity", organizationId, days],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RemixPopularity> => {
      const { data, error } = await supabase.rpc("get_remix_popularity", {
        _org_id: organizationId!,
        _days: days,
      });
      if (error) throw error;
      return parse(data);
    },
  });
}
