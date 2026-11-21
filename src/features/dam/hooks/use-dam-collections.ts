import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizations } from "@/hooks/use-organization";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type DamCollection = Tables<"dam_collections">;
export type DamCollectionAsset = Tables<"dam_collection_assets">;

export interface DamCollectionWithCount extends DamCollection {
  assetCount: number;
}

const COLLECTION_LIMIT = 500;

export function useDamCollections() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganizations();
  const qc = useQueryClient();

  const enabled = Boolean(user && currentOrgId);
  const baseKey = ["dam-collections", user?.id, currentOrgId] as const;

  const list = useQuery({
    queryKey: baseKey,
    enabled,
    queryFn: async (): Promise<DamCollectionWithCount[]> => {
      if (!currentOrgId) return [];
      const { data, error } = await supabase
        .from("dam_collections")
        .select("*")
        .eq("organization_id", currentOrgId)
        .order("is_system", { ascending: false })
        .order("name", { ascending: true })
        .limit(COLLECTION_LIMIT);
      if (error) throw error;

      const rows = data ?? [];
      const withCounts = await Promise.all(
        rows.map(async (row) => {
          const { data: count, error: countError } = await supabase.rpc("count_collection_assets", {
            _collection_id: row.id,
          });
          if (countError) throw countError;
          return { ...row, assetCount: count ?? 0 };
        }),
      );
      return withCounts;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: baseKey });
    qc.invalidateQueries({ queryKey: ["dam-collection-assets"] });
  };

  const assetsKey = (collectionId: string) =>
    ["dam-collection-assets", user?.id, collectionId] as const;

  function useCollectionAssets(collectionId: string | null) {
    return useQuery({
      queryKey: assetsKey(collectionId ?? ""),
      enabled: Boolean(collectionId && user),
      queryFn: async (): Promise<DamCollectionAsset[]> => {
        if (!collectionId) return [];
        const { data, error } = await supabase
          .from("dam_collection_assets")
          .select("*")
          .eq("collection_id", collectionId)
          .order("created_at", { ascending: false })
          .limit(COLLECTION_LIMIT);
        if (error) throw error;
        return data ?? [];
      },
    });
  }

  const create = useMutation({
    mutationFn: async (input: {
      name: string;
      parent_id?: string | null;
      description?: string | null;
    }) => {
      if (!user || !currentOrgId) throw new Error("Sessão ou organização ausente");
      const name = input.name.trim();
      if (!name) throw new Error("Informe um nome para a coleção");
      const { data, error } = await supabase
        .from("dam_collections")
        .insert({
          organization_id: currentOrgId,
          name,
          parent_id: input.parent_id ?? null,
          description: input.description ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coleção criada");
    },
  });

  const rename = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const name = input.name.trim();
      if (!name) throw new Error("Informe um nome para a coleção");
      const { error } = await supabase.from("dam_collections").update({ name }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coleção renomeada");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dam_collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coleção excluída");
    },
  });

  const addAsset = useMutation({
    mutationFn: async (input: { collection_id: string; asset_id: string }) => {
      if (!user) throw new Error("Sessão ausente");
      const { error } = await supabase.from("dam_collection_assets").insert({
        collection_id: input.collection_id,
        asset_id: input.asset_id,
        added_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const removeAsset = useMutation({
    mutationFn: async (input: { collection_id: string; asset_id: string }) => {
      const { error } = await supabase
        .from("dam_collection_assets")
        .delete()
        .eq("collection_id", input.collection_id)
        .eq("asset_id", input.asset_id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  return {
    items: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    useCollectionAssets,
    create,
    rename,
    remove,
    addAsset,
    removeAsset,
  };
}
