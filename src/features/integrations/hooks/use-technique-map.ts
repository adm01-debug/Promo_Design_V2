import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TechniqueMapEntry {
  promo_technique: string;
  fg_technique_id: string;
  updated_at: string;
}

export const TECHNIQUE_MAP_LIMIT = 500;

/**
 * Mapa tecnica-da-OS -> tecnica do Fast Gravacoes (tabela global de
 * configuracao da integracao). Leitura para o time diagnosticar por que um job
 * nao nasceu no Fast Gravacoes: tecnica sem linha aqui gera fg_technique_id
 * NULL na fila.
 */
export function useTechniqueMap() {
  return useQuery({
    queryKey: ["integration-technique-map"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TechniqueMapEntry[]> => {
      const { data, error } = await supabase
        .from("integration_technique_map")
        .select("promo_technique, fg_technique_id, updated_at")
        .order("promo_technique", { ascending: true })
        .limit(TECHNIQUE_MAP_LIMIT);

      if (error) throw error;
      return (data ?? []) as TechniqueMapEntry[];
    },
  });
}
