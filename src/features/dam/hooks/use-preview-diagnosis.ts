import { useMemo, useState, useEffect } from "react";
import type { Asset } from "../hooks/use-assets";
import { diagnoseAssetRemoval, type DiagnosisCause } from "../lib/filter-diagnosis";
import type { UseDamFiltersReturn } from "../hooks/use-dam-filters";

export function usePreviewDiagnosis(
  activeAsset: Asset | null,
  assets: Asset[],
  filters: UseDamFiltersReturn,
  clientNameById: Record<string, string>,
) {
  const [lastKnownAsset, setLastKnownAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (activeAsset) setLastKnownAsset(activeAsset);
  }, [activeAsset]);

  const removalCauses: DiagnosisCause[] = useMemo(() => {
    if (!lastKnownAsset) return [];
    if (assets.some((a) => a.id === lastKnownAsset.id)) return [];
    return diagnoseAssetRemoval(lastKnownAsset, filters.state, { clientNameById });
  }, [lastKnownAsset, assets, filters.state, clientNameById]);

  return {
    lastKnownAsset,
    removalCauses,
    assetRemovedByFilter: removalCauses.length > 0,
  };
}
