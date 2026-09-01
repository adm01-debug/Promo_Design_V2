import { useState, useEffect, useMemo } from "react";
import type { Asset } from "../hooks/use-assets";

export type SortKey = "version_desc" | "version_asc" | "date_desc" | "date_asc";

export interface VersionFilters {
  query: string;
  author: string; // "all" or created_by id
  sort: SortKey;
}

export const DEFAULT_FILTERS: VersionFilters = {
  query: "",
  author: "all",
  sort: "version_desc",
};

const STORAGE_KEY = "dam:version-history-filters";
const VIEW_STORAGE_KEY = "dam:version-history-view";
const TIMELINE_FOLLOW_SORT_KEY = "dam:version-history-timeline-follow-sort";
const TIMELINE_GROUPING_KEY = "dam:version-history-timeline-grouping";

export type ViewMode = "list" | "timeline";
export type TimelineGrouping = "auto" | "month" | "week" | "day";

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    if (typeof defaultValue === "string") return raw as unknown as T;
    if (typeof defaultValue === "boolean") return (raw === "1") as unknown as T;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function useVersionFilters(versions: Asset[]) {
  const [filters, setFilters] = useState<VersionFilters>(() => 
    loadFromStorage<VersionFilters>(STORAGE_KEY, DEFAULT_FILTERS)
  );
  const [view, setView] = useState<ViewMode>(() => 
    loadFromStorage<ViewMode>(VIEW_STORAGE_KEY, "list")
  );
  const [timelineFollowSort, setTimelineFollowSort] = useState<boolean>(() => 
    loadFromStorage<boolean>(TIMELINE_FOLLOW_SORT_KEY, false)
  );
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>(() => 
    loadFromStorage<TimelineGrouping>(TIMELINE_GROUPING_KEY, "auto")
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
      window.localStorage.setItem(TIMELINE_FOLLOW_SORT_KEY, timelineFollowSort ? "1" : "0");
      window.localStorage.setItem(TIMELINE_GROUPING_KEY, timelineGrouping);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch { /* ignore */ }
  }, [view, timelineFollowSort, timelineGrouping, filters]);

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of versions) {
      if (!map.has(v.created_by)) {
        const id = v.created_by;
        map.set(id, id.length > 8 ? `${id.slice(0, 8)}…` : id);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [versions]);

  const filteredVersions = useMemo(() => {
    const q = filters.query.trim().toLowerCase().replace(/^v/, "");
    let list = versions.filter((v) => {
      if (filters.author !== "all" && v.created_by !== filters.author) return false;
      if (!q) return true;
      if (String(v.version).startsWith(q)) return true;
      if (v.name.toLowerCase().includes(filters.query.trim().toLowerCase())) return true;
      return false;
    });
    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case "version_asc": return a.version - b.version;
        case "date_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "version_desc":
        default: return b.version - a.version;
      }
    });
    return list;
  }, [versions, filters]);

  const hasActiveFilters = 
    filters.query.trim() !== "" || filters.author !== "all" || filters.sort !== "version_desc";

  return {
    filters,
    setFilters,
    view,
    setView,
    timelineFollowSort,
    setTimelineFollowSort,
    timelineGrouping,
    setTimelineGrouping,
    authors,
    filteredVersions,
    hasActiveFilters,
    resetFilters: () => setFilters(DEFAULT_FILTERS)
  };
}
