import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Archive, ArchiveRestore, FolderArchive, LayoutGrid, List, Plus, Eye, ChevronDown, Loader2, FilterX, PanelRight, History, X, AlertCircle } from "lucide-react";
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

const TYPES: { value: AssetType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "logo", label: "Logos" },
  { value: "art", label: "Artes" },
  { value: "photo", label: "Fotos" },
  { value: "mockup", label: "Mockups" },
  { value: "document", label: "Documentos" },
  { value: "other", label: "Outros" },
];

const VIEW_MODE_KEY = "dam-view-mode";
const PAGE_SIZE_KEY = "dam-page-size";
const PAGE_KEY = "dam-page";
const TAGS_MODE_KEY = "dam-tags-mode";
const INCLUDE_ARCHIVED_KEY = "dam-include-archived";
const PAGINATION_MODE_KEY = "dam-pagination-mode";
const SEARCH_KEY = "dam-search";
const ASSET_TYPES_KEY = "dam-asset-types";
const CLIENT_ID_KEY = "dam-client-id";
const TAGS_KEY = "dam-tags";
const SORT_KEY = "dam-sort";

const VALID_ASSET_TYPES: AssetType[] = ["logo", "art", "photo", "mockup", "document", "other"];

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

type PaginationMode = "pages" | "loadmore";

type SortValue = "relevance" | "created_desc" | "created_asc" | "name_asc" | "name_desc" | "size_desc" | "version_desc";
const SORT_OPTIONS: { value: SortValue; label: string; sortBy: "created_at" | "name" | "file_size" | "version" | "relevance"; sortDir: "asc" | "desc" }[] = [
  { value: "relevance", label: "Relevância", sortBy: "relevance", sortDir: "desc" },
  { value: "created_desc", label: "Mais recentes", sortBy: "created_at", sortDir: "desc" },
  { value: "created_asc", label: "Mais antigos", sortBy: "created_at", sortDir: "asc" },
  { value: "name_asc", label: "Nome A→Z", sortBy: "name", sortDir: "asc" },
  { value: "name_desc", label: "Nome Z→A", sortBy: "name", sortDir: "desc" },
  { value: "size_desc", label: "Maior arquivo", sortBy: "file_size", sortDir: "desc" },
  { value: "version_desc", label: "Versão", sortBy: "version", sortDir: "desc" },
];

export default function DamLibraryPage() {
  const { currentOrgId, can } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState<string>(() => searchParams.get("q") ?? readLS(SEARCH_KEY) ?? "");
  const debouncedSearch = useDebounce(search, 300);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>(() => {
    const raw = searchParams.get("type");
    const source = raw ?? readLS(ASSET_TYPES_KEY) ?? "";
    if (!source) return [];
    return source.split(",").filter((t): t is AssetType => VALID_ASSET_TYPES.includes(t as AssetType));
  });
  const [clientId, setClientId] = useState<string | "all" | "none">(() => {
    const raw = searchParams.get("client");
    if (!raw) {
      const ls = readLS(CLIENT_ID_KEY);
      return (ls as "all" | "none" | string) || "all";
    }
    if (raw === "all" || raw === "none") return raw;
    return raw;
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const raw = searchParams.get("tags");
    const source = raw ?? readLS(TAGS_KEY) ?? "";
    return source ? source.split(",").filter(Boolean) : [];
  });
  const [tagsMode, setTagsMode] = useState<"all" | "any">(() => {
    const fromUrl = searchParams.get("tagsMode");
    if (fromUrl === "all" || fromUrl === "any") return fromUrl;
    if (typeof window === "undefined") return "all";
    return (localStorage.getItem(TAGS_MODE_KEY) as "all" | "any") || "all";
  });
  const [includeArchived, setIncludeArchived] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const fromUrl = searchParams.get("archived");
    if (fromUrl === "1") return true;
    if (fromUrl === "0") return false;
    return localStorage.getItem(INCLUDE_ARCHIVED_KEY) === "1";
  });
  const [sort, setSort] = useState<SortValue>(() => {
    const fromUrl = searchParams.get("sort") as SortValue | null;
    if (fromUrl && SORT_OPTIONS.some((o) => o.value === fromUrl)) return fromUrl;
    const ls = readLS(SORT_KEY) as SortValue | null;
    if (ls && SORT_OPTIONS.some((o) => o.value === ls)) return ls;
    return "created_desc";
  });
  const [page, setPage] = useState<number>(() => {
    const fromUrl = Number(searchParams.get("page"));
    if (Number.isFinite(fromUrl) && fromUrl > 0) return fromUrl;
    if (typeof window === "undefined") return 1;
    const saved = Number(localStorage.getItem(PAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    const fromUrl = Number(searchParams.get("pageSize"));
    if ([24, 48, 96].includes(fromUrl)) return fromUrl;
    if (typeof window === "undefined") return 24;
    const saved = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return [24, 48, 96].includes(saved) ? saved : 24;
  });
  const [paginationMode, setPaginationMode] = useState<PaginationMode>(() => {
    const fromUrl = searchParams.get("mode");
    if (fromUrl === "loadmore" || fromUrl === "pages") return fromUrl;
    if (typeof window === "undefined") return "pages";
    return (localStorage.getItem(PAGINATION_MODE_KEY) as PaginationMode) || "pages";
  });
  const [accumulated, setAccumulated] = useState<Asset[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem(VIEW_MODE_KEY) as "grid" | "list") || "grid";
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const quickPreview = useQuickPreview();

  // "Continue where you left off" — last asset viewed in /dam/preview.
  const [lastPreviewAssetId, setLastPreviewAssetId] = useState<string | null>(() => readLastPreviewAsset());
  const highlightedRef = useRef<string | null>(null);
  const didShowExpiredToastRef = useRef(false);
  const [fallbackDismissed, setFallbackDismissed] = useState(false);

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
    includeArchived;

  const canUpload = can(["owner", "admin", "designer"]);

  const clearAllFilters = () => {
    setSearch("");
    setAssetTypes([]);
    setClientId("all");
    setSelectedTags([]);
    setIncludeArchived(false);
    writeLS(SEARCH_KEY, null);
    writeLS(ASSET_TYPES_KEY, null);
    writeLS(CLIENT_ID_KEY, null);
    writeLS(TAGS_KEY, null);
    writeLS(SORT_KEY, null);
  };

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  useEffect(() => {
    try { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); } catch { /* ignore */ }
  }, [pageSize]);

  useEffect(() => {
    try { localStorage.setItem(TAGS_MODE_KEY, tagsMode); } catch { /* ignore */ }
  }, [tagsMode]);

  useEffect(() => {
    try { localStorage.setItem(INCLUDE_ARCHIVED_KEY, includeArchived ? "1" : "0"); } catch { /* ignore */ }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (includeArchived) next.set("archived", "1");
      else next.delete("archived");
      return next;
    }, { replace: true });
  }, [includeArchived, setSearchParams]);

  useEffect(() => {
    try { localStorage.setItem(PAGINATION_MODE_KEY, paginationMode); } catch { /* ignore */ }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (paginationMode === "loadmore") next.set("mode", "loadmore");
      else next.delete("mode");
      return next;
    }, { replace: true });
  }, [paginationMode, setSearchParams]);

  // Persist filters to localStorage so they survive navigation back to /dam
  useEffect(() => {
    writeLS(SEARCH_KEY, debouncedSearch.trim() || null);
  }, [debouncedSearch]);
  useEffect(() => {
    writeLS(ASSET_TYPES_KEY, assetTypes.length > 0 ? assetTypes.join(",") : null);
  }, [assetTypes]);
  useEffect(() => {
    writeLS(CLIENT_ID_KEY, clientId !== "all" ? clientId : null);
  }, [clientId]);
  useEffect(() => {
    writeLS(TAGS_KEY, selectedTags.length > 0 ? selectedTags.join(",") : null);
  }, [selectedTags]);
  useEffect(() => {
    writeLS(SORT_KEY, sort !== "created_desc" ? sort : null);
  }, [sort]);

  // Sync page/pageSize with URL
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (page > 1 && paginationMode === "pages") next.set("page", String(page));
      else next.delete("page");
      if (pageSize !== 24) next.set("pageSize", String(pageSize));
      else next.delete("pageSize");
      return next;
    }, { replace: true });
  }, [page, pageSize, paginationMode, setSearchParams]);

  // Sync content filters (search, types, client, tags, tagsMode, sort) with URL
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const q = debouncedSearch.trim();
      if (q) next.set("q", q); else next.delete("q");
      if (assetTypes.length > 0) next.set("type", assetTypes.join(",")); else next.delete("type");
      if (clientId !== "all") next.set("client", clientId); else next.delete("client");
      if (selectedTags.length > 0) next.set("tags", selectedTags.join(",")); else next.delete("tags");
      if (selectedTags.length > 1 && tagsMode !== "all") next.set("tagsMode", tagsMode);
      else next.delete("tagsMode");
      if (sort !== "created_desc") next.set("sort", sort); else next.delete("sort");
      return next;
    }, { replace: true });
  }, [debouncedSearch, assetTypes, clientId, selectedTags, tagsMode, sort, setSearchParams]);

  // If user clears search while sorting by relevance, fall back to "Mais recentes"
  useEffect(() => {
    if (sort === "relevance" && !debouncedSearch.trim()) setSort("created_desc");
  }, [debouncedSearch, sort]);

  // Reset to page 1 when filters/search/sort/pageSize change
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [debouncedSearch, assetTypes, clientId, selectedTags, tagsMode, includeArchived, sort, pageSize]);

  const filters = useMemo(
    () => {
      const opt = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[1];
      return {
        assetTypes: assetTypes.length > 0 ? assetTypes : undefined,
        clientId: clientId === "all" ? undefined : clientId === "none" ? null : clientId,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        tagsMode,
        includeArchived,
        search: debouncedSearch.trim() || undefined,
        sortBy: opt.sortBy,
        sortDir: opt.sortDir,
        page,
        pageSize,
      };
    },
    [assetTypes, clientId, selectedTags, tagsMode, includeArchived, debouncedSearch, sort, page, pageSize],
  );

  const { assets, total, totalPages, isLoading } = useAssets(currentOrgId, filters);

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

  const displayedAssets = paginationMode === "loadmore" ? accumulated : assets;
  const hasMore = paginationMode === "loadmore" && displayedAssets.length < total;

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

    const el = document.querySelector<HTMLElement>(`[data-asset-id="${lastPreviewAssetId}"]`);
    if (!el) return;

    highlightedRef.current = lastPreviewAssetId;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background", "transition-all");
    const t = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    }, 2000);
    return () => window.clearTimeout(t);
  }, [lastPreviewAssetId, lastPreviewAsset, isLoading]);

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
          <SavedSearchesMenu currentFilters={currentSavedFilters} onApply={applySavedFilters} />
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
        </div>
      </header>

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

      <div className="flex flex-wrap gap-3 items-center">
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
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
              <SelectItem value="96">96</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={includeArchived}
                onPressedChange={setIncludeArchived}
                size="sm"
                variant="outline"
                aria-label={
                  includeArchived
                    ? "Ocultar itens arquivados (preferência lembrada entre sessões)"
                    : "Mostrar itens arquivados (preferência lembrada entre sessões)"
                }
                data-testid="dam-archived-toggle"
                data-state-persisted="true"
                className={cn(
                  "gap-2 transition-colors",
                  includeArchived &&
                    "bg-primary/10 text-primary border-primary/40 hover:bg-primary/15 data-[state=on]:bg-primary/10 data-[state=on]:text-primary",
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
        {isLoading && displayedAssets.length === 0 ? (
          <span>Carregando...</span>
        ) : total === 0 ? (
          <span>Nenhum asset encontrado</span>
        ) : (
          <>
            <span data-testid="dam-results-counter">
              {paginationMode === "loadmore"
                ? `Mostrando ${displayedAssets.length} de ${total} ${total === 1 ? "asset" : "assets"}`
                : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total} ${total === 1 ? "asset" : "assets"}`}
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
              <Badge variant="secondary" className="text-[10px] h-5">filtrado</Badge>
            )}
          </>
        )}
      </div>

      {isLoading && displayedAssets.length === 0 ? (
        viewMode === "list" ? (
          <div className="space-y-2">
            {Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        )
      ) : displayedAssets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-12 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              {hasActiveFilters ? (
                <FilterX className="w-7 h-7 text-muted-foreground" />
              ) : (
                <FolderArchive className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {hasActiveFilters
                  ? "Nenhum asset corresponde aos filtros"
                  : "Sua biblioteca está vazia"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {hasActiveFilters
                  ? "Tente remover algum filtro ou ajustar a busca."
                  : "Faça upload do seu primeiro asset para começar."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearAllFilters}>
                <FilterX className="w-4 h-4 mr-2" /> Limpar filtros
              </Button>
            ) : canUpload ? (
              <Button onClick={() => setUploadOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Fazer upload
              </Button>
            ) : null}
          </Card>
        </motion.div>
      ) : (
        <div className={quickPreview.enabled ? "flex gap-4 items-start" : undefined}>
          <div className="flex-1 min-w-0">
            {viewMode === "list" ? (
              <AssetListView assets={displayedAssets} clients={clients} onSelect={setSelected} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedAssets.map((a) => (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    isQuickActive={quickPreview.enabled && quickPreview.activeAsset?.id === a.id}
                    onHover={quickPreview.enabled ? () => quickPreview.setHoverAsset(a) : undefined}
                    onHoverEnd={quickPreview.enabled ? () => quickPreview.setHoverAsset(null) : undefined}
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
        <ResultsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          itemNoun="asset"
        />
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
      />
    </div>
  );
}