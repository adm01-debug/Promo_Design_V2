import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Archive, ArchiveRestore, FolderArchive, LayoutGrid, List, Plus, Eye, ChevronDown, Loader2, FilterX, PanelRight, History, X, AlertCircle, Link2, ScanText, HardDrive, ArrowUpDown, RotateCcw, Check, Copy } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useAssets, MIN_SEARCH_LENGTH, type Asset, type AssetType } from "../hooks/use-assets";
import { AssetCard } from "../components/AssetCard";
import { AssetUploadDialog } from "../components/AssetUploadDialog";
import { AssetDetailDrawer } from "../components/AssetDetailDrawer";
import { TagFilter } from "../components/TagFilter";
import { AssetListView } from "../components/AssetListView";
import { ActiveFiltersBar } from "../components/ActiveFiltersBar";
import { SavedSearchesMenu } from "../components/SavedSearchesMenu";
import type { SavedFiltersPayload } from "../hooks/use-saved-searches";
import { QuickPreviewPanel } from "../components/QuickPreviewPanel";
import { useQuickPreview } from "../hooks/use-quick-preview";
import { useDebounce } from "@/hooks/use-debounce";
import { readLastPreviewAsset, clearLastPreviewAsset, peekLastPreviewAssetRaw } from "./DamPreviewPage";
import { ResultsPagination } from "@/components/ResultsPagination";
import { LibraryExportMenu } from "../components/LibraryExportMenu";
import { LibraryActivityDialog } from "../components/LibraryActivityDialog";
import { BatchOcrDialog } from "../components/BatchOcrDialog";
import { JumpToPage } from "../components/JumpToPage";
import { AssetGridSkeleton } from "../components/AssetGridSkeleton";
import { SizeRangeFilter, type CustomSizeRange } from "../components/SizeRangeFilter";
import { useDamFilters } from "../hooks/use-dam-filters";
import { useDamLibraryResults } from "../hooks/use-dam-library-results";
import { 
  TYPES, 
  SORT_OPTIONS, 
  SIZE_RANGE_OPTIONS, 
  UPDATED_RANGE_OPTIONS,
  VALID_ASSET_TYPES,
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
  TAGS_MODE_KEY
} from "../lib/dam-constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


function writeLS(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null || value === "") localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* ignore */ }
}


export default function DamLibraryPage() {
  const { currentOrgId, can } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const [searchParams] = useSearchParams();

  const {
    state,
    setSearch,
    setAssetTypes,
    setClientId,
    setTags: setSelectedTags,
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
    reset: resetFilters,
  } = useDamFilters();

  const {
    search,
    assetTypes,
    clientId,
    tags: selectedTags,
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
  } = state;

  const [activityOpen, setActivityOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const {
    assets,
    total,
    totalPages,
    isLoading,
    isFetching,
    isPaginating,
    restore,
    displayedAssets,
    hasMore,
    stable,
    filters,
    setAccumulated,
  } = useDamLibraryResults(currentOrgId || "", state, debouncedSearch);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [batchOcrOpen, setBatchOcrOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const handleResetPreferences = () => {
    resetFilters();
    setResetOpen(false);
    toast.success("Preferências redefinidas", {
      description: "Filtros, toggles e paginação voltaram ao padrão.",
    });
  };


  // "Continue where you left off" — last asset viewed in /dam/preview.
  // The optional `?highlight=<assetId>` URL param takes precedence over the
  // localStorage entry, so deep links from /dam/preview keep working even when
  // the user cleared their session or opens the link on a different device.
  const highlightParam = searchParams.get("highlight");
  const [lastPreviewAssetId, setLastPreviewAssetId] = useState<string | null>(
    () => highlightParam ?? readLastPreviewAsset()
  );
  const highlightedRef = useRef<string | null>(null);
  const didShowExpiredToastRef = useRef(false);
  const [fallbackDismissed, setFallbackDismissed] = useState(false);

  // Keep state in sync if the user navigates with a different `highlight=` value
  // (e.g. clicking another shared link without a full reload). Strips the param
  // from the URL afterwards so reload doesn't replay an outdated highlight.
  useEffect(() => {
    if (!highlightParam) return;
    setLastPreviewAssetId(highlightParam);
    setFallbackDismissed(false);
    highlightedRef.current = null;
    const next = new URLSearchParams(searchParams);
    next.delete("highlight");
    setSearchParams(next, { replace: true });
  }, [highlightParam, searchParams, setSearchParams]);

  // One-time toast on mount when the persisted "last preview" entry has expired (>24h).
  useEffect(() => {
    if (didShowExpiredToastRef.current) return;
    const { expired } = peekLastPreviewAssetRaw();
    if (expired) {
      didShowExpiredToastRef.current = true;
      clearLastPreviewAsset();
      setLastPreviewAssetId(null);
      toast("Sessão de pré-visualização expirada", {
        description: "Sua última sessão tem mais de 24h. Começando do início.",
        duration: 4000,
      });
    }
  }, []);

  const hasActiveFilters =
    debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ||
    assetTypes.length > 0 ||
    clientId !== "all" ||
    selectedTags.length > 0 ||
    includeArchived ||
    customSize !== null ||
    sizeRange !== "all";

  const canUpload = can(["owner", "admin", "designer"]);

  const clearAllFilters = () => {
    setSearch("");
    setAssetTypes([]);
    setClientId("all");
    setSelectedTags([]);
    setIncludeArchived(false);
    setSizeRange("all");
    setUpdatedRange("all");
    setCustomSize(null);
  };




  const handleRestore = async (asset: Asset) => {
    try {
      await restore.mutateAsync(asset.id);
      toast.success(`"${asset.name}" restaurado`, {
        description: "O asset voltou à biblioteca ativa.",
      });
    } catch (e) {
      toast.error(`Falha ao restaurar: ${e instanceof Error ? e.message : "erro"}`);
    }
  };


  // Keyboard shortcuts for pagination: ← / → (or J/K) navigate pages,
  // Home / End jump to first/last page. Disabled in load-more mode and while typing.
  useEffect(() => {
    if (paginationMode !== "pages") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;
      if (totalPages <= 1) return;
      switch (e.key) {
        case "ArrowLeft":
        case "j":
        case "J":
          if (page > 1) {
            e.preventDefault();
            setPage((p) => Math.max(1, p - 1));
          }
          break;
        case "ArrowRight":
        case "k":
        case "K":
          if (page < totalPages) {
            e.preventDefault();
            setPage((p) => Math.min(totalPages, p + 1));
          }
          break;
        case "Home":
          if (page !== 1) {
            e.preventDefault();
            setPage(1);
          }
          break;
        case "End":
          if (page !== totalPages) {
            e.preventDefault();
            setPage(totalPages);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, totalPages, paginationMode]);

  // Accumulate results in load-more mode
  useEffect(() => {
    if (paginationMode !== "loadmore") return;
    if (isLoading) return;
    if (page === 1) {
      setAccumulated(assets);
    } else {
      setAccumulated((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const merged = [...prev];
        for (const a of assets) if (!seen.has(a.id)) merged.push(a);
        return merged;
      });
    }
  }, [assets, page, paginationMode, isLoading]);

  const baseAssets = paginationMode === "loadmore" ? accumulated : assets;
  const displayedAssets = useMemo(
    () => (ocrOnly ? baseAssets.filter((a) => a.ocr_match === true) : baseAssets),
    [baseAssets, ocrOnly],
  );
  const hasMore = paginationMode === "loadmore" && displayedAssets.length < total;
  const ocrFilteredOut = ocrOnly ? baseAssets.length - displayedAssets.length : 0;

  // Compose a single SR-only status string (one sentence per phase) so screen
  // readers receive a clear, non-overlapping announcement for every loading,
  // updating, and pagination transition.
  useEffect(() => {
    let next = "";
    if (isLoading && displayedAssets.length === 0) {
      next = "Carregando assets…";
    } else if (isPaginating) {
      next = paginationMode === "pages"
        ? `Carregando página ${page} de ${totalPages || 1}…`
        : "Carregando mais assets…";
    } else if (isFetching && !isLoading) {
      next = "Atualizando lista de assets…";
    } else if (total === 0) {
      next = hasActiveFilters
        ? "Nenhum asset corresponde aos filtros."
        : "Nenhum asset encontrado.";
    } else {
      const fmt = (n: number) => n.toLocaleString("pt-BR");
      const noun = total === 1 ? "asset" : "assets";
      if (paginationMode === "pages") {
        const from = (page - 1) * pageSize + 1;
        const to = Math.min(page * pageSize, total);
        next = `Mostrando ${fmt(from)} a ${fmt(to)} de ${fmt(total)} ${noun}${hasActiveFilters ? ", filtrados" : ""}.`;
      } else {
        next = `Mostrando ${fmt(displayedAssets.length)} de ${fmt(total)} ${noun}${hasActiveFilters ? ", filtrados" : ""}.`;
      }
    }
    setA11yStatus((prev) => (prev === next ? prev : next));
  }, [
    isLoading,
    isFetching,
    isPaginating,
    displayedAssets.length,
    total,
    page,
    pageSize,
    totalPages,
    paginationMode,
    hasActiveFilters,
  ]);

  // Restore previously pinned Quick Preview asset once the asset list is loaded.
  useEffect(() => {
    if (displayedAssets.length === 0) return;
    quickPreview.hydratePinFromAssets(displayedAssets);
  }, [displayedAssets, quickPreview]);

  // Keyboard navigation for Quick Preview: ↑/↓ moves selection, Space pins, Enter opens details.
  // Active only when Quick Preview is enabled and the user isn't typing in an input/textarea.
  useEffect(() => {
    if (!quickPreview.enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (displayedAssets.length === 0) return;

      const activeId = quickPreview.activeAsset?.id ?? null;
      const currentIdx = activeId ? displayedAssets.findIndex((a) => a.id === activeId) : -1;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx =
          currentIdx === -1
            ? e.key === "ArrowDown" ? 0 : displayedAssets.length - 1
            : Math.min(displayedAssets.length - 1, Math.max(0, currentIdx + delta));
        const nextAsset = displayedAssets[nextIdx];
        if (nextAsset) {
          quickPreview.setActiveAsset(nextAsset);
          // Bring the card into view so the keyboard selection is always visible
          requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[data-asset-id="${nextAsset.id}"]`);
            el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
        return;
      }

      if (e.key === " " || e.code === "Space") {
        if (!quickPreview.activeAsset) return;
        e.preventDefault();
        quickPreview.togglePin(quickPreview.activeAsset);
        return;
      }

      if (e.key === "Enter") {
        if (!quickPreview.activeAsset) return;
        e.preventDefault();
        setSelected(quickPreview.activeAsset);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [quickPreview, displayedAssets]);

  const lastPreviewAsset = useMemo(
    () => (lastPreviewAssetId ? displayedAssets.find((a) => a.id === lastPreviewAssetId) ?? null : null),
    [displayedAssets, lastPreviewAssetId],
  );

  // Scroll to & briefly highlight the last previewed asset once it's in the loaded list.
  useEffect(() => {
    if (!lastPreviewAssetId) return;
    if (isLoading) return;
    if (highlightedRef.current === lastPreviewAssetId) return;
    if (!lastPreviewAsset) return;

    let canceled = false;
    let removeHighlightTimer: number | undefined;

    const highlight = (el: HTMLElement) => {
      highlightedRef.current = lastPreviewAssetId;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background", "transition-all");
      removeHighlightTimer = window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
      }, 2000);
    };

    /**
     * Try to find the card; if missing, advance pagination (load-more) or jump
     * to the right page (pages mode) so the asset becomes part of the rendered
     * list. Polls a few times with a hard cap to avoid infinite loops.
     */
    const attempt = (tries: number) => {
      if (canceled) return;
      const el = document.querySelector<HTMLElement>(`[data-asset-id="${lastPreviewAssetId}"]`);
      if (el) {
        highlight(el);
        return;
      }
      if (tries <= 0) return;

      // Find the asset's position inside the full filtered set.
      const idx = displayedAssets.findIndex((a) => a.id === lastPreviewAssetId);

      if (paginationMode === "pages" && idx >= 0) {
        const targetPage = Math.floor(idx / pageSize) + 1;
        if (targetPage !== page && targetPage >= 1 && targetPage <= totalPages) {
          setPage(targetPage);
          // Wait for re-render then retry.
          window.setTimeout(() => attempt(tries - 1), 200);
          return;
        }
      } else if (paginationMode === "loadmore" && hasMore) {
        // Load next batch then retry.
        setPage((p) => p + 1);
        window.setTimeout(() => attempt(tries - 1), 300);
        return;
      }

      // Asset known to exist in displayedAssets but DOM not yet ready (virtualized
      // list, late mount, etc.) — retry on next animation frame.
      if (idx >= 0) {
        requestAnimationFrame(() => attempt(tries - 1));
      }
    };

    attempt(8);

    return () => {
      canceled = true;
      if (removeHighlightTimer !== undefined) window.clearTimeout(removeHighlightTimer);
    };
  }, [
    lastPreviewAssetId,
    lastPreviewAsset,
    isLoading,
    displayedAssets,
    paginationMode,
    page,
    pageSize,
    totalPages,
    hasMore,
  ]);

  const dismissLastPreview = () => {
    clearLastPreviewAsset();
    setLastPreviewAssetId(null);
    highlightedRef.current = null;
  };

  const archivedCount = useMemo(
    () => displayedAssets.filter((a) => a.is_archived).length,
    [displayedAssets],
  );

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    displayedAssets.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [displayedAssets]);

  const currentSavedFilters: SavedFiltersPayload = useMemo(() => ({
    _v: 1,
    search: debouncedSearch.trim(),
    assetTypes,
    clientId,
    tags: selectedTags,
    tagsMode,
    includeArchived,
    sort,
  }), [debouncedSearch, assetTypes, clientId, selectedTags, tagsMode, includeArchived, sort]);

  const applySavedFilters = (snap: SavedFiltersPayload) => {
    setSearch(snap.search ?? "");
    setAssetTypes(snap.assetTypes ?? []);
    setClientId((snap.clientId as typeof clientId) ?? "all");
    setSelectedTags(snap.tags ?? []);
    setTagsMode(snap.tagsMode ?? "all");
    setIncludeArchived(Boolean(snap.includeArchived));
    setSort((snap.sort as SortValue) ?? "created_desc");
    setPage(1);
    setAccumulated([]);
  };

  if (!currentOrgId) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <FolderArchive className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-1">Selecione uma organização</h2>
          <p className="text-sm text-muted-foreground">
            A biblioteca de assets é compartilhada por organização.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderArchive className="w-6 h-6" />
            Biblioteca de Assets
          </h1>
          <p className="text-sm text-muted-foreground">
            Logos, artes, fotos e mockups da organização
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sort !== "created_desc" && sort !== "relevance" && (
            <Badge
              variant="outline"
              className="gap-1 pr-1 border-dashed cursor-pointer hover:bg-muted/40 transition"
              onClick={() => setSort("relevance")}
              title="Resetar para Relevância"
              role="button"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span className="text-xs">
                Ordenação: {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSort("relevance");
                }}
                className="ml-1 rounded hover:bg-background/50 p-0.5"
                aria-label="Resetar ordenação para Relevância"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <SavedSearchesMenu currentFilters={currentSavedFilters} onApply={applySavedFilters} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              const q = debouncedSearch.trim();
              if (q) params.set("q", q);
              if (assetTypes.length > 0) params.set("type", assetTypes.join(","));
              if (clientId !== "all") params.set("client", clientId);
              if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
              if (selectedTags.length > 1 && tagsMode !== "all") params.set("tagsMode", tagsMode);
              if (sort !== "created_desc") params.set("sort", sort);
              if (includeArchived) params.set("archived", "1");
              if (archivedOnly) params.set("archivedOnly", "1");
              if (paginationMode === "loadmore") params.set("mode", "loadmore");
              if (pageSize !== 24) params.set("pageSize", String(pageSize));
              if (page > 1 && paginationMode === "pages") params.set("page", String(page));
              const qs = params.toString();
              const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
              const copy = async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copiado", { description: "Cole para compartilhar com os filtros atuais." });
                } catch {
                  // Fallback: prompt so user can copy manually
                  window.prompt("Copie o link compartilhável:", url);
                }
              };
              copy();
            }}
            title="Copiar link com filtros atuais"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActivityOpen(true)}
            title="Atividade recente da biblioteca"
          >
            <History className="w-4 h-4 mr-2" />
            Atividade
          </Button>
          <LibraryExportMenu
            assets={assets}
            clients={clients}
            total={total}
            organizationId={currentOrgId}
            filters={filters}
            filtersSummary={{
              search: debouncedSearch.trim() || undefined,
              assetTypes: assetTypes.length > 0 ? assetTypes : undefined,
              clientName:
                clientId === "all"
                  ? undefined
                  : clientId === "none"
                    ? "(Sem cliente)"
                    : clients.find((c) => c.id === clientId)?.name,
              tags: selectedTags.length > 0 ? selectedTags : undefined,
              tagsMode,
              includeArchived,
              archivedOnly,
              ocrOnly,
              minSize: customSize?.minBytes ?? undefined,
              maxSize: customSize?.maxBytes ?? undefined,
              sizeUnit: customSize?.unit,
              sizeRangeLabel:
                sizeRange !== "all" && !customSize
                  ? SIZE_RANGE_OPTIONS.find((o) => o.value === sizeRange)?.label
                  : undefined,
              updatedRangeLabel:
                updatedRange !== "all"
                  ? UPDATED_RANGE_OPTIONS.find((o) => o.value === updatedRange)?.label
                  : undefined,
              pageSize,
              viewMode,
              sortLabel: SORT_OPTIONS.find((s) => s.value === sort)?.label,
            }}
          />
          <Toggle
            pressed={quickPreview.enabled}
            onPressedChange={quickPreview.toggleEnabled}
            size="sm"
            variant="outline"
            aria-label="Prévia rápida"
            aria-pressed={quickPreview.enabled}
            title="Prévia rápida"
          >
            <PanelRight className="w-4 h-4 mr-2" />
            Prévia
          </Toggle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={ocrOnly}
                onPressedChange={setOcrOnly}
                size="sm"
                variant="outline"
                aria-label="Apenas correspondências OCR"
                aria-pressed={ocrOnly}
                disabled={debouncedSearch.trim().length < MIN_SEARCH_LENGTH}
              >
                <ScanText className="w-4 h-4 mr-2" />
                Só OCR
                {ocrOnly && ocrFilteredOut > 0 && (
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
                    -{ocrFilteredOut}
                  </Badge>
                )}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {debouncedSearch.trim().length < MIN_SEARCH_LENGTH
                ? "Faça uma busca para destacar correspondências por OCR"
                : "Mostrar apenas resultados encontrados pelo texto interno (OCR)"}
            </TooltipContent>
          </Tooltip>
          <Button variant="outline" asChild>
            <Link
              to={(() => {
                const sp = new URLSearchParams();
                if (debouncedSearch.trim()) sp.set("q", debouncedSearch.trim());
                if (assetTypes.length > 0) sp.set("type", assetTypes.join(","));
                if (clientId !== "all") sp.set("client", clientId);
                if (selectedTags.length > 0) sp.set("tags", selectedTags.join(","));
                if (selectedTags.length > 1) sp.set("tagsMode", tagsMode);
                if (includeArchived) sp.set("archived", "1");
                if (sort !== "created_desc") sp.set("sort", sort);
                const lastId = readLastPreviewAsset();
                if (lastId) sp.set("asset", lastId);
                const qs = sp.toString();
                return `/dam/preview${qs ? `?${qs}` : ""}`;
              })()}
            >
              <Eye className="w-4 h-4 mr-2" /> Pré-visualizar
            </Link>
          </Button>
          {can(["owner", "admin", "designer"]) && (
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Novo asset
            </Button>
          )}
          {can(["owner", "admin", "designer"]) && (
            <Button
              variant="outline"
              onClick={() => setBatchOcrOpen(true)}
              title="Reprocessar OCR para vários assets visíveis"
            >
              <ScanText className="w-4 h-4 mr-2" /> OCR em lote
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setResetOpen(true)}
                aria-label="Redefinir preferências da biblioteca"
                data-testid="dam-reset-preferences"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redefinir preferências (filtros, toggles, paginação)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                aria-label="Copiar link da visualização atual"
                data-testid="dam-copy-link"
              >
                {copiedLink ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {copiedLink ? "Copiado!" : "Copiar link com filtros atuais"}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Single SR-only live region for all loading/pagination/result states.
          aria-atomic ensures the full sentence is read on each change. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="dam-a11y-status"
      >
        {a11yStatus}
      </div>

      {archivedFromUrlAtMount && includeArchived && !archivedUrlHintDismissed && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200"
          data-testid="dam-archived-url-hint"
        >
          <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Filtro <strong className="text-foreground font-medium">Arquivados</strong> aplicado pela URL
            (<code className="rounded bg-muted px-1 py-0.5 text-[10px]">?archived=1</code>).
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-[11px]"
            onClick={() => setIncludeArchived(false)}
          >
            Desativar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setArchivedUrlHintDismissed(true)}
            aria-label="Dispensar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {lastPreviewAsset && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <History className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Continuar de onde parou:</span>
          <span className="font-medium truncate">{lastPreviewAsset.name}</span>
          <Button variant="outline" size="sm" asChild className="ml-auto h-7">
            <Link
              to={(() => {
                const sp = new URLSearchParams();
                if (debouncedSearch.trim()) sp.set("q", debouncedSearch.trim());
                if (assetTypes.length > 0) sp.set("type", assetTypes.join(","));
                if (clientId !== "all") sp.set("client", clientId);
                if (selectedTags.length > 0) sp.set("tags", selectedTags.join(","));
                if (selectedTags.length > 1) sp.set("tagsMode", tagsMode);
                if (includeArchived) sp.set("archived", "1");
                if (sort !== "created_desc") sp.set("sort", sort);
                sp.set("asset", lastPreviewAsset.id);
                return `/dam/preview?${sp.toString()}`;
              })()}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Reabrir no preview
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={dismissLastPreview}
            aria-label="Descartar"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {!lastPreviewAsset && lastPreviewAssetId && !isLoading && !fallbackDismissed && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground truncate">
            O último asset visualizado não está nos resultados atuais (pode ter sido arquivado ou removido pelos filtros).
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7"
            onClick={clearAllFilters}
          >
            <FilterX className="w-3.5 h-3.5 mr-1.5" /> Limpar filtros
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => {
              clearLastPreviewAsset();
              setLastPreviewAssetId(null);
              setFallbackDismissed(true);
            }}
          >
            Descartar
          </Button>
        </div>
      )}

      <div
        className="flex flex-wrap gap-3 items-center"
        data-dam-filters-bar="true"
        onKeyDown={(e) => {
          // Shortcut: press "A" while focus is anywhere on the filter bar
          // (but NOT inside an editable control) to toggle "Arquivados".
          if (e.key !== "a" && e.key !== "A") return;
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const tag = target.tagName;
          const isEditable =
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT" ||
            target.isContentEditable ||
            target.getAttribute("role") === "combobox" ||
            target.getAttribute("role") === "textbox";
          if (isEditable) return;
          e.preventDefault();
          handleIncludeArchivedToggle(!includeArchived);
        }}
      >
        <div className="flex flex-col max-w-xs w-full">
          <Input
            placeholder="Buscar por nome, descrição, tag ou texto da imagem (OCR)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.trim().length > 0 && search.trim().length < MIN_SEARCH_LENGTH && (
            <p className="text-[11px] text-muted-foreground pt-0.5">
              Digite ao menos {MIN_SEARCH_LENGTH} caracteres para buscar
            </p>
          )}
        </div>
        <Select value={clientId} onValueChange={(v) => setClientId(v as typeof clientId)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            <SelectItem value="none">Sem cliente (geral)</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <Select
            value={sizeRange}
            onValueChange={(v) => {
              setSizeRange(v as SizeRangeKey);
              // Choosing a preset clears the custom range to keep one source of truth.
              if (customSize) setCustomSize(null);
            }}
            disabled={customSize !== null}
          >
            <SelectTrigger
              className="w-44"
              aria-label="Filtrar por tamanho (predefinido)"
              title={customSize ? "Filtro personalizado ativo — limpe para usar predefinidos" : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SizeRangeFilter
            value={customSize}
            onChange={(next) => {
              setCustomSize(next);
              // Choosing a custom range clears the preset to keep one source of truth.
              if (next && sizeRange !== "all") setSizeRange("all");
            }}
          />
          <Select value={updatedRange} onValueChange={(v) => setUpdatedRange(v as UpdatedRangeKey)}>
            <SelectTrigger className="w-44" aria-label="Filtrar por data de modificação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UPDATED_RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.filter((o) => o.value !== "relevance" || debouncedSearch.trim().length >= MIN_SEARCH_LENGTH).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
              <SelectItem value="96">96</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip
            open={archivedTooltipOpen || undefined}
            onOpenChange={(o) => {
              // Only allow programmatic open via our first-toggle handler.
              // Hover/focus opens are suppressed once the hint has been shown.
              if (!o) setArchivedTooltipOpen(false);
            }}
          >
            <TooltipTrigger asChild>
              <Toggle
                pressed={includeArchived}
                onPressedChange={handleIncludeArchivedToggle}
                size="sm"
                variant="outline"
                aria-label={
                  includeArchived
                    ? "Ocultar itens arquivados (atalho: A · preferência lembrada entre sessões)"
                    : "Mostrar itens arquivados (atalho: A · preferência lembrada entre sessões)"
                }
                data-testid="dam-archived-toggle"
                data-state-persisted="true"
                className={cn(
                  "gap-2 transition-colors",
                  // Keyboard focus: high-contrast 2px ring offset from the surface
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  // Active state: stronger contrast (was primary/10 → primary/20)
                  // and a fully opaque primary border so it reads on dark/light themes.
                  includeArchived &&
                    "bg-primary/20 text-primary border-primary hover:bg-primary/25 data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:border-primary",
                )}
              >
                {includeArchived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {includeArchived ? "Incluindo arquivados" : "Incluir arquivados"}
                </span>
                {includeArchived && archivedCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/15 text-primary border-primary/30 text-[10px] h-5 px-1.5"
                    aria-label={`${archivedCount} arquivado${archivedCount > 1 ? "s" : ""} visíveis`}
                  >
                    {archivedCount}
                  </Badge>
                )}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[220px]">
              {includeArchived
                ? "Itens arquivados estão visíveis nesta listagem. Clique para ocultar."
                : "Mostrar também itens arquivados. Sua preferência fica salva entre sessões."}
            </TooltipContent>
          </Tooltip>
          {includeArchived && archivedCount === 0 && displayedAssets.length > 0 && (
            <span
              role="status"
              data-testid="dam-archived-zero-hint"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground rounded-md border border-dashed border-border bg-muted/30 px-2 py-1 animate-in fade-in duration-200"
              title="Nenhum dos itens listados está arquivado. Ajuste filtros ou desative o toggle."
            >
              <AlertCircle className="w-3 h-3" />
              <span>Nenhum arquivado nesta visualização</span>
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={archivedOnly}
                onPressedChange={setArchivedOnly}
                size="sm"
                variant="outline"
                aria-label={
                  archivedOnly
                    ? "Sair do modo arquivados"
                    : "Mostrar apenas itens arquivados"
                }
                data-testid="dam-archived-only-toggle"
                className={cn(
                  "gap-2 transition-colors",
                  archivedOnly &&
                    "bg-destructive/10 text-destructive border-destructive/40 hover:bg-destructive/15 data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive",
                )}
              >
                <Archive className="w-4 h-4" />
                <span className="font-medium">
                  {archivedOnly ? "Modo arquivados" : "Apenas arquivados"}
                </span>
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[240px]">
              {archivedOnly
                ? "Mostrando somente arquivados. Use “Restaurar” para reativar."
                : "Filtra a biblioteca para mostrar apenas itens arquivados."}
            </TooltipContent>
          </Tooltip>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "grid" | "list")}
            size="sm"
          >
            <ToggleGroupItem value="grid" aria-label="Grid">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Lista">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {viewMode === "list" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  pressed={showSizeColumn}
                  onPressedChange={setShowSizeColumn}
                  aria-label="Mostrar coluna Tamanho"
                >
                  <HardDrive className="w-4 h-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {showSizeColumn ? "Ocultar coluna Tamanho" : "Mostrar coluna Tamanho"}
              </TooltipContent>
            </Tooltip>
          )}
          <ToggleGroup
            type="single"
            value={paginationMode}
            onValueChange={(v) => {
              if (!v) return;
              setPaginationMode(v as PaginationMode);
              setPage(1);
              setAccumulated([]);
            }}
            size="sm"
          >
            <ToggleGroupItem value="pages" aria-label="Páginas" title="Paginação numerada">
              1·2·3
            </ToggleGroupItem>
            <ToggleGroupItem value="loadmore" aria-label="Carregar mais" title="Carregar mais">
              <ChevronDown className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => {
          const isAll = t.value === "all";
          const active = isAll ? assetTypes.length === 0 : assetTypes.includes(t.value as AssetType);
          return (
            <Badge
              key={t.value}
              variant={active ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => {
                if (isAll) {
                  setAssetTypes([]);
                } else {
                  const v = t.value as AssetType;
                  setAssetTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
                }
              }}
              role="button"
              aria-pressed={active}
            >
              {t.label}
            </Badge>
          );
        })}
      </div>

      {availableTags.length > 0 && (
        <TagFilter
          availableTags={availableTags}
          selected={selectedTags}
          onChange={setSelectedTags}
          mode={tagsMode}
          onModeChange={setTagsMode}
        />
      )}

      <ActiveFiltersBar
        search={debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? debouncedSearch.trim() : undefined}
        onClearSearch={() => setSearch("")}
        assetTypes={assetTypes}
        onRemoveType={(t) => setAssetTypes((prev) => prev.filter((x) => x !== t))}
        clientId={clientId}
        clientLabel={clients.find((c) => c.id === clientId)?.name}
        onClearClient={() => setClientId("all")}
        tags={selectedTags}
        tagsMode={tagsMode}
        onRemoveTag={(t) => setSelectedTags((prev) => prev.filter((x) => x !== t))}
        includeArchived={includeArchived}
        onClearArchived={() => setIncludeArchived(false)}
        onClearAll={clearAllFilters}
      />

      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        {(() => {
          // Prefer last-known stable totals so the counter doesn't flicker on refetch.
          const src = !isLoading
            ? { total, page, pageSize, displayedLen: assets.length }
            : stable
              ? { total: stable.total, page: stable.page, pageSize: stable.pageSize, displayedLen: stable.displayedLen }
              : null;
          if (!src) return <span aria-hidden="true">Carregando...</span>;
          if (src.total === 0) {
            return (
              <span>
                Nenhum asset {hasActiveFilters ? "corresponde aos filtros" : "encontrado"}
              </span>
            );
          }
          const fmt = (n: number) => n.toLocaleString("pt-BR");
          const from = (src.page - 1) * src.pageSize + 1;
          const to = Math.min(src.page * src.pageSize, src.total);
          const noun = src.total === 1 ? "asset" : "assets";
          const activeCount =
            (debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? 1 : 0) +
            (assetTypes.length > 0 ? 1 : 0) +
            (clientId !== "all" ? 1 : 0) +
            (selectedTags.length > 0 ? 1 : 0) +
            (includeArchived ? 1 : 0);
          return (
            <>
              <span data-testid="dam-results-counter">
                {paginationMode === "loadmore"
                  ? `Mostrando ${fmt(displayedAssets.length)} de ${fmt(src.total)} ${noun}${hasActiveFilters ? " (filtrados)" : ""}`
                  : `Mostrando ${fmt(from)}–${fmt(to)} de ${fmt(src.total)} ${noun}${hasActiveFilters ? " (filtrados)" : ""}`}
                {includeArchived && archivedCount > 0 && (
                  <>
                    {" · "}
                    <span data-testid="dam-archived-counter">
                      {archivedCount} arquivado{archivedCount > 1 ? "s" : ""}
                      {paginationMode === "pages" ? " nesta página" : ""}
                    </span>
                  </>
                )}
              </span>
              {hasActiveFilters && (
                <>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {activeCount} filtro{activeCount > 1 ? "s" : ""} ativo{activeCount > 1 ? "s" : ""}
                  </Badge>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[11px] underline text-muted-foreground hover:text-foreground transition-colors"
                  >
                    limpar
                  </button>
                </>
              )}
              {isFetching && !isLoading && (
                <span
                  className="inline-flex items-center gap-1 text-muted-foreground"
                  data-testid="dam-paginating-indicator"
                  aria-hidden="true"
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Atualizando…
                </span>
              )}
            </>
          );
        })()}
      </div>

      {(isLoading && displayedAssets.length === 0) || isPaginating ? (
        <AssetGridSkeleton viewMode={viewMode} count={pageSize} />
      ) : displayedAssets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {(() => {
            // Three distinct empty states with tailored CTAs:
            // 1) onlyArchivedExist: library has assets but all are archived and the user is hiding them
            // 2) hasActiveFilters: filters yield no matches
            // 3) trulyEmpty: library has zero assets at all
            const onlyArchivedExist =
              !hasActiveFilters && !includeArchived && archivedCount > 0;
            const variant: "filtered" | "archived-only" | "empty" = hasActiveFilters
              ? "filtered"
              : onlyArchivedExist
                ? "archived-only"
                : "empty";
            const Icon =
              variant === "empty" ? FolderArchive : variant === "filtered" ? FilterX : FolderArchive;
            const title =
              variant === "filtered"
                ? "Nenhum asset corresponde aos filtros"
                : variant === "archived-only"
                  ? "Todos os assets estão arquivados"
                  : "Sua biblioteca está vazia";
            const desc =
              variant === "filtered"
                ? "Tente remover algum filtro ou ajustar a busca."
                : variant === "archived-only"
                  ? `Existem ${archivedCount} asset${archivedCount > 1 ? "s" : ""} arquivado${archivedCount > 1 ? "s" : ""}. Inclua-os para visualizar.`
                  : "Faça upload do seu primeiro asset para começar.";
            return (
              <Card className="p-12 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Icon className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">{desc}</p>
                </div>
                {variant === "filtered" ? (
                  <Button variant="outline" onClick={clearAllFilters}>
                    <FilterX className="w-4 h-4 mr-2" /> Limpar filtros
                  </Button>
                ) : variant === "archived-only" ? (
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setIncludeArchived(true)}>
                      <FolderArchive className="w-4 h-4 mr-2" /> Mostrar arquivados
                    </Button>
                    {canUpload && (
                      <Button onClick={() => setUploadOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Fazer upload
                      </Button>
                    )}
                  </div>
                ) : canUpload ? (
                  <Button onClick={() => setUploadOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Fazer upload
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Você não tem permissão para fazer upload. Solicite acesso ao administrador.
                  </p>
                )}
              </Card>
            );
          })()}
        </motion.div>
      ) : (
        <div className={quickPreview.enabled ? "flex gap-4 items-start" : undefined}>
          <div
            className={cn(
              "flex-1 min-w-0 relative transition-opacity duration-200",
              isFetching && !isLoading && !isPaginating && "pointer-events-none",
            )}
            aria-busy={isFetching && !isLoading}
          >
            {/* Background revalidation: overlay reusable skeleton on top of
                the cached list so the user perceives the refresh consistently
                without unmounting current data. The cold-start case is handled
                above (AssetGridSkeleton, no overlay). */}
            {isFetching && !isLoading && !isPaginating && (
              <AssetGridSkeleton
                viewMode={viewMode}
                count={Math.min(displayedAssets.length || pageSize, pageSize)}
                overlay
                label="Atualizando lista de assets"
              />
            )}
            {viewMode === "list" ? (
              <AssetListView
                assets={displayedAssets}
                clients={clients}
                onSelect={setSelected}
                onRestore={canUpload ? handleRestore : undefined}
                showSize={showSizeColumn}
                sizeSortDir={
                  sort === "size_desc" ? "desc" : sort === "size_asc" ? "asc" : null
                }
                onToggleSizeSort={() => {
                  setSort((prev) =>
                    prev === "size_desc" ? "size_asc" : "size_desc",
                  );
                }}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedAssets.map((a) => (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    isQuickActive={quickPreview.enabled && quickPreview.activeAsset?.id === a.id}
                    onHover={quickPreview.enabled ? () => quickPreview.setHoverAsset(a) : undefined}
                    onHoverEnd={quickPreview.enabled ? () => quickPreview.setHoverAsset(null) : undefined}
                    onRestore={canUpload ? handleRestore : undefined}
                    onClick={() => {
                      if (quickPreview.enabled) {
                        quickPreview.togglePin(a);
                      } else {
                        setSelected(a);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          {quickPreview.enabled && (
            <QuickPreviewPanel
              asset={quickPreview.activeAsset}
              pinned={!!quickPreview.activeAsset && quickPreview.pinnedId === quickPreview.activeAsset.id}
              onTogglePin={() => {
                if (quickPreview.activeAsset) quickPreview.togglePin(quickPreview.activeAsset);
              }}
              onOpenDetails={() => {
                if (quickPreview.activeAsset) setSelected(quickPreview.activeAsset);
              }}
              clients={clients}
              onApplyTag={(tag) => {
                setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
              }}
              sortLabel={SORT_OPTIONS.find((o) => o.value === sort)?.label}
            />
          )}
        </div>
      )}

      {paginationMode === "loadmore" && hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...</>
            ) : (
              <>Carregar mais ({total - displayedAssets.length} restantes)</>
            )}
          </Button>
        </div>
      )}

      {paginationMode === "pages" && total > 0 && (
        <nav
          aria-label="Paginação de assets"
          className="space-y-1"
        >
          <ResultsPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            itemNoun="asset"
            pageSizeOptions={[12, 24, 48, 96]}
            onPageSizeChange={setPageSize}
          />
          {totalPages > 1 && (
            <JumpToPage
              currentPage={page}
              totalPages={totalPages}
              onJump={setPage}
            />
          )}
          {totalPages > 1 && (
            <p className="text-[11px] text-muted-foreground text-right">
              Atalhos: <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">←</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">→</kbd> navegar ·{" "}
              <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">Home</kbd>{" "}
              <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px]">End</kbd> primeira/última
            </p>
          )}
        </nav>
      )}

      <AssetUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        organizationId={currentOrgId}
      />
      <AssetDetailDrawer
        asset={selected}
        onClose={() => setSelected(null)}
        onSelectAsset={(a) => setSelected(a)}
        searchQuery={debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? debouncedSearch.trim() : undefined}
      />
      <LibraryActivityDialog
        open={activityOpen}
        onOpenChange={setActivityOpen}
        organizationId={currentOrgId}
      />
      <BatchOcrDialog
        open={batchOcrOpen}
        onOpenChange={setBatchOcrOpen}
        assets={displayedAssets}
      />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir preferências da biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso limpa todas as preferências salvas neste navegador (busca, tipos,
              cliente, tags, ordenação, paginação, modo de visualização e os toggles
              <strong> Incluir arquivados</strong>, <strong>Apenas arquivados</strong> e
              <strong> Apenas com OCR</strong>) e volta tudo ao padrão. Seus assets
              não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPreferences}
              data-testid="dam-reset-preferences-confirm"
            >
              Redefinir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}