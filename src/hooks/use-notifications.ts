import { useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export interface Notification {
  id: string;
  osId: string | null;
  osNumber: string;
  productName: string;
  oldStatus: string | null;
  newStatus: string;
  eventType: string;
  read: boolean;
  createdAt: string;
}

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    osId: row.os_id,
    osNumber: row.os_number,
    productName: row.product_name,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    eventType: row.event_type,
    read: row.read,
    createdAt: row.created_at,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["notifications", user?.id];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(rowToNotification);
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => invalidate()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications" as any)
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications" as any)
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications" as any)
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markRead = useCallback((id: string) => markReadMutation.mutate(id), [markReadMutation]);
  const markAllRead = useCallback(() => markAllReadMutation.mutate(), [markAllReadMutation]);
  const clearAll = useCallback(() => clearAllMutation.mutate(), [clearAllMutation]);

  return { notifications, unreadCount, isLoading, markRead, markAllRead, clearAll };
}
