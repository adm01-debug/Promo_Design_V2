import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RequeueOsWebhookResult {
  ok: boolean;
  event_id: string;
  status: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  ERR_EVENT_NOT_FOUND: "Este evento nao existe mais na fila.",
  ERR_NOT_MEMBER: "Voce nao tem acesso a esta ordem de servico.",
  ERR_ALREADY_DELIVERED: "Este evento ja foi entregue ao ERP.",
};

/**
 * Devolve um evento preso da fila para o proximo ciclo do dispatcher
 * (status pending, tentativas zeradas). A RPC requeue_os_webhook valida
 * a permissao no banco.
 */
export function useRequeueOsWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventId: string): Promise<RequeueOsWebhookResult> => {
      const { data, error } = await supabase.rpc("requeue_os_webhook", {
        _event_id: eventId,
      });

      if (error) throw error;
      return data as RequeueOsWebhookResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["os-webhook-queue"] });
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
