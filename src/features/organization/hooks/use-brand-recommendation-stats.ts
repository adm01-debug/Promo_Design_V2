import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/use-organization";

export interface BrandRecommendationStats {
  window_days: number;
  totals: {
    total_applied: number;
    unique_clients: number;
    unique_users: number;
    avg_confidence: number;
    avg_sample_size: number;
  };
  by_source: Record<string, number>;
  daily: Array<{ day: string; n: number; avg_confidence: number }>;
  recent: Array<{
    created_at: string;
    source: string | null;
    client_id: string | null;
    confidence: number;
    sample_size: number;
  }>;
}

export function useBrandRecommendationStats(days = 30) {
  const { currentOrgId } = useOrganizations();

  return useQuery({
    queryKey: ["brand-recommendation-stats", currentOrgId, days],
    enabled: !!currentOrgId,
    staleTime: 60_000,
    queryFn: async (): Promise<BrandRecommendationStats | null> => {
      if (!currentOrgId) return null;
      const { data, error } = await supabase.rpc("get_brand_recommendation_stats", {
        _org_id: currentOrgId,
        _days: days,
      });
      if (error) throw error;
      return data as unknown as BrandRecommendationStats;
    },
  });
}
