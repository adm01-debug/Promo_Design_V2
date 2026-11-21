import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizations } from "@/hooks/use-organization";

import type { Json, Tables } from "@/integrations/supabase/types";

export interface MockupDraft {
  id: string;
  name: string;
  productName: string | null;
  productSku: string | null;
  thumbnailUrl: string | null;
  editorState: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

/** Flag persisted inside editor_state.meta — avoids a DDL migration on mockup_drafts. */
export function isDraftTemplate(editorState: Record<string, unknown> | null): boolean {
  const meta = editorState?.meta as Record<string, unknown> | undefined;
  return meta?.isTemplate === true;
}

function rowToDraft(row: Tables<"mockup_drafts">): MockupDraft {
  const editorState = row.editor_state as Record<string, unknown> | null;
  return {
    id: row.id,
    name: row.name,
    productName: row.product_name,
    productSku: row.product_sku,
    thumbnailUrl: row.thumbnail_url,
    editorState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isTemplate: isDraftTemplate(editorState),
  };
}

export function useMockupDrafts() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganizations();
  const qc = useQueryClient();
  const key = ["mockup-drafts", user?.id, currentOrgId];

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
      isTemplate?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const mergedState: Record<string, unknown> | null =
        draft.isTemplate !== undefined
          ? {
              ...(draft.editorState ?? {}),
              meta: {
                ...((draft.editorState?.meta as Record<string, unknown> | undefined) ?? {}),
                isTemplate: draft.isTemplate,
              },
            }
          : (draft.editorState ?? null);

      if (draft.id) {
        const { data, error } = await supabase
          .from("mockup_drafts")
          .update({
            name: draft.name,
            product_name: draft.productName ?? null,
            product_sku: draft.productSku ?? null,
            thumbnail_url: draft.thumbnailUrl ?? null,
            editor_state: mergedState as Json,
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
          organization_id: currentOrgId,
          name: draft.name,
          product_name: draft.productName ?? null,
          product_sku: draft.productSku ?? null,
          thumbnail_url: draft.thumbnailUrl ?? null,
          editor_state: mergedState as Json,
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

  const setTemplateMutation = useMutation({
    mutationFn: async ({ id, isTemplate }: { id: string; isTemplate: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      // Le o estado atual no banco para preservar o editor_state (nao usar cache stale).
      const { data: current, error: fetchError } = await supabase
        .from("mockup_drafts")
        .select("editor_state")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;
      const editorState = (current?.editor_state as Record<string, unknown> | null) ?? {};
      const { data, error } = await supabase
        .from("mockup_drafts")
        .update({
          editor_state: {
            ...editorState,
            meta: {
              ...((editorState.meta as Record<string, unknown>) ?? {}),
              isTemplate,
            },
          } as Json,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return rowToDraft(data);
    },
    onSuccess: invalidate,
  });

  const saveDraft = useCallback(
    (draft: Parameters<typeof saveMutation.mutateAsync>[0]) => saveMutation.mutateAsync(draft),
    [saveMutation],
  );

  const deleteDraft = useCallback((id: string) => deleteMutation.mutateAsync(id), [deleteMutation]);

  const setTemplate = useCallback(
    (id: string, isTemplate: boolean) => setTemplateMutation.mutateAsync({ id, isTemplate }),
    [setTemplateMutation],
  );

  const getDraft = useCallback((id: string) => drafts.find((d) => d.id === id) ?? null, [drafts]);

  return {
    drafts,
    isLoading,
    saveDraft,
    deleteDraft,
    setTemplate,
    getDraft,
    isSaving: saveMutation.isPending,
    isSettingTemplate: setTemplateMutation.isPending,
  };
}
