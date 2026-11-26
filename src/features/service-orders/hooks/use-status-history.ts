import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatusHistoryEntry {
  id: string;
  service_order_id: string;
  user_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

/**
 * Linha do tempo de status de uma OS. A tabela status_audit_log e alimentada
 * pela trigger log_status_change (AFTER INSERT OR UPDATE em service_orders) e
 * nunca teve tela. A policy de SELECT libera membros da organizacao da OS.
 */
export function useStatusHistory(serviceOrderId: string | null | undefined) {
  return useQuery({
    queryKey: ["status-history", serviceOrderId],
    enabled: Boolean(serviceOrderId),
    queryFn: async (): Promise<StatusHistoryEntry[]> => {
      const { data, error } = await supabase
        .from("status_audit_log")
        .select("id, service_order_id, user_id, old_status, new_status, changed_at")
        .eq("service_order_id", serviceOrderId as string)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StatusHistoryEntry[];
    },
  });
}
