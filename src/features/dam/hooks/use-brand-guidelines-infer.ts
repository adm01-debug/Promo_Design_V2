import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ColorEntry, FontEntry } from "@/features/dam/hooks/use-brand-guidelines";

export interface InferredGuidelines {
  primary_colors: ColorEntry[];
  secondary_colors: ColorEntry[];
  fonts: FontEntry[];
  do_rules: string[];
  dont_rules: string[];
}

export interface InferGuidelinesResponse {
  proposal: InferredGuidelines;
  client_id: string;
  assets_used: number;
  dry_run: boolean;
  requestId: string;
}

export interface InferGuidelinesInput {
  client_id: string;
  asset_urls?: string[];
}

/**
 * Hook que dispara a edge function `brand-guidelines-infer` em modo dry-run.
 * A resposta contém a proposta — a UI é responsável por revisar e aplicar
 * via `useBrandGuidelines().upsert`.
 */
export function useBrandGuidelinesInfer() {
  return useMutation({
    mutationFn: async (input: InferGuidelinesInput): Promise<InferGuidelinesResponse> => {
      const { data, error } = await supabase.functions.invoke<InferGuidelinesResponse>(
        "brand-guidelines-infer",
        { body: input },
      );
      if (error) throw error;
      if (!data) throw new Error("Resposta vazia da IA");
      return data;
    },
  });
}
