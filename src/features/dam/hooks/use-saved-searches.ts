import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Saved filters schema versioning
 * ------------------------------------------------------------------
 * Bump SAVED_FILTERS_VERSION whenever the canonical shape changes,
 * then add a migrator entry in `MIGRATIONS` that takes the previous
 * version's payload and returns the next one. Migrations run
 * sequentially on load so old rows / imported JSON snapshots remain
 * compatible without touching the database.
 *
 * Example for a future v2 that renames `assetTypes` -> `types`:
 *   MIGRATIONS[1] = (v1) => ({ ...v1, types: v1.assetTypes, _v: 2 });
 */
export const SAVED_FILTERS_VERSION = 1;

// v1 — current canonical shape
const savedFiltersV1Schema = z.object({
  _v: z.literal(1).optional().default(1),
  search: z.string().default(""),
  assetTypes: z.array(z.enum(["logo", "art", "photo", "mockup", "document", "other"])).default([]),
  clientId: z.string().default("all"),
  tags: z.array(z.string()).default([]),
  tagsMode: z.enum(["all", "any"]).default("all"),
  includeArchived: z.boolean().default(false),
  sort: z.string().default("created_desc"),
});

// Latest canonical schema (always equals the current SAVED_FILTERS_VERSION shape)
export const savedFiltersSchema = savedFiltersV1Schema;
export type SavedFiltersPayload = z.infer<typeof savedFiltersSchema>;

/**
 * Migration table: index N transforms a vN payload into a v(N+1) payload.
 * Always set `_v` to the new version inside the migrator.
 */
const MIGRATIONS: Array<(input: Record<string, unknown>) => Record<string, unknown>> = [
  // index 0 would migrate v0 -> v1. Currently no v0 exists.
];

/**
 * Normalize raw stored/imported JSON into the latest canonical payload,
 * running any pending migrations in order. Unknown / missing fields
 * fall back to schema defaults so corrupt snapshots never crash the UI.
 */
export function migrateSavedFilters(raw: unknown): SavedFiltersPayload {
  const obj: Record<string, unknown> =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  let version = typeof obj._v === "number" ? obj._v : 1;
  let current = obj;
  while (version < SAVED_FILTERS_VERSION) {
    const migrator = MIGRATIONS[version - 1];
    if (!migrator) {
      // No migrator: bump version and let zod defaults fill missing fields.
      current = { ...current, _v: version + 1 };
    } else {
      current = migrator(current);
    }
    version += 1;
  }
  // Future-proof: payload from a newer client — strip _v so we re-stamp it.
  if (version > SAVED_FILTERS_VERSION) {
    current = { ...current, _v: SAVED_FILTERS_VERSION };
  }
  return savedFiltersSchema.parse(current);
}

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
        filters: migrateSavedFilters(row.filters ?? {}),
      })) as SavedSearch[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; filters: SavedFiltersPayload; is_pinned?: boolean }) => {
      if (!orgId || !userId) throw new Error("Organização ou usuário ausente");
      const parsed = migrateSavedFilters({ ...input.filters, _v: SAVED_FILTERS_VERSION });
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
        payload.filters = migrateSavedFilters({ ...input.patch.filters, _v: SAVED_FILTERS_VERSION });
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