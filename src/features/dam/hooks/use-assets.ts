import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Json } from "@/integrations/supabase/types";

export type AssetType = "logo" | "art" | "photo" | "mockup" | "document" | "other";

export interface Asset {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  asset_type: AssetType;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  dominant_colors: string[];
  thumbnail_path: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  version: number;
  parent_asset_id: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  ocr_text?: string | null;
  ocr_status?: string;
  /** Populated only by search_assets_ranked RPC when match came from OCR text. */
  ocr_match?: boolean;
}

export interface AssetFilters {
  clientId?: string | null;
  assetType?: AssetType | "all";
  assetTypes?: AssetType[];
  tags?: string[];
  tagsMode?: "all" | "any";
  search?: string;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  sortBy?: "created_at" | "updated_at" | "name" | "file_size" | "version" | "relevance";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  /** Minimum file size in bytes (inclusive). */
  minSize?: number | null;
  /** Maximum file size in bytes (inclusive). */
  maxSize?: number | null;
  /** Filter to assets updated at or after this ISO timestamp. */
  updatedAfter?: string | null;
}

export interface AssetInsert {
  organization_id: string;
  client_id?: string | null;
  name: string;
  description?: string | null;
  asset_type: AssetType;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  dominant_colors?: string[];
  thumbnail_path?: string | null;
  tags?: string[];
  metadata?: Json;
  parent_asset_id?: string | null;
  version?: number;
}

export const MIN_SEARCH_LENGTH = 3;

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%,()]/g, " ").trim();
}

export function useAssets(organizationId: string | null, filters: AssetFilters = {}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["assets", organizationId, filters],
    enabled: !!organizationId,
    // Cache tuning: keep previous results visible while a new query (e.g. typing) is in
    // flight to avoid layout flash; treat data as fresh for 30s and keep in memory 5min.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const sortBy = filters.sortBy ?? "created_at";
      const sortDir = filters.sortDir ?? "desc";
      const hasPagination = typeof filters.pageSize === "number" && filters.pageSize > 0;
      const page = Math.max(1, filters.page ?? 1);
      const pageSize = filters.pageSize ?? 0;
      const searchTerm = filters.search?.trim() ?? "";
      const effectiveSearch = searchTerm.length >= MIN_SEARCH_LENGTH ? sanitizeSearchTerm(searchTerm) : "";
      const useRelevance = sortBy === "relevance" && effectiveSearch.length > 0;

      if (useRelevance) {
        const limit = hasPagination ? pageSize : 1000;
        const offset = hasPagination ? (page - 1) * pageSize : 0;
        const rpcArgs: Record<string, unknown> = {
          _org_id: organizationId!,
          _query: effectiveSearch,
          _tags_mode: filters.tagsMode ?? "all",
          _include_archived: filters.archivedOnly ? true : (filters.includeArchived ?? false),
          _limit: limit,
          _offset: offset,
        };
        if (filters.clientId) rpcArgs._client_id = filters.clientId;
        const types =
          filters.assetTypes && filters.assetTypes.length > 0
            ? filters.assetTypes
            : filters.assetType && filters.assetType !== "all"
              ? [filters.assetType]
              : null;
        if (types) rpcArgs._asset_types = types;
        if (filters.tags && filters.tags.length > 0) rpcArgs._tags = filters.tags;
        if (typeof filters.minSize === "number") rpcArgs._min_size = filters.minSize;
        if (typeof filters.maxSize === "number") rpcArgs._max_size = filters.maxSize;
        const { data, error } = await supabase.rpc("search_assets_ranked", rpcArgs as never);
        if (error) throw error;
        const rows = (data ?? []) as unknown as (Asset & { total_count: number; rank: number })[];
        const filteredRows = filters.archivedOnly
          ? rows.filter((r) => r.is_archived)
          : rows;
        return {
          rows: filteredRows as unknown as Asset[],
          total: filters.archivedOnly ? filteredRows.length : (rows[0]?.total_count ?? 0),
        };
      }

      let q = supabase
        .from("assets")
        .select("*", hasPagination ? { count: "exact" } : {})
        .eq("organization_id", organizationId!)
        .order(sortBy === "relevance" ? "created_at" : sortBy, { ascending: sortDir === "asc" });
      if (filters.archivedOnly) {
        q = q.eq("is_archived", true);
      } else if (!filters.includeArchived) {
        q = q.eq("is_archived", false);
      }
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.assetTypes && filters.assetTypes.length > 0) {
        q = q.in("asset_type", filters.assetTypes);
      } else if (filters.assetType && filters.assetType !== "all") {
        q = q.eq("asset_type", filters.assetType);
      }
      if (filters.tags && filters.tags.length > 0) {
        if ((filters.tagsMode ?? "all") === "any") {
          q = q.overlaps("tags", filters.tags);
        } else {
          q = q.contains("tags", filters.tags);
        }
      }
      if (effectiveSearch) {
        q = q.or(`name.ilike.%${effectiveSearch}%,description.ilike.%${effectiveSearch}%`);
      }
      if (typeof filters.minSize === "number") q = q.gte("file_size", filters.minSize);
      if (typeof filters.maxSize === "number") q = q.lte("file_size", filters.maxSize);
      if (filters.updatedAfter) q = q.gte("updated_at", filters.updatedAfter);
      if (hasPagination) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        q = q.range(from, to);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return {
        rows: (data ?? []) as unknown as Asset[],
        total: count ?? (data?.length ?? 0),
      };
    },
  });

  const create = useMutation({
    mutationFn: async (input: AssetInsert) => {
      const { data, error } = await supabase
        .from("assets")
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Asset;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", organizationId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AssetInsert> & { is_archived?: boolean } }) => {
      const { error } = await supabase.from("assets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", organizationId] }),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assets").update({ is_archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", organizationId] }),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assets").update({ is_archived: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", organizationId] }),
  });

  const remove = useMutation({
    mutationFn: async (asset: Asset) => {
      const paths = [asset.file_path];
      if (asset.thumbnail_path) paths.push(asset.thumbnail_path);
      await supabase.storage.from("assets").remove(paths);
      const { error } = await supabase.from("assets").delete().eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", organizationId] }),
  });

  return {
    assets: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 0,
    totalPages: filters.pageSize ? Math.max(1, Math.ceil((query.data?.total ?? 0) / filters.pageSize)) : 1,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    create,
    update,
    archive,
    restore,
    remove,
  };
}

export async function getAssetSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("assets").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Returns all versions of an asset chain (root + descendants) ordered by version DESC.
 * The "root" is the original asset (parent_asset_id IS NULL); all later versions point to it.
 */
export function useAssetVersions(asset: Asset | null) {
  const rootId = asset ? (asset.parent_asset_id ?? asset.id) : null;
  return useQuery({
    queryKey: ["asset-versions", rootId],
    enabled: !!rootId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .or(`id.eq.${rootId},parent_asset_id.eq.${rootId}`)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Asset[];
    },
  });
}

/**
 * Resolves the latest version available in the version chain of a given asset.
 * Returns { current, latest, hasUpdate } where hasUpdate is true when latest.id !== assetId.
 */
export function useLatestAssetVersion(assetId: string | null) {
  return useQuery({
    queryKey: ["asset-latest", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data: current, error: e1 } = await supabase
        .from("assets")
        .select("*")
        .eq("id", assetId!)
        .maybeSingle();
      if (e1) throw e1;
      if (!current) return { current: null, latest: null, hasUpdate: false };
      const rootId = (current as unknown as Asset).parent_asset_id ?? (current as unknown as Asset).id;
      const { data: chain, error: e2 } = await supabase
        .from("assets")
        .select("*")
        .or(`id.eq.${rootId},parent_asset_id.eq.${rootId}`)
        .order("version", { ascending: false })
        .limit(1);
      if (e2) throw e2;
      const latest = ((chain ?? [])[0] ?? current) as unknown as Asset;
      return {
        current: current as unknown as Asset,
        latest,
        hasUpdate: latest.id !== assetId,
      };
    },
  });
}