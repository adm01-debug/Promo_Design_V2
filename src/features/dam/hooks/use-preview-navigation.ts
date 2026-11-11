import { useRef, useEffect } from "react";
import { LAST_ASSET_KEY } from "../pages/DamPreviewPage";
import type { Asset } from "../hooks/use-assets";

export function usePreviewNavigation({
  assets,
  activeIndex,
  setActiveIndex,
  searchParams,
  setSearchParams,
}: {
  assets: Asset[];
  activeIndex: number;
  setActiveIndex: (idx: number) => void;
  searchParams: URLSearchParams;
  setSearchParams: (next: URLSearchParams, options?: { replace?: boolean }) => void;
}) {
  const userNavRef = useRef(false);
  const lastUserSelectedIdRef = useRef<string | null>(null);

  const activeAsset = assets[activeIndex] ?? null;

  // Sync URL ?asset=<id> with current activeAsset
  useEffect(() => {
    if (!activeAsset) return;
    if (searchParams.get("asset") === activeAsset.id) return;
    const next = new URLSearchParams(searchParams);
    next.set("asset", activeAsset.id);
    const replace = !userNavRef.current;
    userNavRef.current = false;
    setSearchParams(next, { replace });
  }, [activeAsset, searchParams, setSearchParams]);

  // Persist last viewed asset
  useEffect(() => {
    if (!activeAsset) return;
    if (lastUserSelectedIdRef.current !== activeAsset.id) return;
    try {
      localStorage.setItem(LAST_ASSET_KEY, JSON.stringify({ id: activeAsset.id, ts: Date.now() }));
    } catch {
      /* ignore */
    }
  }, [activeAsset]);

  const selectAssetAt = (idx: number, opts?: { pushHistory?: boolean }) => {
    if (assets.length === 0) return;
    if (opts?.pushHistory) userNavRef.current = true;
    const normalized = ((idx % assets.length) + assets.length) % assets.length;
    const target = assets[normalized];
    if (target) lastUserSelectedIdRef.current = target.id;
    setActiveIndex(normalized);
  };

  const goPrev = () => selectAssetAt(activeIndex - 1, { pushHistory: true });
  const goNext = () => selectAssetAt(activeIndex + 1, { pushHistory: true });

  return {
    activeAsset,
    lastUserSelectedIdRef,
    goPrev,
    goNext,
    selectAssetAt,
  };
}
