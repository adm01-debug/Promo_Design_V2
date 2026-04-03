import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Json } from "@/integrations/supabase/types";

export interface MockupDraft {
  id: string;
  name: string;
  productName: string | null;
  productSku: string | null;
  thumbnailUrl: string | null;
  editorState: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

function rowToDraft(row: any): MockupDraft {
  return {
    id: row.id,
    name: row.name,
    productName: row.product_name,
    productSku: row.product_sku,
    thumbnailUrl: row.thumbnail_url,
    editorState: row.editor_state as Record<string, unknown> | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useMockupDrafts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["mockup-drafts", user?.id];

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("mockup_drafts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToDraft);
    },
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["mockup-drafts"] });

  const saveMutation = useMutation({
    mutationFn: async (draft: {
      id?: string;
      name: string;
      productName?: string | null;
      productSku?: string | null;
      thumbnailUrl?: string | null;
      editorState?: Record<string, unknown> | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      if (draft.id) {
        const { data, error } = await supabase
          .from("mockup_drafts")
          .update({
            name: draft.name,
            product_name: draft.productName ?? null,
            product_sku: draft.productSku ?? null,
            thumbnail_url: draft.thumbnailUrl ?? null,
            editor_state: (draft.editorState ?? null) as Json,
          })
          .eq("id", draft.id)
          .select()
          .single();
        if (error) throw error;
        return rowToDraft(data);
      }

      const { data, error } = await supabase
        .from("mockup_drafts")
        .insert({
          user_id: user.id,
          name: draft.name,
          product_name: draft.productName ?? null,
          product_sku: draft.productSku ?? null,
          thumbnail_url: draft.thumbnailUrl ?? null,
          editor_state: (draft.editorState ?? null) as Json,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToDraft(data);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mockup_drafts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const saveDraft = useCallback(
    (draft: Parameters<typeof saveMutation.mutateAsync>[0]) => saveMutation.mutateAsync(draft),
    [saveMutation]
  );

  const deleteDraft = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  const getDraft = useCallback(
    (id: string) => drafts.find((d) => d.id === id) ?? null,
    [drafts]
  );

  return { drafts, isLoading, saveDraft, deleteDraft, getDraft, isSaving: saveMutation.isPending };
}
