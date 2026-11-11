import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "dam-compare-selection";
const MAX_SELECTION = 4;

function readInitial(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_SELECTION);
  } catch {
    /* ignore */
  }
  return [];
}

export function useCompareSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => readInitial());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
    } catch {
      /* ignore */
    }
  }, [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTION) {
        toast.warning(`Máximo de ${MAX_SELECTION} assets para comparação`);
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  return {
    selectedIds,
    toggle,
    remove,
    clear,
    count: selectedIds.length,
    canAdd: selectedIds.length < MAX_SELECTION,
    max: MAX_SELECTION,
  };
}
