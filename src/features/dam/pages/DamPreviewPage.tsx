import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderArchive, Keyboard } from "lucide-react";
import { Card } from "@/components/ui/card";
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

export const LAST_ASSET_KEY = "dam-last-preview-asset";
export const LAST_ASSET_TTL_MS = 24 * 60 * 60 * 1000;

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
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      // When the detail drawer is open, let Radix handle Esc/focus; skip our shortcuts.
      if (detailAsset) return;
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
      } else if (e.key === "Escape") {
        e.preventDefault();
        navigate(`/dam${queryString}`);
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
    <div className="h-[calc(100vh-4rem)] flex flex-col">
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
        <div className="ml-auto text-xs text-muted-foreground hidden md:block">
          ← / → (j/k) navegar · Home/End extremos · Enter detalhes · Z zoom · C copiar · D baixar · Esc voltar
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto md:hidden h-8 w-8"
              aria-label="Atalhos de teclado"
            >
              <Keyboard className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 text-xs">
            ← / → (j/k) navegar · Home/End extremos · Enter detalhes · Z zoom · C copiar · D baixar · Esc voltar
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
          <PreviewStage
            asset={activeAsset}
            index={activeIndex}
            total={assets.length}
            onPrev={goPrev}
            onNext={goNext}
            onOpenDetails={() => activeAsset && setDetailAsset(activeAsset)}
          />
          <PreviewThumbStrip assets={assets} activeIndex={activeIndex} onSelect={setActiveIndex} />
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