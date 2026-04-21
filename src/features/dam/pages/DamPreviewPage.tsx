import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderArchive, Keyboard, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useAssets, MIN_SEARCH_LENGTH, type Asset } from "../hooks/use-assets";
import { useDebounce } from "@/hooks/use-debounce";
import { useDamFilters, SORT_OPTIONS, type SortValue } from "../hooks/use-dam-filters";
import { PreviewSidebar } from "../components/PreviewSidebar";
import { PreviewStage } from "../components/PreviewStage";
import { PreviewThumbStrip } from "../components/PreviewThumbStrip";
import { AssetDetailDrawer } from "../components/AssetDetailDrawer";
import { CompareGrid } from "../components/CompareGrid";
import { CompareTopBar } from "../components/CompareTopBar";
import { useCompareSelection } from "../hooks/use-compare-selection";
import { ExportMenu } from "../components/ExportMenu";

export const LAST_ASSET_KEY = "dam-last-preview-asset";
export const LAST_ASSET_TTL_MS = 24 * 60 * 60 * 1000;
export const COMPARE_MODE_KEY = "dam-compare-mode";

/**
 * Reads the last viewed preview asset id from localStorage, validating TTL.
 * Returns null if missing, malformed, or expired.
 */
export function readLastPreviewAsset(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ASSET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; ts?: number };
    if (!parsed?.id || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > LAST_ASSET_TTL_MS) return null;
    return parsed.id;
  } catch {
    return null;
  }
}

export function clearLastPreviewAsset(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LAST_ASSET_KEY); } catch { /* ignore */ }
}

export default function DamPreviewPage() {
  const navigate = useNavigate();
  const { currentOrgId } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const filters = useDamFilters();
  const { state, queryString, setSort } = filters;
  const [searchParams, setSearchParams] = useSearchParams();
  const assetIdParam = searchParams.get("asset");

  const debouncedSearch = useDebounce(state.search, 300);

  // Auto-switch to "relevance" sort when user types a valid search; restore previous sort when search clears.
  // We track the last value we auto-applied so manual user changes during an active search are respected.
  const previousSortRef = useRef<SortValue | null>(null);
  const lastAutoSortRef = useRef<SortValue | null>(null);
  useEffect(() => {
    const hasSearch = debouncedSearch.trim().length >= MIN_SEARCH_LENGTH;
    if (hasSearch) {
      if (state.sort !== "relevance" && lastAutoSortRef.current !== state.sort) {
        previousSortRef.current = state.sort;
        lastAutoSortRef.current = "relevance";
        setSort("relevance");
      }
    } else {
      if (state.sort === "relevance") {
        const restore = previousSortRef.current ?? "created_desc";
        lastAutoSortRef.current = restore;
        previousSortRef.current = null;
        setSort(restore);
      } else {
        lastAutoSortRef.current = null;
      }
    }
  }, [debouncedSearch, state.sort, setSort]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(COMPARE_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(COMPARE_MODE_KEY, compareMode ? "1" : "0");
    } catch { /* ignore */ }
  }, [compareMode]);
  const compare = useCompareSelection();

  const queryFilters = useMemo(() => {
    const opt = SORT_OPTIONS.find((s) => s.value === state.sort) ?? SORT_OPTIONS[1];
    return {
      assetTypes: state.assetTypes.length > 0 ? state.assetTypes : undefined,
      clientId:
        state.clientId === "all" ? undefined : state.clientId === "none" ? null : state.clientId,
      tags: state.tags.length > 0 ? state.tags : undefined,
      tagsMode: state.tagsMode,
      includeArchived: state.includeArchived,
      search: debouncedSearch.trim() || undefined,
      sortBy: opt.sortBy,
      sortDir: opt.sortDir,
      page: 1,
      pageSize: 50,
    };
  }, [state, debouncedSearch]);

  const { assets, total, isLoading } = useAssets(currentOrgId, queryFilters);

  // Resolve selected assets into Asset[] (maintain selection order).
  const selectedAssets = useMemo(() => {
    if (compare.selectedIds.length === 0) return [];
    const map = new Map(assets.map((a) => [a.id, a]));
    return compare.selectedIds
      .map((id) => map.get(id))
      .filter((a): a is Asset => Boolean(a));
  }, [assets, compare.selectedIds]);

  // Restore activeIndex from ?asset=<id> when assets load / filters change.
  // If id is missing or not in the current list, fall back to index 0.
  useEffect(() => {
    if (assets.length === 0) return;
    if (assetIdParam) {
      const idx = assets.findIndex((a) => a.id === assetIdParam);
      if (idx >= 0) {
        setActiveIndex(idx);
        return;
      }
    }
    setActiveIndex(0);
  }, [assets, assetIdParam]);

  // Clamp activeIndex if list shrinks
  useEffect(() => {
    if (activeIndex >= assets.length && assets.length > 0) {
      setActiveIndex(0);
    }
  }, [assets.length, activeIndex]);

  const activeAsset = assets[activeIndex] ?? null;

  // Sync URL ?asset=<id> with current activeAsset (replace, no history spam).
  useEffect(() => {
    if (!activeAsset) return;
    if (searchParams.get("asset") === activeAsset.id) return;
    const next = new URLSearchParams(searchParams);
    next.set("asset", activeAsset.id);
    setSearchParams(next, { replace: true });
  }, [activeAsset, searchParams, setSearchParams]);

  // Persist last viewed asset to localStorage (for re-entry from library).
  useEffect(() => {
    if (!activeAsset) return;
    try {
      localStorage.setItem(
        LAST_ASSET_KEY,
        JSON.stringify({ id: activeAsset.id, ts: Date.now() }),
      );
    } catch { /* ignore */ }
  }, [activeAsset]);

  const goPrev = () => {
    if (assets.length === 0) return;
    setActiveIndex((i) => (i - 1 + assets.length) % assets.length);
  };
  const goNext = () => {
    if (assets.length === 0) return;
    setActiveIndex((i) => (i + 1) % assets.length);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inEditable = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
      // When the detail drawer is open, let Radix handle Esc/focus; skip our shortcuts.
      if (detailAsset) return;

      // Esc has special handling — even inside inputs we want to blur first.
      if (e.key === "Escape") {
        if (inEditable && target) {
          e.preventDefault();
          target.blur();
          return;
        }
        e.preventDefault();
        navigate(`/dam${queryString}`);
        return;
      }

      if (inEditable) return;

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setCompareMode((v) => !v);
        return;
      }
      if (compareMode && e.key === " ") {
        e.preventDefault();
        if (activeAsset) compare.toggle(activeAsset.id);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        if (assets.length > 0) setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        if (assets.length > 0) setActiveIndex(assets.length - 1);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (activeAsset) {
          const params = new URLSearchParams(queryString.startsWith("?") ? queryString.slice(1) : queryString);
          params.set("asset", activeAsset.id);
          window.open(`/dam/preview?${params.toString()}`, "_blank", "noopener,noreferrer");
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeAsset) setDetailAsset(activeAsset);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length, activeAsset, detailAsset, queryString]);

  if (!currentOrgId) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <FolderArchive className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-1">Selecione uma organização</h2>
          <p className="text-sm text-muted-foreground">
            A pré-visualização de assets é por organização.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="h-[calc(100vh-4rem)] flex flex-col"
      role="region"
      aria-label="Pré-visualização de assets"
    >
      <header className="border-b border-border px-4 py-2 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/dam${queryString}`}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar à biblioteca
          </Link>
        </Button>
        <div className="text-sm font-medium flex items-center gap-2">
          <FolderArchive className="w-4 h-4" />
          Pré-visualização rápida
        </div>
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={() => setCompareMode((v) => !v)}
          className="ml-auto h-8 gap-1.5"
          aria-pressed={compareMode}
          title="Modo comparação (M)"
        >
          <Layers className="w-3.5 h-3.5" />
          Compare
          {compare.count > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] ml-0.5">
              {compare.count}
            </Badge>
          )}
        </Button>
        <ExportMenu
          assets={assets}
          selectedAssets={selectedAssets}
          clients={clients}
          compareMode={compareMode}
        />
        <div className="text-xs text-muted-foreground hidden md:block">
          ← / → (j/k) navegar · Enter detalhes · Ctrl+Enter nova aba · Z zoom · C copiar · D baixar · M compare · Espaço selecionar · Esc voltar
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              aria-label="Atalhos de teclado"
            >
              <Keyboard className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 text-xs">
            ← / → (j/k) navegar · Home/End extremos · Enter detalhes · Ctrl+Enter nova aba · Z zoom · C copiar · D baixar · M compare · Espaço selecionar (no compare) · Esc voltar
          </PopoverContent>
        </Popover>
      </header>

      <div className="flex-1 flex min-h-0">
        <PreviewSidebar
          filters={filters}
          clients={clients}
          assets={assets}
          total={total}
          isLoading={isLoading}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {compareMode ? (
            <>
              <CompareTopBar
                count={compare.count}
                max={compare.max}
                onClear={compare.clear}
                onExit={() => setCompareMode(false)}
              />
              {selectedAssets.length >= 2 ? (
                <CompareGrid assets={selectedAssets} onRemove={compare.remove} />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/10 text-sm text-muted-foreground p-6 text-center">
                  Selecione ao menos 2 assets do strip abaixo (até {compare.max}) para comparar lado a lado.
                </div>
              )}
            </>
          ) : (
            <PreviewStage
              asset={activeAsset}
              index={activeIndex}
              total={assets.length}
              onPrev={goPrev}
              onNext={goNext}
              onOpenDetails={() => activeAsset && setDetailAsset(activeAsset)}
            />
          )}
          <PreviewThumbStrip
            assets={assets}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            selectionMode={compareMode}
            selectedIds={compare.selectedIds}
            onToggleSelect={compare.toggle}
          />
        </div>
      </div>

      <AssetDetailDrawer
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
        onSelectAsset={(a) => setDetailAsset(a)}
      />
    </div>
  );
}