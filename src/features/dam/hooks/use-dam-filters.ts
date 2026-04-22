import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AssetType } from "./use-assets";
import { parseBoolParam } from "../lib/parse-bool-param";

const TAGS_MODE_KEY = "dam-tags-mode";
const SEARCH_KEY = "dam-search";
const ASSET_TYPES_KEY = "dam-asset-types";
const CLIENT_ID_KEY = "dam-client-id";
const TAGS_KEY = "dam-tags";
const SORT_KEY = "dam-sort";
const ARCHIVED_KEY = "dam-include-archived";

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLS(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* ignore */ }
}

export type SortValue =
  | "relevance"
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "size_desc"
  | "size_asc"
  | "updated_desc"
  | "updated_asc"
  | "version_desc";

export const SORT_OPTIONS: {
  value: SortValue;
  label: string;
  sortBy: "created_at" | "updated_at" | "name" | "file_size" | "version" | "relevance";
  sortDir: "asc" | "desc";
}[] = [
  { value: "relevance", label: "Relevância", sortBy: "relevance", sortDir: "desc" },
  { value: "created_desc", label: "Mais recentes", sortBy: "created_at", sortDir: "desc" },
  { value: "created_asc", label: "Mais antigos", sortBy: "created_at", sortDir: "asc" },
  { value: "name_asc", label: "Nome A→Z", sortBy: "name", sortDir: "asc" },
  { value: "name_desc", label: "Nome Z→A", sortBy: "name", sortDir: "desc" },
  { value: "size_desc", label: "Maior arquivo", sortBy: "file_size", sortDir: "desc" },
  { value: "size_asc", label: "Menor arquivo", sortBy: "file_size", sortDir: "asc" },
  { value: "updated_desc", label: "Modificados recentemente", sortBy: "updated_at", sortDir: "desc" },
  { value: "updated_asc", label: "Modificados há mais tempo", sortBy: "updated_at", sortDir: "asc" },
  { value: "version_desc", label: "Versão", sortBy: "version", sortDir: "desc" },
];

const VALID_TYPES: AssetType[] = ["logo", "art", "photo", "mockup", "document", "other"];
const VALID_SORTS: SortValue[] = SORT_OPTIONS.map((o) => o.value);

const OWNED_KEYS = ["q", "type", "client", "tags", "tagsMode", "archived", "sort"] as const;

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
    const typesSrc = params.get("type") ?? readLS(ASSET_TYPES_KEY) ?? "";
    const types = typesSrc
      .split(",")
      .filter((s) => s && (VALID_TYPES as string[]).includes(s)) as AssetType[];
    const tagsSrc = params.get("tags") ?? readLS(TAGS_KEY) ?? "";
    const tags = tagsSrc.split(",").filter(Boolean);
    const sortFromUrl = params.get("sort") as SortValue | null;
    const sortFromLs = readLS(SORT_KEY) as SortValue | null;
    const sort: SortValue =
      (sortFromUrl && VALID_SORTS.includes(sortFromUrl) && sortFromUrl) ||
      (sortFromLs && VALID_SORTS.includes(sortFromLs) && sortFromLs) ||
      "created_desc";
    const tagsMode = (params.get("tagsMode") as "all" | "any") || readInitialTagsMode();
    const clientFromUrl = params.get("client") as DamFiltersState["clientId"] | null;
    const clientFromLs = readLS(CLIENT_ID_KEY) as DamFiltersState["clientId"] | null;
    // Standard "Arquivados" toggle resolution: URL (truthy/falsy spellings)
    // → localStorage → default(false). Accepts 1/0/true/false/yes/no/on/off.
    const archivedFromUrl = parseBoolParam(params.get("archived"));
    const includeArchived =
      archivedFromUrl !== null ? archivedFromUrl : readLS(ARCHIVED_KEY) === "1";
    return {
      search: params.get("q") ?? readLS(SEARCH_KEY) ?? "",
      assetTypes: types,
      clientId: clientFromUrl || clientFromLs || "all",
      tags,
      tagsMode,
      includeArchived,
      sort,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, setState] = useState<DamFiltersState>(initial);

  // Sync state -> URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    OWNED_KEYS.forEach((k) => next.delete(k));
    if (state.search.trim()) next.set("q", state.search.trim());
    if (state.assetTypes.length > 0) next.set("type", state.assetTypes.join(","));
    if (state.clientId && state.clientId !== "all") next.set("client", state.clientId);
    if (state.tags.length > 0) next.set("tags", state.tags.join(","));
    if (state.tags.length > 1) next.set("tagsMode", state.tagsMode);
    if (state.includeArchived) next.set("archived", "1");
    if (state.sort !== "created_desc") next.set("sort", state.sort);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, setParams]);

  // Persist tagsMode
  useEffect(() => {
    try {
      localStorage.setItem(TAGS_MODE_KEY, state.tagsMode);
    } catch {
      /* ignore */
    }
  }, [state.tagsMode]);

  // Persist filters to localStorage (shared with DamLibraryPage)
  useEffect(() => {
    writeLS(SEARCH_KEY, state.search.trim() || null);
  }, [state.search]);
  useEffect(() => {
    writeLS(ASSET_TYPES_KEY, state.assetTypes.length > 0 ? state.assetTypes.join(",") : null);
  }, [state.assetTypes]);
  useEffect(() => {
    writeLS(CLIENT_ID_KEY, state.clientId !== "all" ? state.clientId : null);
  }, [state.clientId]);
  useEffect(() => {
    writeLS(TAGS_KEY, state.tags.length > 0 ? state.tags.join(",") : null);
  }, [state.tags]);
  useEffect(() => {
    writeLS(SORT_KEY, state.sort !== "created_desc" ? state.sort : null);
  }, [state.sort]);
  useEffect(() => {
    writeLS(ARCHIVED_KEY, state.includeArchived ? "1" : null);
  }, [state.includeArchived]);

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
    writeLS(SEARCH_KEY, null);
    writeLS(ASSET_TYPES_KEY, null);
    writeLS(CLIENT_ID_KEY, null);
    writeLS(TAGS_KEY, null);
    writeLS(SORT_KEY, null);
    writeLS(ARCHIVED_KEY, null);
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