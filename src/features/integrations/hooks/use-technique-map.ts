import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TechniqueMapEntry {
  promo_technique: string;
  fg_technique_id: string;
  updated_at: string;
}

/** O que o usuario digita no formulario do mapa. */
export interface TechniqueMapInput {
  promoTechnique: string;
  fgTechniqueId: string;
}

export interface SaveTechniqueMapEntryArgs {
  values: TechniqueMapInput;
  /**
   * Chave atual da linha. Presente = edicao (a linha pode ate mudar de tecnica);
   * ausente = novo mapeamento.
   */
  originalTechnique?: string | null;
}

export const TECHNIQUE_MAP_LIMIT = 500;

const ERROR_MESSAGES: Record<string, string> = {
  ERR_TECNICA_VAZIA: "Informe a tecnica como ela aparece na ordem de servico.",
  ERR_DESTINO_VAZIO: "Informe a tecnica correspondente no Fast Gravacoes.",
  ERR_SEM_PERMISSAO:
    "Voce precisa ser owner ou admin da organizacao para manter o mapa, ou o mapeamento ja foi removido.",
  "23505": "Esta tecnica ja esta mapeada. Edite a linha existente em vez de criar outra.",
  "42501": "Voce precisa ser owner ou admin da organizacao para manter o mapa de tecnicas.",
};

export function techniqueMapErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const known = Object.entries(ERROR_MESSAGES).find(([code]) => message.includes(code));
  return known?.[1] ?? "Nao foi possivel salvar o mapeamento de tecnicas.";
}

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

/**
 * Cria ou edita um mapeamento. A tabela guarda a tecnica normalizada (minuscula,
 * sem acento, espaco colapsado) porque e assim que ela e comparada com o texto
 * da OS - quem normaliza e o trigger no banco, nao a tela.
 */
export function useSaveTechniqueMapEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ values, originalTechnique }: SaveTechniqueMapEntryArgs) => {
      const row = {
        promo_technique: values.promoTechnique.trim(),
        fg_technique_id: values.fgTechniqueId.trim(),
      };

      const query = originalTechnique
        ? supabase
            .from("integration_technique_map")
            .update(row)
            .eq("promo_technique", originalTechnique)
        : supabase.from("integration_technique_map").insert(row);

      // O select de retorno distingue "salvou" de "a policy barrou em silencio":
      // UPDATE/DELETE bloqueado por RLS nao gera erro, so zero linhas.
      const { data, error } = await query.select("promo_technique");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("ERR_SEM_PERMISSAO");
      return data[0].promo_technique as string;
    },
    onSuccess: (promoTechnique, { originalTechnique }) => {
      queryClient.invalidateQueries({ queryKey: ["integration-technique-map"] });
      queryClient.invalidateQueries({ queryKey: ["integration-queue"] });
      toast({
        title: originalTechnique ? "Mapeamento atualizado" : "Mapeamento criado",
        description: `A tecnica "${promoTechnique}" agora gera job no Fast Gravacoes. Reprocese os eventos presos para reenviar.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao salvar o mapeamento",
        description: techniqueMapErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Exclui um mapeamento: a tecnica volta a nao gerar job no Fast Gravacoes (o
 * evento vira "Tecnica nao mapeada" na fila ate ser mapeada de novo).
 */
export function useDeleteTechniqueMapEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (promoTechnique: string) => {
      const { data, error } = await supabase
        .from("integration_technique_map")
        .delete()
        .eq("promo_technique", promoTechnique)
        .select("promo_technique");

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("ERR_SEM_PERMISSAO");
      return promoTechnique;
    },
    onSuccess: (promoTechnique) => {
      queryClient.invalidateQueries({ queryKey: ["integration-technique-map"] });
      queryClient.invalidateQueries({ queryKey: ["integration-queue"] });
      toast({
        title: "Mapeamento removido",
        description: `A tecnica "${promoTechnique}" nao gera mais job no Fast Gravacoes.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao excluir o mapeamento",
        description: techniqueMapErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
