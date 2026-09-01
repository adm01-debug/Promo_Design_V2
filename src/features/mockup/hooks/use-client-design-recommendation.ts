import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientDesignPattern {
  id: string;
  organization_id: string;
  client_id: string | null;
  logo_scale_p50: number | null;
  logo_scale_p90: number | null;
  logo_x_percent_p50: number | null;
  logo_y_percent_p50: number | null;
  opacity_p50: number | null;
  preferred_blend_modes: Record<string, number>;
  preferred_surface_types: Record<string, number>;
  sample_size: number;
  confidence: number;
  last_computed_at: string | null;
}

export interface DesignRecommendation {
  placement?: { x: number; y: number; scale: number };
  opacity?: number;
  suggestedBlendMode?: string;
  suggestedSurfaceType?: string;
  confidence: number; // 0..1
  sampleSize: number;
  source: "client" | "organization" | "none";
}

function topKey(dict: Record<string, number> | null | undefined): string | undefined {
  if (!dict) return undefined;
  const entries = Object.entries(dict);
  if (entries.length === 0) return undefined;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function toRecommendation(
  row: ClientDesignPattern | null,
  source: "client" | "organization",
): DesignRecommendation | null {
  if (!row) return null;
  const rec: DesignRecommendation = {
    confidence: Number(row.confidence ?? 0),
    sampleSize: row.sample_size ?? 0,
    source,
  };
  if (
    row.logo_x_percent_p50 != null &&
    row.logo_y_percent_p50 != null &&
    row.logo_scale_p50 != null
  ) {
    rec.placement = {
      x: Number(row.logo_x_percent_p50) / 100,
      y: Number(row.logo_y_percent_p50) / 100,
      scale: Number(row.logo_scale_p50),
    };
  }
  if (row.opacity_p50 != null) rec.opacity = Number(row.opacity_p50) / 100;
  rec.suggestedBlendMode = topKey(row.preferred_blend_modes);
  rec.suggestedSurfaceType = topKey(row.preferred_surface_types);
  return rec;
}

/**
 * Retorna a recomendação de design para o cliente atual, com fallback
 * para o padrão da organização.
 *
 * @param organizationId  id da organização (obrigatório para ativar a query)
 * @param clientId        id do cliente — se null usa apenas o padrão da org
 */
export function useClientDesignRecommendation(
  organizationId: string | null,
  clientId: string | null,
) {
  return useQuery({
    queryKey: ["client_design_patterns", organizationId, clientId],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5min — muda apenas via recompute
    queryFn: async (): Promise<DesignRecommendation> => {
      const orgId = organizationId!;

      // 1) Preferência: padrão do cliente específico
      if (clientId) {
        const { data, error } = await supabase
          .from("client_design_patterns")
          .select("*")
          .eq("organization_id", orgId)
          .eq("client_id", clientId)
          .maybeSingle();
        if (error) throw error;
        const rec = toRecommendation(data as ClientDesignPattern | null, "client");
        if (rec) return rec;
      }

      // 2) Fallback: padrão agregado da organização
      const { data, error } = await supabase
        .from("client_design_patterns")
        .select("*")
        .eq("organization_id", orgId)
        .is("client_id", null)
        .maybeSingle();
      if (error) throw error;
      const rec = toRecommendation(data as ClientDesignPattern | null, "organization");
      return rec ?? { confidence: 0, sampleSize: 0, source: "none" };
    },
  });
}
