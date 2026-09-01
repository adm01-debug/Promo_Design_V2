import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
const PAGE_SIZE = 20;

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listKey = ["notifications", user?.id];
  const unreadKey = ["notifications-unread", user?.id];

  /**
   * Keyset-paginated notifications list.
   * Each page is fetched with `created_at < lastSeenCreatedAt` (or no cursor for
   * the first page). This avoids OFFSET scans on large inboxes and keeps each
   * request O(PAGE_SIZE) regardless of total count.
   */
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: listKey,
    enabled: !!user,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!user) return [] as Notification[];
      let q = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);
      if (pageParam) {
        q = q.lt("created_at", pageParam);
      }
      const { data: rows, error } = await q;
      if (error) throw error;
      return ((rows as unknown as NotificationRow[]) ?? []).map(rowToNotification);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].createdAt;
    },
    refetchInterval: false,
  });

  const notifications = useMemo<Notification[]>(
    () => data?.pages.flat() ?? [],
    [data],
  );

  /**
   * The unread badge must reflect the **global** unread count, not just what's
   * been paginated in. A separate, lightweight HEAD count query handles this.
   */
  const { data: unreadCount = 0 } = useQuery({
    queryKey: unreadKey,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: false,
  });

  // Visibility-aware polling: refresh both the list (first page) and the badge.
  useVisibilityPolling(
    () => {
      qc.invalidateQueries({ queryKey: listKey, refetchType: "active" });
      qc.invalidateQueries({ queryKey: unreadKey });
    },
    POLL_INTERVAL,
    !!user,
    "Notificações",
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

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

  return {
    notifications,
    unreadCount,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
    markRead,
    markAllRead,
    clearAll,
  };
}
