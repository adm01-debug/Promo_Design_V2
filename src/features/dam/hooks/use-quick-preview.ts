import { useCallback, useEffect, useRef, useState } from "react";
import type { Asset } from "./use-assets";

const ENABLED_KEY = "dam-quickpreview-enabled";
const HOVER_DEBOUNCE_MS = 150;

function readEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
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
      if (hoverTimer.current) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    }
  }, [enabled]);

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
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  const activeAsset: Asset | null = pinnedAsset ?? hoverAsset;

  return {
    enabled,
    toggleEnabled,
    activeAsset,
    setHoverAsset,
    pinnedId: pinnedAsset?.id ?? null,
    togglePin,
    clearPin: () => setPinnedAsset(null),
  };
}