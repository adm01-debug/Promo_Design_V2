import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/use-organization";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useMagicUpStyles } from "./use-magic-up-styles";

export type MagicUpJob = Tables<"magic_up_jobs">;

const MAGIC_UP_STYLE_LABELS: Record<string, string> = {
  premium: "Premium",
  lifestyle: "Lifestyle",
  flatlay: "Flat Lay",
  minimal: "Minimalista",
  corporate: "Corporativo",
  ecommerce: "E-commerce",
  social: "Social Media",
  outdoor: "Outdoor",
};

export function useMagicUpJobs() {
  const { currentOrgId } = useOrganizations();
  const queryClient = useQueryClient();
  const { styles: customStyles } = useMagicUpStyles();
  const styleLabels: Record<string, string> = useMemo(() => {
    const merged = { ...MAGIC_UP_STYLE_LABELS };
    for (const s of customStyles) merged[s.slug] = s.name;
    return merged;
  }, [customStyles]);
  const queryKey = ["magic-up-jobs", currentOrgId];

  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey,
    enabled: !!currentOrgId,
    // Polling: a fila é processada na edge function fora do navegador.
    refetchInterval: 3000,
    queryFn: async () => {
      if (!currentOrgId) return [];
      const { data, error } = await supabase.functions.invoke<{ jobs: MagicUpJob[] }>(
        "magic-up-jobs",
        { body: { action: "list", organizationId: currentOrgId } },
      );
      if (error) throw error;
      return data?.jobs ?? [];
    },
  });

  const enqueueBatch = useMutation({
    mutationFn: async (input: {
      prompt: string;
      productName?: string;
      productSku?: string;
      styles: string[];
    }) => {
      if (!currentOrgId) throw new Error("Nenhuma organização selecionada");
      const { data, error } = await supabase.functions.invoke<{ jobs: MagicUpJob[] }>(
        "magic-up-jobs",
        {
          body: {
            action: "enqueue",
            organizationId: currentOrgId,
            prompt: input.prompt,
            productName: input.productName ?? null,
            productSku: input.productSku ?? null,
            styles: input.styles,
          },
        },
      );
      if (error) throw error;
      return data?.jobs ?? [];
    },
    onSuccess: (created) => {
      queryClient.setQueryData<MagicUpJob[]>(queryKey, (old = []) => [...created, ...old]);
      toast.success(
        `Batch enfileirado com ${created.length} ${created.length === 1 ? "job" : "jobs"}`,
      );
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Falha ao enfileirar o lote";
      toast.error(message);
    },
  });

  const cancelJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("magic-up-jobs", {
        body: { action: "cancel", jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Falha ao cancelar o job";
      toast.error(message);
    },
  });

  return { jobs, isLoading, isError, error, styleLabels, enqueueBatch, cancelJob };
}
