import { useState, useCallback } from "react";

export type WidgetId = "stats" | "quick-actions" | "activity-chart" | "heatmap" | "recent-projects";

const STORAGE_KEY = "promo-dashboard-widget-order";
const HIDDEN_STORAGE_KEY = "promo-dashboard-hidden-widgets";

const DEFAULT_ORDER: WidgetId[] = [
  "stats",
  "quick-actions",
  "activity-chart",
  "heatmap",
  "recent-projects",
];

function loadOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as WidgetId[];
    // Validate: must contain all default widgets
    if (
      DEFAULT_ORDER.every((id) => parsed.includes(id)) &&
      parsed.length === DEFAULT_ORDER.length
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ORDER;
}

function loadHidden(): WidgetId[] {
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WidgetId[];
    // Validate: only known widget ids
    return parsed.filter((id): id is WidgetId => DEFAULT_ORDER.includes(id));
  } catch {
    return [];
  }
}

export function useWidgetLayout() {
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(loadOrder);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>(loadHidden);

  const updateOrder = useCallback((newOrder: WidgetId[]) => {
    setWidgetOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, []);

  const toggleHidden = useCallback((id: WidgetId) => {
    setHiddenWidgets((prev) => {
      const next = prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id];
      localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const replaceHidden = useCallback((next: WidgetId[]) => {
    setHiddenWidgets(next);
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetOrder = useCallback(() => {
    setWidgetOrder(DEFAULT_ORDER);
    setHiddenWidgets([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HIDDEN_STORAGE_KEY);
  }, []);

  const isDefault =
    widgetOrder.every((id, i) => id === DEFAULT_ORDER[i]) && hiddenWidgets.length === 0;

  return {
    widgetOrder,
    hiddenWidgets,
    toggleHidden,
    replaceHidden,
    updateOrder,
    resetOrder,
    isDefault,
  };
}
