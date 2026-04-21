import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
}

export interface AssetFilters {
  clientId?: string | null;
  assetType?: AssetType | "all";
  tags?: string[];
  search?: string;
  includeArchived?: boolean;
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
  metadata?: Record<string, unknown>;
  parent_asset_id?: string | null;
  version?: number;
}

export function useAssets(organizationId: string | null, filters: AssetFilters = {}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["assets", organizationId, filters],
    enabled: !!organizationId,
    queryFn: async () => {
      let q = supabase
        .from("assets")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (!filters.includeArchived) q = q.eq("is_archived", false);
      if (filters.clientId) q = q.eq("client_id", filters.clientId);
      if (filters.assetType && filters.assetType !== "all") q = q.eq("asset_type", filters.assetType);
      if (filters.tags && filters.tags.length > 0) q = q.contains("tags", filters.tags);
      if (filters.search) q = q.ilike("name", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Asset[];
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
    assets: query.data ?? [],
    isLoading: query.isLoading,
    create,
    update,
    archive,
    remove,
  };
}

export async function getAssetSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("assets").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}