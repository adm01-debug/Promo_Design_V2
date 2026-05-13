import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { Asset } from "../hooks/use-assets";

export function useAssetTags(asset: Asset | null, assets: Asset[] | undefined, updateAsset: any) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [tagError, setTagError] = useState<string | null>(null);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (asset) {
      setEditingTags(false);
      setTagsDraft(asset.tags ?? []);
      setTagError(null);
    }
  }, [asset]);

  const tagSuggestions = useMemo(() => {
    const set = new Set<string>();
    (assets ?? []).forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [assets]);

  const handleSaveTags = async () => {
    if (!asset || tagError) return;
    setSavingTags(true);
    try {
      await updateAsset.mutateAsync({ id: asset.id, patch: { tags: tagsDraft } });
      toast.success("Tags atualizadas");
      setEditingTags(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar tags");
    } finally {
      setSavingTags(false);
    }
  };

  return {
    editingTags,
    setEditingTags,
    tagsDraft,
    setTagsDraft,
    tagError,
    setTagError,
    savingTags,
    tagSuggestions,
    handleSaveTags
  };
}
