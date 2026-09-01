import { useCallback, useEffect, useRef, useState } from "react";
import type { Asset } from "./use-assets";

const ENABLED_KEY = "dam-quickpreview-enabled";
const PINNED_ID_KEY = "dam-quickpreview-pinned-id";
const HOVER_DEBOUNCE_MS = 150;

function readEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function readPinnedId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PINNED_ID_KEY);
  } catch {
    return null;
  }
}

function writePinnedId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(PINNED_ID_KEY, id);
    else localStorage.removeItem(PINNED_ID_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * State manager for the DAM Quick Preview panel.
 * - Persists enabled flag in localStorage.
 * - Hovered asset updates after a short debounce to avoid jitter.
 * - Pinned asset takes precedence over hovered (sticky selection).
 */
export function useQuickPreview() {
  const [enabled, setEnabled] = useState<boolean>(() => readEnabled());
  const [hoverAsset, setHoverAssetState] = useState<Asset | null>(null);
  const [pinnedAsset, setPinnedAsset] = useState<Asset | null>(null);
  const [pendingPinnedId, setPendingPinnedId] = useState<string | null>(() =>
    readEnabled() ? readPinnedId() : null
  );
  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [enabled]);

  // Clear all selection when disabled
  useEffect(() => {
    if (!enabled) {
      setHoverAssetState(null);
      setPinnedAsset(null);
      setPendingPinnedId(null);
      writePinnedId(null);
      if (hoverTimer.current) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    }
  }, [enabled]);

  // Persist the current pin id so it survives refreshes.
  useEffect(() => {
    if (!enabled) return;
    writePinnedId(pinnedAsset?.id ?? null);
  }, [enabled, pinnedAsset]);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  const setHoverAsset = useCallback((asset: Asset | null) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    if (asset === null) {
      setHoverAssetState(null);
      return;
    }
    hoverTimer.current = window.setTimeout(() => {
      setHoverAssetState(asset);
    }, HOVER_DEBOUNCE_MS);
  }, []);

  const togglePin = useCallback((asset: Asset) => {
    setPinnedAsset((prev) => (prev?.id === asset.id ? null : asset));
    setPendingPinnedId(null);
  }, []);

  /**
   * Imperatively set the active asset (used by keyboard nav).
   * Bypasses hover debounce and clears any previous pin so arrows
   * always advance the selection visibly.
   */
  const setActiveAsset = useCallback((asset: Asset | null) => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setPinnedAsset(null);
    setPendingPinnedId(null);
    setHoverAssetState(asset);
  }, []);

  /**
   * Restores a previously persisted pinned asset once the asset list is
   * available. Safe to call repeatedly: only acts while a pending id exists
   * and clears itself once the matching asset is found (or after the first
   * non-empty list confirms it isn't visible).
   */
  const hydratePinFromAssets = useCallback(
    (assets: Asset[]) => {
      if (!enabled || !pendingPinnedId || pinnedAsset) return;
      const found = assets.find((a) => a.id === pendingPinnedId);
      if (found) {
        setPinnedAsset(found);
        setPendingPinnedId(null);
      }
    },
    [enabled, pendingPinnedId, pinnedAsset]
  );

  const toggleEnabled = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  const activeAsset: Asset | null = pinnedAsset ?? hoverAsset;

  return {
    enabled,
    toggleEnabled,
    activeAsset,
    setHoverAsset,
    setActiveAsset,
    pinnedId: pinnedAsset?.id ?? null,
    togglePin,
    clearPin: () => {
      setPinnedAsset(null);
      setPendingPinnedId(null);
    },
    hydratePinFromAssets,
  };
}