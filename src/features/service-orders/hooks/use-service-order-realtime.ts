import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { STATUS_CONFIG, type OsStatus } from "./use-service-orders";

const POLL_INTERVAL = 10_000; // 10 seconds

/**
 * Polls for service_orders changes and shows toast notifications
 * when an order's status changes. Uses polling instead of Realtime
 * to avoid PII broadcast over Realtime channels.
 */
export function useServiceOrderRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastCheckRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const since = lastCheckRef.current;
      lastCheckRef.current = new Date().toISOString();

      const { data } = await supabase
        .from("service_orders")
        .select("os_number, product_name, status, updated_at")
        .eq("user_id", user.id)
        .gt("updated_at", since);

      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["service-orders"] });

        for (const row of data) {
          const statusLabel =
            STATUS_CONFIG[row.status as OsStatus]?.label ?? row.status;
          toast({
            title: `OS ${row.os_number} atualizada`,
            description: `${row.product_name} → ${statusLabel}`,
          });
        }
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [user, queryClient, toast]);
}
