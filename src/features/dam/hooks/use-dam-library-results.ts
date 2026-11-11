import { useMemo, useRef, useState, useEffect } from "react";
import { useAssets, type Asset } from "./use-assets";
import { SORT_OPTIONS, SIZE_RANGE_OPTIONS, UPDATED_RANGE_OPTIONS } from "../lib/dam-constants";
import type { DamFiltersState } from "./use-dam-filters";

export function useDamLibraryResults(
  organizationId: string,
  filtersState: DamFiltersState,
  debouncedSearch: string,
) {
  const {
    sort,
    sizeRange,
    updatedRange,
    customSize,
    assetTypes,
    clientId,
    tags: selectedTags,
    tagsMode,
    includeArchived,
    archivedOnly,
    page,
    pageSize,
    paginationMode,
  } = filtersState;

  const filters = useMemo(() => {
    const opt = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[1];
    const range = SIZE_RANGE_OPTIONS.find((o) => o.value === sizeRange);
    const updRange = UPDATED_RANGE_OPTIONS.find((o) => o.value === updatedRange);
    const updatedAfter = updRange?.hours
      ? new Date(Date.now() - updRange.hours * 60 * 60 * 1000).toISOString()
      : undefined;

    const minSize = customSize ? (customSize.minBytes ?? undefined) : range?.min;
    const maxSize = customSize ? (customSize.maxBytes ?? undefined) : range?.max;

    return {
      assetTypes: assetTypes.length > 0 ? assetTypes : undefined,
      clientId: clientId === "all" ? undefined : clientId === "none" ? null : clientId,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      tagsMode,
      includeArchived: archivedOnly ? true : includeArchived,
      archivedOnly,
      search: debouncedSearch.trim() || undefined,
      sortBy: opt.sortBy,
      sortDir: opt.sortDir,
      page,
      pageSize,
      minSize,
      maxSize,
      updatedAfter,
    };
  }, [
    assetTypes,
    clientId,
    selectedTags,
    tagsMode,
    includeArchived,
    archivedOnly,
    debouncedSearch,
    sort,
    page,
    pageSize,
    sizeRange,
    updatedRange,
    customSize,
  ]);

  const { assets, total, totalPages, isLoading, isFetching, restore } = useAssets(
    organizationId,
    filters,
  );

  const [loadedPage, setLoadedPage] = useState<number>(page);
  useEffect(() => {
    if (!isFetching) setLoadedPage(page);
  }, [isFetching, page]);

  const isPaginating = isFetching && !isLoading && loadedPage !== page;

  const lastTotalsRef = useRef<{
    total: number;
    totalPages: number;
    page: number;
    pageSize: number;
    displayedLen: number;
  } | null>(null);
  if (!isLoading) {
    lastTotalsRef.current = {
      total,
      totalPages,
      page,
      pageSize,
      displayedLen: assets.length,
    };
  }

  const [accumulated, setAccumulated] = useState<Asset[]>([]);
  useEffect(() => {
    if (paginationMode !== "loadmore") return;
    if (isLoading) return;
    if (page === 1) {
      setAccumulated(assets);
    } else {
      setAccumulated((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const next = [...prev, ...assets.filter((a) => !existingIds.has(a.id))];
        return next;
      });
    }
  }, [assets, isLoading, page, paginationMode]);

  const displayedAssets = paginationMode === "loadmore" ? accumulated : assets;
  const hasMore = paginationMode === "loadmore" && page < totalPages;

  return {
    assets,
    total,
    totalPages,
    isLoading,
    isFetching,
    isPaginating,
    restore,
    displayedAssets,
    hasMore,
    stable: lastTotalsRef.current,
    filters,
    setAccumulated,
  };
}
