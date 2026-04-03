import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { STATUS_CONFIG, type OsStatus } from "./use-service-orders";

/**
 * Subscribes to realtime changes on service_orders and shows
 * toast notifications when an order's status changes.
 * Also invalidates the query cache so the UI stays in sync.
 */
export function useServiceOrderRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("service-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldStatus = (payload.old as any)?.status as OsStatus | undefined;
          const newStatus = (payload.new as any)?.status as OsStatus | undefined;
          const osNumber = (payload.new as any)?.os_number ?? "";
          const productName = (payload.new as any)?.product_name ?? "";

          if (oldStatus && newStatus && oldStatus !== newStatus) {
            const statusLabel = STATUS_CONFIG[newStatus]?.label ?? newStatus;
            toast({
              title: `OS ${osNumber} atualizada`,
              description: `${productName} → ${statusLabel}`,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const osNumber = (payload.new as any)?.os_number ?? "";
          toast({
            title: "Nova OS criada",
            description: `OS ${osNumber} adicionada`,
          });
          queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "service_orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);
}
