import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ColorEntry, FontEntry } from "@/features/dam/hooks/use-brand-guidelines";

export interface InferredGuidelines {
  primary_colors: ColorEntry[];
  secondary_colors: ColorEntry[];
  fonts: FontEntry[];
  do_rules: string[];
  dont_rules: string[];
}

export interface InferDiffSection {
  added: string[];
  removed: string[];
  kept: string[];
}

export interface InferDiff {
  primary_colors: InferDiffSection;
  secondary_colors: InferDiffSection;
  fonts: InferDiffSection;
  do_rules: InferDiffSection;
  dont_rules: InferDiffSection;
}

export interface InferGuidelinesResponse {
  proposal: InferredGuidelines;
  client_id: string;
  assets_used: number;
  sample_size: number;
  confidence: number;
  diff: InferDiff;
  history_id: string | null;
  dry_run: boolean;
  requestId: string;
}

export interface InferGuidelinesInput {
  client_id: string;
  asset_urls?: string[];
}

export interface InferHistoryRow {
  id: string;
  organization_id: string;
  client_id: string;
  user_id: string;
  request_id: string | null;
  model: string | null;
  inputs: Record<string, unknown>;
  proposal: InferredGuidelines;
  snapshot_before: Partial<InferredGuidelines>;
  diff: InferDiff;
  sample_size: number;
  assets_used: number;
  confidence: number | null;
  applied: boolean;
  applied_at: string | null;
  applied_selection: Partial<InferredGuidelines> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Dispara a edge function em modo dry-run. Registra automaticamente uma
 * entrada em `brand_guidelines_infer_history`.
 */
export function useBrandGuidelinesInfer() {
  const qc = useQueryClient();
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
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["brand_guidelines_infer_history", variables.client_id] });
    },
  });
}

/**
 * Lista o histórico de sugestões de brand guidelines para um cliente.
 */
export function useBrandGuidelinesInferHistory(clientId: string | null, limit = 20) {
  return useQuery({
    queryKey: ["brand_guidelines_infer_history", clientId, limit],
    enabled: !!clientId,
    queryFn: async (): Promise<InferHistoryRow[]> => {
      const { data, error } = await supabase
        .from("brand_guidelines_infer_history")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as InferHistoryRow[];
    },
  });
}

export interface MarkAppliedInput {
  history_id: string;
  client_id: string;
  selection: Partial<InferredGuidelines>;
}

/**
 * Marca um registro de histórico como aplicado + guarda a seleção usada.
 */
export function useMarkInferHistoryApplied() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarkAppliedInput) => {
      const { error } = await supabase
        .from("brand_guidelines_infer_history")
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
          applied_selection: input.selection as never,
        })
        .eq("id", input.history_id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["brand_guidelines_infer_history", v.client_id] });
    },
  });
}
