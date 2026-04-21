import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AssetType } from "./use-assets";

const TAGS_MODE_KEY = "dam-tags-mode";

export type SortValue =
  | "relevance"
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "size_desc"
  | "version_desc";

export const SORT_OPTIONS: {
  value: SortValue;
  label: string;
  sortBy: "created_at" | "name" | "file_size" | "version" | "relevance";
  sortDir: "asc" | "desc";
}[] = [
  { value: "relevance", label: "Relevância", sortBy: "relevance", sortDir: "desc" },
  { value: "created_desc", label: "Mais recentes", sortBy: "created_at", sortDir: "desc" },
  { value: "created_asc", label: "Mais antigos", sortBy: "created_at", sortDir: "asc" },
  { value: "name_asc", label: "Nome A→Z", sortBy: "name", sortDir: "asc" },
  { value: "name_desc", label: "Nome Z→A", sortBy: "name", sortDir: "desc" },
  { value: "size_desc", label: "Maior arquivo", sortBy: "file_size", sortDir: "desc" },
  { value: "version_desc", label: "Versão", sortBy: "version", sortDir: "desc" },
];

const VALID_TYPES: AssetType[] = ["logo", "art", "photo", "mockup", "document", "other"];
const VALID_SORTS: SortValue[] = SORT_OPTIONS.map((o) => o.value);

export interface DamFiltersState {
  search: string;
  assetTypes: AssetType[];
  clientId: string | "all" | "none";
  tags: string[];
  tagsMode: "all" | "any";
  includeArchived: boolean;
  sort: SortValue;
}

function readInitialTagsMode(): "all" | "any" {
  if (typeof window === "undefined") return "all";
  return (localStorage.getItem(TAGS_MODE_KEY) as "all" | "any") || "all";
}

/**
 * Centralizes DAM filter state with two-way sync to URL querystring.
 * Used by both the library page and the quick preview page so filters survive navigation.
 */
export function useDamFilters() {
  const [params, setParams] = useSearchParams();

  const initial: DamFiltersState = useMemo(() => {
    const types = (params.get("type") ?? "")
      .split(",")
      .filter((s) => s && (VALID_TYPES as string[]).includes(s)) as AssetType[];
    const tags = (params.get("tags") ?? "").split(",").filter(Boolean);
    const sort = (params.get("sort") as SortValue) ?? "created_desc";
    const tagsMode = (params.get("tagsMode") as "all" | "any") || readInitialTagsMode();
    return {
      search: params.get("q") ?? "",
      assetTypes: types,
      clientId: (params.get("client") as DamFiltersState["clientId"]) || "all",
      tags,
      tagsMode,
      includeArchived: params.get("archived") === "1",
      sort: VALID_SORTS.includes(sort) ? sort : "created_desc",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, setState] = useState<DamFiltersState>(initial);

  // Sync state -> URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (state.search.trim()) next.set("q", state.search.trim());
    if (state.assetTypes.length > 0) next.set("type", state.assetTypes.join(","));
    if (state.clientId && state.clientId !== "all") next.set("client", state.clientId);
    if (state.tags.length > 0) next.set("tags", state.tags.join(","));
    if (state.tags.length > 1) next.set("tagsMode", state.tagsMode);
    if (state.includeArchived) next.set("archived", "1");
    if (state.sort !== "created_desc") next.set("sort", state.sort);
    setParams(next, { replace: true });
  }, [state, setParams]);

  // Persist tagsMode
  useEffect(() => {
    try {
      localStorage.setItem(TAGS_MODE_KEY, state.tagsMode);
    } catch {
      /* ignore */
    }
  }, [state.tagsMode]);

  // Auto-fallback if relevance is selected without a search term
  useEffect(() => {
    if (state.sort === "relevance" && !state.search.trim()) {
      setState((s) => ({ ...s, sort: "created_desc" }));
    }
  }, [state.sort, state.search]);

  const setSearch = useCallback((v: string) => setState((s) => ({ ...s, search: v })), []);
  const setAssetTypes = useCallback(
    (updater: AssetType[] | ((prev: AssetType[]) => AssetType[])) =>
      setState((s) => ({
        ...s,
        assetTypes: typeof updater === "function" ? updater(s.assetTypes) : updater,
      })),
    [],
  );
  const setClientId = useCallback(
    (v: DamFiltersState["clientId"]) => setState((s) => ({ ...s, clientId: v })),
    [],
  );
  const setTags = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) =>
      setState((s) => ({
        ...s,
        tags: typeof updater === "function" ? updater(s.tags) : updater,
      })),
    [],
  );
  const setTagsMode = useCallback(
    (v: "all" | "any") => setState((s) => ({ ...s, tagsMode: v })),
    [],
  );
  const setIncludeArchived = useCallback(
    (v: boolean) => setState((s) => ({ ...s, includeArchived: v })),
    [],
  );
  const setSort = useCallback((v: SortValue) => setState((s) => ({ ...s, sort: v })), []);

  const reset = useCallback(() => {
    setState({
      search: "",
      assetTypes: [],
      clientId: "all",
      tags: [],
      tagsMode: "all",
      includeArchived: false,
      sort: "created_desc",
    });
  }, []);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (state.search.trim()) sp.set("q", state.search.trim());
    if (state.assetTypes.length > 0) sp.set("type", state.assetTypes.join(","));
    if (state.clientId && state.clientId !== "all") sp.set("client", state.clientId);
    if (state.tags.length > 0) sp.set("tags", state.tags.join(","));
    if (state.tags.length > 1) sp.set("tagsMode", state.tagsMode);
    if (state.includeArchived) sp.set("archived", "1");
    if (state.sort !== "created_desc") sp.set("sort", state.sort);
    const s = sp.toString();
    return s ? `?${s}` : "";
  }, [state]);

  return {
    state,
    setSearch,
    setAssetTypes,
    setClientId,
    setTags,
    setTagsMode,
    setIncludeArchived,
    setSort,
    reset,
    queryString,
  };
}

export type UseDamFiltersReturn = ReturnType<typeof useDamFilters>;