import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "dam-favorites:";
const EVENT_NAME = "dam-favorites-changed";

function storageKey(orgId: string | null): string | null {
  return orgId ? `${STORAGE_PREFIX}${orgId}` : null;
}

function readSet(orgId: string | null): Set<string> {
  const key = storageKey(orgId);
  if (!key || typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? new Set(arr.filter((x): x is string => typeof x === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(orgId: string | null, set: Set<string>) {
  const key = storageKey(orgId);
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { orgId } }));
  } catch {
    /* ignore */
  }
}

export function useAssetFavorites(orgId: string | null) {
  const [favorites, setFavorites] = useState<Set<string>>(() => readSet(orgId));

  useEffect(() => {
    setFavorites(readSet(orgId));
    const refresh = () => setFavorites(readSet(orgId));
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ orgId: string | null }>).detail;
      if (!detail || detail.orgId === orgId) refresh();
    };
    window.addEventListener("storage", refresh);
    window.addEventListener(EVENT_NAME, onCustom);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, [orgId]);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string): boolean => {
      const next = new Set(favorites);
      const willFavorite = !next.has(id);
      if (willFavorite) next.add(id);
      else next.delete(id);
      setFavorites(next);
      writeSet(orgId, next);
      return willFavorite;
    },
    [favorites, orgId],
  );

  return { favorites, isFavorite, toggleFavorite };
}
