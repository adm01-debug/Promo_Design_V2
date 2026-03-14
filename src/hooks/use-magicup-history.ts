import { useState, useCallback, useMemo } from "react";

export interface MagicUpHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  favorite: boolean;
  productName?: string;
  productSku?: string;
  style?: string;
  createdAt: string;
}

const STORAGE_KEY = "magicup-history";

function loadHistory(): MagicUpHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: MagicUpHistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useMagicUpHistory() {
  const [items, setItems] = useState<MagicUpHistoryItem[]>(loadHistory);

  const update = useCallback((updater: (prev: MagicUpHistoryItem[]) => MagicUpHistoryItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      saveHistory(next);
      return next;
    });
  }, []);

  const addGeneration = useCallback((entry: Omit<MagicUpHistoryItem, "id" | "createdAt" | "favorite">) => {
    update((prev) => [
      {
        ...entry,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        favorite: false,
      },
      ...prev,
    ]);
  }, [update]);

  const toggleFavorite = useCallback((id: string) => {
    update((prev) => prev.map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i)));
  }, [update]);

  const deleteItem = useCallback((id: string) => {
    update((prev) => prev.filter((i) => i.id !== id));
  }, [update]);

  return { items, addGeneration, toggleFavorite, deleteItem };
}
