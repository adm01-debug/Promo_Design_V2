import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useVisibilityPolling } from "./use-visibility-polling";

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

interface NotificationRow {
  id: string;
  os_id: string | null;
  os_number: string;
  product_name: string;
  old_status: string | null;
  new_status: string;
  event_type: string;
  read: boolean;
  created_at: string;
  user_id: string;
}

function rowToNotification(row: NotificationRow): Notification {
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

const POLL_INTERVAL = 15_000; // 15 seconds

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
      return ((data as unknown as NotificationRow[]) ?? []).map(rowToNotification);
    },
    enabled: !!user,
    // Disable react-query's built-in refetchInterval — we manage it via useVisibilityPolling
    refetchInterval: false,
  });

  // Visibility-aware polling: pauses when tab hidden, slows when blurred
  useVisibilityPolling(
    () => qc.invalidateQueries({ queryKey: key }),
    POLL_INTERVAL,
    !!user,
    "Notificações",
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as never)
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
        .from("notifications")
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
