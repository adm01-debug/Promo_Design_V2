import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AssetThumbnail } from "./AssetThumbnail";
import { Badge } from "@/components/ui/badge";
import type { Asset } from "../hooks/use-assets";
import { useAssetFavorites } from "../hooks/use-asset-favorites";

interface Props {
  asset: Asset;
  organizationId: string | null;
  onSelect: (asset: Asset) => void;
}

const MAX_ITEMS = 6;

export function RelatedFavorites({ asset, organizationId, onSelect }: Props) {
  const { favorites, isFavorite } = useAssetFavorites(organizationId);
  const [candidates, setCandidates] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  const favoriteIds = useMemo(
    () => Array.from(favorites).filter((id) => id !== asset.id),
    [favorites, asset.id],
  );

  useEffect(() => {
    let cancelled = false;
    if (!organizationId || favoriteIds.length === 0) {
      setCandidates([]);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_archived", false)
        .in("id", favoriteIds);
      if (cancelled) return;
      if (error) {
        setCandidates([]);
      } else {
        setCandidates((data ?? []) as Asset[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, favoriteIds]);

  const related = useMemo(() => {
    const tagSet = new Set((asset.tags ?? []).map((t) => t.toLowerCase()));
    const scored = candidates
      .filter((c) => isFavorite(c.id))
      .map((c) => {
        const cTags = (c.tags ?? []).map((t) => t.toLowerCase());
        const sharedTags = cTags.filter((t) => tagSet.has(t)).length;
        const sameType = c.asset_type === asset.asset_type ? 1 : 0;
        const score = sharedTags * 2 + sameType;
        return { asset: c, score, sharedTags, sameType };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ITEMS);
    return scored;
  }, [candidates, asset, isFavorite]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Star className="w-4 h-4 fill-primary text-primary" />
          Favoritos relacionados
        </div>
        <div className="text-xs text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (related.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Star className="w-4 h-4 fill-primary text-primary" />
        Favoritos relacionados
        <Badge variant="secondary" className="text-[10px]">{related.length}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {related.map(({ asset: a, sharedTags, sameType }) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            className="group text-left rounded-md border border-border overflow-hidden hover:border-primary/60 hover:bg-accent/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={a.name}
          >
            <div className="aspect-square bg-muted">
              <AssetThumbnail asset={a} className="w-full h-full object-cover" />
            </div>
            <div className="p-1.5 space-y-0.5">
              <div className="text-[11px] truncate font-medium">{a.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {sharedTags > 0
                  ? `${sharedTags} tag${sharedTags > 1 ? "s" : ""} em comum`
                  : sameType
                    ? "Mesmo tipo"
                    : ""}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}