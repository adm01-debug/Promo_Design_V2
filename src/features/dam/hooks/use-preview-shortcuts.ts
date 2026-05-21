import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Asset } from "../hooks/use-assets";

export function usePreviewShortcuts({
  detailAsset,
  queryString,
  compareMode,
  setCompareMode,
  activeAsset,
  compare,
  goPrev,
  goNext,
  onOpenDetails,
}: {
  detailAsset: Asset | null;
  queryString: string;
  compareMode: boolean;
  setCompareMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  activeAsset: Asset | null;
  compare: any;
  goPrev: () => void;
  goNext: () => void;
  onOpenDetails: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inEditable = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;

      if (detailAsset) return;

      if (e.key === "Escape") {
        if (inEditable && target) {
          e.preventDefault();
          target.blur();
          return;
        }
        e.preventDefault();
        navigate(`/dam${queryString}`);
        return;
      }

      if (inEditable) return;

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setCompareMode((v) => !v);
        return;
      }

      if (compareMode && e.key === " ") {
        e.preventDefault();
        if (activeAsset) compare.toggle(activeAsset.id);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        onOpenDetails();
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    detailAsset,
    queryString,
    compareMode,
    setCompareMode,
    activeAsset,
    compare,
    goPrev,
    goNext,
    onOpenDetails,
    navigate,
  ]);
}
