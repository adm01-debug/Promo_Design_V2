import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsCard {
  label: string;
  value: number;
  suffix: string;
  hint: string;
}

export interface AnalyticsData {
  totalCost: number;
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  activeDays: number;
  callsPerActiveDay: number;
  tokensPerCall: number;
  daily: Array<{ day: string; cost: number; calls: number }>;
  byFeature: Array<{ feature: string; cost: number; calls: number }>;
  byModel: Array<{ model: string; cost: number; calls: number }>;
}

/**
 * Métricas avançadas de uso de IA da organização no mês corrente.
 * Reutiliza `ai_usage_log` (RLS já restringe a admins/owners da organização).
 */
export function useAnalytics(organizationId: string | null | undefined) {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics", organizationId],
    enabled: !!organizationId,
    staleTime: 60_000,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: logs, error } = await supabase
        .from("ai_usage_log")
        .select("feature_name, model_name, tokens_in, tokens_out, cost_estimate, created_at")
        .eq("organization_id", organizationId!)
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows = logs ?? [];
      let totalCost = 0;
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      const featureMap = new Map<string, { cost: number; calls: number }>();
      const modelMap = new Map<string, { cost: number; calls: number }>();
      const dailyMap = new Map<string, { cost: number; calls: number }>();

      for (const r of rows) {
        const cost = Number(r.cost_estimate ?? 0);
        totalCost += cost;
        totalTokensIn += r.tokens_in ?? 0;
        totalTokensOut += r.tokens_out ?? 0;

        const fk = r.feature_name || "outros";
        const fEntry = featureMap.get(fk) ?? { cost: 0, calls: 0 };
        featureMap.set(fk, { cost: fEntry.cost + cost, calls: fEntry.calls + 1 });

        const mk = r.model_name || "desconhecido";
        const mEntry = modelMap.get(mk) ?? { cost: 0, calls: 0 };
        modelMap.set(mk, { cost: mEntry.cost + cost, calls: mEntry.calls + 1 });

        const day = new Date(r.created_at).toISOString().slice(0, 10);
        const dEntry = dailyMap.get(day) ?? { cost: 0, calls: 0 };
        dailyMap.set(day, { cost: dEntry.cost + cost, calls: dEntry.calls + 1 });
      }

      const daily = Array.from(dailyMap.entries())
        .map(([day, v]) => ({ day, ...v }))
        .sort((a, b) => a.day.localeCompare(b.day));

      const activeDays = daily.length;
      const callsPerActiveDay = activeDays > 0 ? rows.length / activeDays : 0;
      const tokensPerCall = rows.length > 0 ? (totalTokensIn + totalTokensOut) / rows.length : 0;

      return {
        totalCost,
        totalCalls: rows.length,
        totalTokensIn,
        totalTokensOut,
        activeDays,
        callsPerActiveDay,
        tokensPerCall,
        daily,
        byFeature: Array.from(featureMap.entries())
          .map(([feature, v]) => ({ feature, ...v }))
          .sort((a, b) => b.cost - a.cost),
        byModel: Array.from(modelMap.entries())
          .map(([model, v]) => ({ model, ...v }))
          .sort((a, b) => b.cost - a.cost),
      };
    },
  });
}
