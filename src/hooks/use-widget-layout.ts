import { useState, useCallback } from "react";

export type WidgetId = "stats" | "quick-actions" | "activity-chart" | "recent-projects";

const STORAGE_KEY = "promo-dashboard-widget-order";

const DEFAULT_ORDER: WidgetId[] = ["stats", "quick-actions", "activity-chart", "recent-projects"];

function loadOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as WidgetId[];
    // Validate: must contain all default widgets
    if (DEFAULT_ORDER.every((id) => parsed.includes(id)) && parsed.length === DEFAULT_ORDER.length) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ORDER;
}

export function useWidgetLayout() {
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(loadOrder);

  const updateOrder = useCallback((newOrder: WidgetId[]) => {
    setWidgetOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, []);

  const resetOrder = useCallback(() => {
    setWidgetOrder(DEFAULT_ORDER);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isDefault = widgetOrder.every((id, i) => id === DEFAULT_ORDER[i]);

  return { widgetOrder, updateOrder, resetOrder, isDefault };
}
