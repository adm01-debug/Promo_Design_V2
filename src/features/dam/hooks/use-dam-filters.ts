import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { AssetType } from "./use-assets";
import { parseBoolParam } from "../lib/parse-bool-param";
import {
  SORT_OPTIONS,
  VALID_ASSET_TYPES,
  SIZE_RANGE_OPTIONS,
  UPDATED_RANGE_OPTIONS,
  TAGS_MODE_KEY,
  SEARCH_KEY,
  ASSET_TYPES_KEY,
  CLIENT_ID_KEY,
  TAGS_KEY,
  SORT_KEY,
  INCLUDE_ARCHIVED_KEY,
  ARCHIVED_ONLY_KEY,
  OCR_ONLY_KEY,
  PAGE_KEY,
  PAGE_SIZE_KEY,
  PAGINATION_MODE_KEY,
  VIEW_MODE_KEY,
  LIST_SHOW_SIZE_KEY,
  SIZE_RANGE_KEY,
  UPDATED_RANGE_KEY,
  CUSTOM_SIZE_KEY,
  type SortValue,
  type SizeRangeKey,
  type UpdatedRangeKey,
  type CustomSizeRange,
} from "../lib/dam-constants";

export { SORT_OPTIONS, type SortValue };

function readLS(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export type PaginationMode = "pages" | "loadmore";

export interface DamFiltersState {
  search: string;
  assetTypes: AssetType[];
  clientId: string | "all" | "none";
  tags: string[];
  tagsMode: "all" | "any";
  includeArchived: boolean;
  archivedOnly: boolean;
  ocrOnly: boolean;
  sort: SortValue;
  page: number;
  pageSize: number;
  paginationMode: PaginationMode;
  viewMode: "grid" | "list";
  showSizeColumn: boolean;
  sizeRange: SizeRangeKey;
  updatedRange: UpdatedRangeKey;
  customSize: CustomSizeRange | null;
}

const OWNED_KEYS = [
  "q",
  "type",
  "client",
  "tags",
  "tagsMode",
  "archived",
  "archivedOnly",
  "ocrOnly",
  "sort",
  "page",
  "pageSize",
  "mode",
  "size",
  "updated",
  "sizeMin",
  "sizeMax",
  "sizeUnit",
] as const;

/**
 * Centralizes DAM filter state with two-way sync to URL querystring and localStorage.
 * Used by the library page and preview page.
 */
export function useDamFilters() {
  const [params, setParams] = useSearchParams();

  const initial: DamFiltersState = useMemo(() => {
    // ── Search & Types ──
    const q = params.get("q") ?? readLS(SEARCH_KEY) ?? "";
    const typesStr = params.get("type") ?? readLS(ASSET_TYPES_KEY) ?? "";
    const assetTypes = typesStr
      .split(",")
      .filter((s) => s && (VALID_ASSET_TYPES as string[]).includes(s)) as AssetType[];

    // ── Client & Tags ──
    const clientId =
      (params.get("client") as DamFiltersState["clientId"]) ?? readLS(CLIENT_ID_KEY) ?? "all";
    const tags = (params.get("tags") ?? readLS(TAGS_KEY) ?? "").split(",").filter(Boolean);
    const tagsMode =
      (params.get("tagsMode") as "all" | "any") ||
      (readLS(TAGS_MODE_KEY) as "all" | "any") ||
      "all";

    // ── Toggles ──
    const archivedFromUrl = parseBoolParam(params.get("archived"));
    const includeArchived =
      archivedFromUrl !== null ? archivedFromUrl : readLS(INCLUDE_ARCHIVED_KEY) === "1";
    const archOnlyFromUrl = parseBoolParam(params.get("archivedOnly"));
    const archivedOnly =
      archOnlyFromUrl !== null ? archOnlyFromUrl : readLS(ARCHIVED_ONLY_KEY) === "1";
    const ocrFromUrl = parseBoolParam(params.get("ocrOnly"));
    const ocrOnly = ocrFromUrl !== null ? ocrFromUrl : readLS(OCR_ONLY_KEY) === "1";

    // ── Sort ──
    const sortUrl = params.get("sort") as SortValue | null;
    const sortLs = readLS(SORT_KEY) as SortValue | null;
    const sort: SortValue =
      (sortUrl && SORT_OPTIONS.some((o) => o.value === sortUrl) && sortUrl) ||
      (sortLs && SORT_OPTIONS.some((o) => o.value === sortLs) && sortLs) ||
      "created_desc";

    // ── Pagination ──
    const pageUrl = Number(params.get("page"));
    const page = pageUrl > 0 ? pageUrl : Number(readLS(PAGE_KEY) || 1);
    const sizeUrl = Number(params.get("pageSize"));
    const pageSize = [24, 48, 96].includes(sizeUrl) ? sizeUrl : Number(readLS(PAGE_SIZE_KEY) || 24);
    const modeUrl = params.get("mode") as PaginationMode | null;
    const paginationMode =
      modeUrl === "loadmore" || modeUrl === "pages"
        ? modeUrl
        : (readLS(PAGINATION_MODE_KEY) as PaginationMode) || "pages";

    // ── View ──
    const viewMode = (readLS(VIEW_MODE_KEY) as "grid" | "list") || "grid";
    const showSizeColumn = readLS(LIST_SHOW_SIZE_KEY) === "1";

    // ── Ranges ──
    const sizeRangeUrl = params.get("size") as SizeRangeKey | null;
    const sizeRangeLs = readLS(SIZE_RANGE_KEY) as SizeRangeKey | null;
    const sizeRange =
      (sizeRangeUrl && SIZE_RANGE_OPTIONS.some((o) => o.value === sizeRangeUrl) && sizeRangeUrl) ||
      (sizeRangeLs && SIZE_RANGE_OPTIONS.some((o) => o.value === sizeRangeLs) && sizeRangeLs) ||
      "all";

    const updatedRangeUrl = params.get("updated") as UpdatedRangeKey | null;
    const updatedRangeLs = readLS(UPDATED_RANGE_KEY) as UpdatedRangeKey | null;
    const updatedRange =
      (updatedRangeUrl &&
        UPDATED_RANGE_OPTIONS.some((o) => o.value === updatedRangeUrl) &&
        updatedRangeUrl) ||
      (updatedRangeLs &&
        UPDATED_RANGE_OPTIONS.some((o) => o.value === updatedRangeLs) &&
        updatedRangeLs) ||
      "all";

    // ── Custom Size ──
    let customSize: CustomSizeRange | null = null;
    const minUrl = Number(params.get("sizeMin"));
    const maxUrl = Number(params.get("sizeMax"));
    if (minUrl >= 0 || maxUrl >= 0) {
      const unit = params.get("sizeUnit") === "KB" ? "KB" : "MB";
      const factor = unit === "KB" ? 1024 : 1024 * 1024;
      customSize = {
        minBytes: params.get("sizeMin") ? minUrl : null,
        maxBytes: params.get("sizeMax") ? maxUrl : null,
        unit,
        minRaw: params.get("sizeMin") ? String(minUrl / factor) : "",
        maxRaw: params.get("sizeMax") ? String(maxUrl / factor) : "",
      };
    } else {
      const customLs = readLS(CUSTOM_SIZE_KEY);
      if (customLs) {
        try {
          customSize = JSON.parse(customLs);
        } catch {
          // ignore parse errors — corrupt LS value falls back to null
        }
      }
    }

    return {
      search: q,
      assetTypes,
      clientId,
      tags,
      tagsMode,
      includeArchived,
      archivedOnly,
      ocrOnly,
      sort,
      page,
      pageSize,
      paginationMode,
      viewMode,
      showSizeColumn,
      sizeRange,
      updatedRange,
      customSize,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, setState] = useState<DamFiltersState>(initial);

  // ── Sync State -> URL ──
  useEffect(() => {
    const next = new URLSearchParams(params);
    OWNED_KEYS.forEach((k) => next.delete(k));
    if (state.search.trim()) next.set("q", state.search.trim());
    if (state.assetTypes.length > 0) next.set("type", state.assetTypes.join(","));
    if (state.clientId && state.clientId !== "all") next.set("client", state.clientId);
    if (state.tags.length > 0) next.set("tags", state.tags.join(","));
    if (state.tags.length > 1) next.set("tagsMode", state.tagsMode);
    if (state.includeArchived) next.set("archived", "1");
    if (state.archivedOnly) next.set("archivedOnly", "1");
    if (state.ocrOnly) next.set("ocrOnly", "1");
    if (state.sort !== "created_desc") next.set("sort", state.sort);
    if (state.page > 1 && state.paginationMode === "pages") next.set("page", String(state.page));
    if (state.pageSize !== 24) next.set("pageSize", String(state.pageSize));
    if (state.paginationMode !== "pages") next.set("mode", state.paginationMode);
    if (state.sizeRange !== "all") next.set("size", state.sizeRange);
    if (state.updatedRange !== "all") next.set("updated", state.updatedRange);
    if (state.customSize?.minBytes != null) next.set("sizeMin", String(state.customSize.minBytes));
    if (state.customSize?.maxBytes != null) next.set("sizeMax", String(state.customSize.maxBytes));
    if (state.customSize) next.set("sizeUnit", state.customSize.unit);

    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, setParams]);

  // ── Sync State -> LocalStorage ──
  useEffect(() => {
    writeLS(SEARCH_KEY, state.search.trim() || null);
    writeLS(ASSET_TYPES_KEY, state.assetTypes.length > 0 ? state.assetTypes.join(",") : null);
    writeLS(CLIENT_ID_KEY, state.clientId !== "all" ? state.clientId : null);
    writeLS(TAGS_KEY, state.tags.length > 0 ? state.tags.join(",") : null);
    writeLS(TAGS_MODE_KEY, state.tagsMode !== "all" ? state.tagsMode : null);
    writeLS(INCLUDE_ARCHIVED_KEY, state.includeArchived ? "1" : null);
    writeLS(ARCHIVED_ONLY_KEY, state.archivedOnly ? "1" : null);
    writeLS(OCR_ONLY_KEY, state.ocrOnly ? "1" : null);
    writeLS(SORT_KEY, state.sort !== "created_desc" ? state.sort : null);
    writeLS(PAGE_KEY, state.page > 1 ? String(state.page) : null);
    writeLS(PAGE_SIZE_KEY, state.pageSize !== 24 ? String(state.pageSize) : null);
    writeLS(PAGINATION_MODE_KEY, state.paginationMode !== "pages" ? state.paginationMode : null);
    writeLS(VIEW_MODE_KEY, state.viewMode !== "grid" ? state.viewMode : null);
    writeLS(LIST_SHOW_SIZE_KEY, state.showSizeColumn ? "1" : null);
    writeLS(SIZE_RANGE_KEY, state.sizeRange !== "all" ? state.sizeRange : null);
    writeLS(UPDATED_RANGE_KEY, state.updatedRange !== "all" ? state.updatedRange : null);
    writeLS(CUSTOM_SIZE_KEY, state.customSize ? JSON.stringify(state.customSize) : null);
  }, [state]);

  // ── Fallbacks ──
  useEffect(() => {
    if (state.sort === "relevance" && !state.search.trim()) {
      setState((s) => ({ ...s, sort: "created_desc" }));
    }
  }, [state.sort, state.search]);

  // ── Updaters ──
  const setSearch = useCallback((v: string) => setState((s) => ({ ...s, search: v, page: 1 })), []);
  const setAssetTypes = useCallback(
    (v: AssetType[] | ((prev: AssetType[]) => AssetType[])) =>
      setState((s) => ({
        ...s,
        assetTypes: typeof v === "function" ? v(s.assetTypes) : v,
        page: 1,
      })),
    [],
  );
  const setClientId = useCallback(
    (v: DamFiltersState["clientId"]) => setState((s) => ({ ...s, clientId: v, page: 1 })),
    [],
  );
  const setTags = useCallback(
    (v: string[] | ((prev: string[]) => string[])) =>
      setState((s) => ({ ...s, tags: typeof v === "function" ? v(s.tags) : v, page: 1 })),
    [],
  );
  const setTagsMode = useCallback(
    (v: "all" | "any") => setState((s) => ({ ...s, tagsMode: v, page: 1 })),
    [],
  );
  const setIncludeArchived = useCallback(
    (v: boolean) => setState((s) => ({ ...s, includeArchived: v, page: 1 })),
    [],
  );
  const setArchivedOnly = useCallback(
    (v: boolean) => setState((s) => ({ ...s, archivedOnly: v, page: 1 })),
    [],
  );
  const setOcrOnly = useCallback(
    (v: boolean) => setState((s) => ({ ...s, ocrOnly: v, page: 1 })),
    [],
  );
  const setSort = useCallback((v: SortValue) => setState((s) => ({ ...s, sort: v, page: 1 })), []);
  const setPage = useCallback(
    (v: number | ((p: number) => number)) =>
      setState((s) => ({ ...s, page: typeof v === "function" ? v(s.page) : v })),
    [],
  );
  const setPageSize = useCallback(
    (v: number) => setState((s) => ({ ...s, pageSize: v, page: 1 })),
    [],
  );
  const setPaginationMode = useCallback(
    (v: PaginationMode) => setState((s) => ({ ...s, paginationMode: v })),
    [],
  );
  const setViewMode = useCallback(
    (v: "grid" | "list") => setState((s) => ({ ...s, viewMode: v })),
    [],
  );
  const setShowSizeColumn = useCallback(
    (v: boolean) => setState((s) => ({ ...s, showSizeColumn: v })),
    [],
  );
  const setSizeRange = useCallback(
    (v: SizeRangeKey) => setState((s) => ({ ...s, sizeRange: v, page: 1 })),
    [],
  );
  const setUpdatedRange = useCallback(
    (v: UpdatedRangeKey) => setState((s) => ({ ...s, updatedRange: v, page: 1 })),
    [],
  );
  const setCustomSize = useCallback(
    (v: CustomSizeRange | null) => setState((s) => ({ ...s, customSize: v, page: 1 })),
    [],
  );

  const reset = useCallback(() => {
    setState({
      search: "",
      assetTypes: [],
      clientId: "all",
      tags: [],
      tagsMode: "all",
      includeArchived: false,
      archivedOnly: false,
      ocrOnly: false,
      sort: "created_desc",
      page: 1,
      pageSize: 24,
      paginationMode: "pages",
      viewMode: "grid",
      showSizeColumn: false,
      sizeRange: "all",
      updatedRange: "all",
      customSize: null,
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
    setArchivedOnly,
    setOcrOnly,
    setSort,
    setPage,
    setPageSize,
    setPaginationMode,
    setViewMode,
    setShowSizeColumn,
    setSizeRange,
    setUpdatedRange,
    setCustomSize,
    reset,
    queryString,
  };
}

export type UseDamFiltersReturn = ReturnType<typeof useDamFilters>;
