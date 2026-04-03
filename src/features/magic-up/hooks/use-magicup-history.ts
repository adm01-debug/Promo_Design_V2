import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

export interface MagicUpHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  favorite: boolean;
  productName?: string;
  productSku?: string;
  style?: string;
  createdAt: string;
}

function rowToItem(row: any): MagicUpHistoryItem {
  return {
    id: row.id,
    prompt: row.prompt,
    imageUrl: row.image_url,
    favorite: row.favorite,
    productName: row.product_name ?? undefined,
    productSku: row.product_sku ?? undefined,
    style: row.style ?? undefined,
    createdAt: row.created_at,
  };
}

export function useMagicUpHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["magicup-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("magicup_history")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToItem);
    },
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["magicup-history"] });

  const addMutation = useMutation({
    mutationFn: async (entry: Omit<MagicUpHistoryItem, "id" | "createdAt" | "favorite">) => {
      const { error } = await supabase.from("magicup_history").insert({
        user_id: user!.id,
        prompt: entry.prompt,
        image_url: entry.imageUrl,
        product_name: entry.productName || null,
        product_sku: entry.productSku || null,
        style: entry.style || null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleFavMutation = useMutation({
    mutationFn: async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const { error } = await supabase
        .from("magicup_history")
        .update({ favorite: !item.favorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("magicup_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addGeneration = useCallback(
    (entry: Omit<MagicUpHistoryItem, "id" | "createdAt" | "favorite">) => {
      addMutation.mutate(entry);
    },
    [addMutation]
  );

  const toggleFavorite = useCallback(
    (id: string) => { toggleFavMutation.mutate(id); },
    [toggleFavMutation]
  );

  const deleteItem = useCallback(
    (id: string) => { deleteMutation.mutate(id); },
    [deleteMutation]
  );

  return { items, addGeneration, toggleFavorite, deleteItem };
}
