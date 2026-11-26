import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RequeueIntegrationEventResult {
  ok: boolean;
  event_id: string;
  status: string;
  destination: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  ERR_EVENT_NOT_FOUND: "Este evento nao existe mais na fila.",
  ERR_NOT_MEMBER: "Voce nao tem acesso a este registro.",
  ERR_ALREADY_DELIVERED: "Este evento ja foi entregue ao sistema de destino.",
};

/**
 * Devolve um evento preso da fila multi-destino para o proximo ciclo do
 * integration-dispatcher (status pending, tentativas zeradas). A RPC
 * requeue_integration_event valida a permissao no banco.
 */
export function useRequeueIntegrationEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string): Promise<RequeueIntegrationEventResult> => {
      const { data, error } = await supabase.rpc("requeue_integration_event", {
        _event_id: eventId,
      });

      if (error) throw error;
      return data as unknown as RequeueIntegrationEventResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration-queue"] });
      toast({
        title: "Evento reprocessado",
        description: "O evento voltou para a fila e sera enviado no proximo ciclo.",
      });
    },
    onError: (error: Error) => {
      const known = Object.entries(ERROR_MESSAGES).find(([code]) => error.message.includes(code));
      toast({
        title: "Falha ao reprocessar",
        description: known?.[1] ?? "Nao foi possivel reprocessar o evento.",
        variant: "destructive",
      });
    },
  });
}
