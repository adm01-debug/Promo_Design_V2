import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const SAVED_FILTERS_VERSION = 1;

export const savedFiltersSchema = z.object({
  _v: z.literal(SAVED_FILTERS_VERSION).optional().default(SAVED_FILTERS_VERSION),
  search: z.string().default(""),
  assetTypes: z.array(z.enum(["logo", "art", "photo", "mockup", "document", "other"])).default([]),
  clientId: z.string().default("all"),
  tags: z.array(z.string()).default([]),
  tagsMode: z.enum(["all", "any"]).default("all"),
  includeArchived: z.boolean().default(false),
  sort: z.string().default("created_desc"),
});

export type SavedFiltersPayload = z.infer<typeof savedFiltersSchema>;

export interface SavedSearch {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  filters: SavedFiltersPayload;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const SAVED_SEARCH_LIMIT = 50;
export const PINNED_LIMIT = 5;

export function useSavedSearches(orgId: string | null, userId: string | null) {
  const qc = useQueryClient();
  const enabled = Boolean(orgId && userId);
  const queryKey = ["dam-saved-searches", orgId, userId] as const;

  const list = useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<SavedSearch[]> => {
      const { data, error } = await supabase
        .from("dam_saved_searches")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("user_id", userId!)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        filters: savedFiltersSchema.parse(row.filters ?? {}),
      })) as SavedSearch[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; filters: SavedFiltersPayload; is_pinned?: boolean }) => {
      if (!orgId || !userId) throw new Error("Organização ou usuário ausente");
      const parsed = savedFiltersSchema.parse({ ...input.filters, _v: SAVED_FILTERS_VERSION });
      const { data, error } = await supabase
        .from("dam_saved_searches")
        .insert({
          organization_id: orgId,
          user_id: userId,
          name: input.name.trim(),
          filters: parsed,
          is_pinned: input.is_pinned ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Pick<SavedSearch, "name" | "is_pinned" | "filters">> }) => {
      const payload: Record<string, unknown> = {};
      if (input.patch.name !== undefined) payload.name = input.patch.name.trim();
      if (input.patch.is_pinned !== undefined) payload.is_pinned = input.patch.is_pinned;
      if (input.patch.filters !== undefined) {
        payload.filters = savedFiltersSchema.parse({ ...input.patch.filters, _v: SAVED_FILTERS_VERSION });
      }
      const { error } = await supabase
        .from("dam_saved_searches")
        .update(payload)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dam_saved_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    items: list.data ?? [],
    isLoading: list.isLoading,
    create,
    update,
    remove,
  };
}