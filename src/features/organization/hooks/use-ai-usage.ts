import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AiUsageStats {
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCalls: number;
  quota: number;
  quotaUsedPct: number;
  byFeature: Array<{ feature: string; cost: number; calls: number }>;
  byModel: Array<{ model: string; cost: number; calls: number }>;
  daily: Array<{ day: string; cost: number; calls: number }>;
}

/**
 * Agrega o uso de IA do MÊS ATUAL para a organização informada.
 * A política RLS de `ai_usage_log` já limita o acesso a admins/owners.
 * Retorna estrutura pronta para render em cards/gráficos.
 */
export function useAiUsage(organizationId: string | null | undefined) {
  return useQuery<AiUsageStats>({
    queryKey: ["ai-usage", organizationId],
    enabled: !!organizationId,
    staleTime: 60_000,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [{ data: logs, error }, { data: org }] = await Promise.all([
        supabase
          .from("ai_usage_log")
          .select("feature_name, model_name, tokens_in, tokens_out, cost_estimate, created_at")
          .eq("organization_id", organizationId!)
          .gte("created_at", monthStart.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("organizations")
          .select("ai_monthly_quota")
          .eq("id", organizationId!)
          .maybeSingle(),
      ]);

      if (error) throw error;

      const rows = logs ?? [];
      const quota = Number(org?.ai_monthly_quota ?? 0);

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

      return {
        totalCost,
        totalTokensIn,
        totalTokensOut,
        totalCalls: rows.length,
        quota,
        quotaUsedPct: quota > 0 ? Math.min(100, (totalCost / quota) * 100) : 0,
        byFeature: Array.from(featureMap.entries())
          .map(([feature, v]) => ({ feature, ...v }))
          .sort((a, b) => b.cost - a.cost),
        byModel: Array.from(modelMap.entries())
          .map(([model, v]) => ({ model, ...v }))
          .sort((a, b) => b.cost - a.cost),
        daily: Array.from(dailyMap.entries())
          .map(([day, v]) => ({ day, ...v }))
          .sort((a, b) => a.day.localeCompare(b.day)),
      };
    },
  });
}
