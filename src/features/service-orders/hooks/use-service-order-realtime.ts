import { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";
import { STATUS_CONFIG, type OsStatus } from "./use-service-orders";

const POLL_INTERVAL = 10_000; // 10 seconds

/**
 * Polls for service_orders changes with visibility-aware rate limiting.
 * Pauses when the tab is hidden and slows down when blurred,
 * avoiding unnecessary DB load during long idle sessions.
 */
export function useServiceOrderRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastCheckRef = useRef<string>(new Date().toISOString());

  const poll = useCallback(async () => {
    if (!user) return;

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
  }, [user, queryClient, toast]);

  useVisibilityPolling(poll, POLL_INTERVAL, !!user, "Service Orders");
}
