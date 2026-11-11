import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ColorEntry {
  name: string;
  hex: string;
}

export interface FontEntry {
  name: string;
  usage?: string;
  source?: string;
}

export interface BrandGuidelines {
  id: string;
  organization_id: string;
  client_id: string;
  primary_colors: ColorEntry[];
  secondary_colors: ColorEntry[];
  fonts: FontEntry[];
  do_rules: string[];
  dont_rules: string[];
  logo_asset_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandGuidelinesInput {
  primary_colors?: ColorEntry[];
  secondary_colors?: ColorEntry[];
  fonts?: FontEntry[];
  do_rules?: string[];
  dont_rules?: string[];
  logo_asset_id?: string | null;
  notes?: string | null;
}

export function useBrandGuidelines(organizationId: string | null, clientId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["brand_guidelines", clientId],
    enabled: !!organizationId && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_guidelines")
        .select("*")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        primary_colors: (data.primary_colors as unknown as ColorEntry[]) ?? [],
        secondary_colors: (data.secondary_colors as unknown as ColorEntry[]) ?? [],
        fonts: (data.fonts as unknown as FontEntry[]) ?? [],
      } as BrandGuidelines;
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: BrandGuidelinesInput) => {
      if (!organizationId || !clientId) throw new Error("organização/cliente requerido");
      const payload = {
        organization_id: organizationId,
        client_id: clientId,
        primary_colors: (input.primary_colors ?? []) as unknown as Json,
        secondary_colors: (input.secondary_colors ?? []) as unknown as Json,
        fonts: (input.fonts ?? []) as unknown as Json,
        do_rules: input.do_rules ?? [],
        dont_rules: input.dont_rules ?? [],
        logo_asset_id: input.logo_asset_id ?? null,
        notes: input.notes ?? null,
      };
      const { error } = await supabase
        .from("brand_guidelines")
        .upsert(payload, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand_guidelines", clientId] }),
  });

  return { guidelines: query.data ?? null, isLoading: query.isLoading, upsert };
}
