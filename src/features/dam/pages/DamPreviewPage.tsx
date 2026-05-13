import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderArchive, Keyboard, Layers, Share2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
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
import { useCompareSelection } from "../hooks/use-compare-selection";
import { ExportMenu } from "../components/ExportMenu";
import { ExportProgressPanel } from "../components/ExportProgressPanel";
import { ActiveFiltersSummaryPanel } from "../components/ActiveFiltersSummaryPanel";
import { usePreviewSync } from "../hooks/use-preview-sync";
import { usePreviewDiagnosis } from "../hooks/use-preview-diagnosis";
import { usePreviewShortcuts } from "../hooks/use-preview-shortcuts";
import { usePreviewShare } from "../hooks/use-preview-share";
import { usePreviewNavigation } from "../hooks/use-preview-navigation";

export const LAST_ASSET_KEY = "dam-last-preview-asset";
export const LAST_ASSET_TTL_MS = 24 * 60 * 60 * 1000;
export const COMPARE_MODE_KEY = "dam-compare-mode";
export const PREVIEW_QS_KEY = "dam-preview-qs";
export const COMPARE_IDS_KEY = "dam-compare-ids";

export function readLastPreviewAsset(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_ASSET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; ts?: number };
    if (!parsed?.id || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > LAST_ASSET_TTL_MS) return null;
    return parsed.id;
  } catch { return null; }
}

export function clearLastPreviewAsset(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LAST_ASSET_KEY); } catch { /* ignore */ }
}

export function peekLastPreviewAssetRaw(): { id: string | null; expired: boolean } {
  if (typeof window === "undefined") return { id: null, expired: false };
  try {
    const raw = localStorage.getItem(LAST_ASSET_KEY);
    if (!raw) return { id: null, expired: false };
    const parsed = JSON.parse(raw) as { id?: string; ts?: number };
    if (!parsed?.id || typeof parsed.ts !== "number") return { id: null, expired: false };
    const expired = Date.now() - parsed.ts > LAST_ASSET_TTL_MS;
    return { id: expired ? null : parsed.id, expired };
  } catch { return { id: null, expired: false }; }
}

export default function DamPreviewPage() {
  
  const { currentOrgId } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const filters = useDamFilters();
  const { 
    state, queryString, setSort, reset: resetFilters, setAssetTypes, setClientId, setTags, setSearch, setIncludeArchived 
  } = filters;
  const [searchParams, setSearchParams] = useSearchParams();
  const assetIdParam = searchParams.get("asset");
  const didInitRef = useRef(false);
  const didShowExpiredToastRef = useRef(false);
  const didShowFallbackToastRef = useRef(false);
  const didHydrateCompareRef = useRef(false);

  const compare = useCompareSelection();
  usePreviewSync(searchParams, setSearchParams, compare.selectedIds);

  useEffect(() => {
    if (didShowExpiredToastRef.current) return;
    const { expired } = peekLastPreviewAssetRaw();
    if (expired) {
      didShowExpiredToastRef.current = true;
      clearLastPreviewAsset();
      toast("Sessão de pré-visualização expirada", { description: "Sua última sessão tem mais de 24h. Começando do início.", duration: 4000 });
    }
  }, []);

  const debouncedSearch = useDebounce(state.search, 300);
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
    } else if (state.sort === "relevance") {
      const restore = previousSortRef.current ?? "created_desc";
      lastAutoSortRef.current = restore;
      previousSortRef.current = null;
      setSort(restore);
    } else {
      lastAutoSortRef.current = null;
    }
  }, [debouncedSearch, state.sort, setSort]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(() => {
    try { return sessionStorage.getItem(COMPARE_MODE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { sessionStorage.setItem(COMPARE_MODE_KEY, compareMode ? "1" : "0"); } catch { /* ignore */ }
  }, [compareMode]);

  const prevCompareModeRef = useRef(compareMode);
  const didShowRestoreToastRef = useRef(false);
  useEffect(() => {
    const wasOff = !prevCompareModeRef.current;
    prevCompareModeRef.current = compareMode;
    if (!wasOff || !compareMode || didShowRestoreToastRef.current) return;
    if (compare.selectedIds.length >= 2) {
      didShowRestoreToastRef.current = true;
      toast("Comparação restaurada", { description: `${compare.selectedIds.length} assets carregados da sua seleção anterior.`, duration: 2500 });
    }
  }, [compareMode, compare.selectedIds.length]);

  const queryFilters = useMemo(() => {
    const opt = SORT_OPTIONS.find((s) => s.value === state.sort) ?? SORT_OPTIONS[1];
    return {
      assetTypes: state.assetTypes.length > 0 ? state.assetTypes : undefined,
      clientId: state.clientId === "all" ? undefined : state.clientId === "none" ? null : state.clientId,
      tags: state.tags.length > 0 ? state.tags : undefined,
      tagsMode: state.tagsMode,
      includeArchived: state.includeArchived,
      search: debouncedSearch.trim() || undefined,
      sortBy: opt.sortBy, sortDir: opt.sortDir,
      page: 1, pageSize: 50,
    };
  }, [state, debouncedSearch]);

  const { assets, isLoading } = useAssets(currentOrgId, queryFilters);

  const { activeAsset, goPrev, goNext, selectAssetAt } = usePreviewNavigation({
    assets, activeIndex, setActiveIndex, searchParams, setSearchParams
  });

  const { copied, handleCopyShareLink } = usePreviewShare({ activeAsset, searchParams, compareMode, compare });

  usePreviewShortcuts({
    detailAsset, queryString, compareMode, setCompareMode, activeAsset, compare, goPrev, goNext,
    onOpenDetails: () => activeAsset && setDetailAsset(activeAsset)
  });

  useEffect(() => {
    if (didHydrateCompareRef.current || assets.length === 0) return;
    const fromUrl = searchParams.get("compare");
    let raw = fromUrl;
    if (!raw) {
      try { raw = sessionStorage.getItem(COMPARE_IDS_KEY); } catch { /* ignore */ }
    }
    if (!raw) { didHydrateCompareRef.current = true; return; }
    const ids = raw.split(",").map(s => s.trim()).filter(Boolean);
    const availableIds = new Set(assets.map(a => a.id));
    const valid = ids.filter(id => availableIds.has(id)).slice(0, compare.max);
    if (valid.length >= 2) {
      compare.clear(); valid.forEach(id => compare.toggle(id)); setCompareMode(true);
    } else {
      try { sessionStorage.removeItem(COMPARE_IDS_KEY); } catch { /* ignore */ }
      if (fromUrl) {
        const next = new URLSearchParams(searchParams);
        next.delete("compare");
        setSearchParams(next, { replace: true });
      }
    }
    didHydrateCompareRef.current = true;
  }, [assets, searchParams, setSearchParams, compare]);

  const selectedAssets = useMemo(() => {
    if (compare.selectedIds.length === 0) return [];
    const map = new Map(assets.map(a => [a.id, a]));
    return compare.selectedIds.map(id => map.get(id)).filter((a): a is Asset => !!a);
  }, [assets, compare.selectedIds]);

  useEffect(() => {
    if (assets.length === 0 || !assetIdParam) return;
    const idx = assets.findIndex(a => a.id === assetIdParam);
    if (idx >= 0 && idx !== activeIndex) setActiveIndex(idx);
  }, [assetIdParam, assets, activeIndex]);

  useEffect(() => {
    if (didInitRef.current || assets.length === 0) return;
    didInitRef.current = true;
    if (!assetIdParam) { setActiveIndex(0); return; }
    const idx = assets.findIndex(a => a.id === assetIdParam);
    if (idx < 0) setActiveIndex(0);
  }, [assets, assetIdParam]);

  useEffect(() => {
    if (activeIndex >= assets.length && assets.length > 0) setActiveIndex(0);
  }, [assets, activeIndex]);

  const clientNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients ?? []) map[c.id] = c.name;
    return map;
  }, [clients]);

  const { lastKnownAsset, removalCauses, assetRemovedByFilter } = usePreviewDiagnosis(activeAsset, assets, filters, clientNameById);

  useEffect(() => {
    if (!lastKnownAsset || assets.length === 0 || activeAsset?.id === lastKnownAsset.id) return;
    const idx = assets.findIndex(a => a.id === lastKnownAsset.id);
    if (idx >= 0 && idx !== activeIndex) setActiveIndex(idx);
  }, [assets, lastKnownAsset, activeAsset, activeIndex]);

  const assetMissingFromList = !!assetIdParam && assets.length > 0 && !assets.some(a => a.id === assetIdParam);
  useEffect(() => {
    if (!assetMissingFromList || didShowFallbackToastRef.current) return;
    didShowFallbackToastRef.current = true;
    const primary = removalCauses[0]?.message;
    toast("Asset fora dos filtros atuais", {
      description: primary ? `${primary} Mostrando o primeiro disponível.` : "O asset visualizado por último não está disponível nos filtros atuais.",
      duration: 5000,
      action: { label: "Limpar filtros", onClick: () => { resetFilters(); clearLastPreviewAsset(); } },
    });
  }, [assetMissingFromList, resetFilters, removalCauses]);

  const clearCause = (kind: any) => {
    switch (kind) {
      case "assetTypes": setAssetTypes([]); break;
      case "clientId": setClientId("all"); break;
      case "tags": setTags([]); break;
      case "search": setSearch(""); break;
      case "includeArchived": setIncludeArchived(true); break;
    }
  };

  const causeActionLabel = (kind: any): string => {
    switch (kind) {
      case "assetTypes": return "Remover filtro de tipo";
      case "clientId": return "Remover filtro de cliente";
      case "tags": return "Remover filtro de tags";
      case "search": return "Limpar busca";
      case "includeArchived": return "Incluir arquivados";
      default: return "Limpar filtro";
    }
  };

  if (!currentOrgId) return <div className="p-8 text-center"><Card className="p-12"><p className="text-muted-foreground">Selecione uma organização</p></Card></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild title="Voltar para a biblioteca (Esc)">
            <Link to={`/dam${queryString}`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><FolderArchive className="h-5 w-5" /></div>
            <div><h1 className="font-bold text-sm leading-none">Pré-visualização</h1><p className="text-[10px] text-muted-foreground mt-0.5">Navegue e compare assets</p></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild><Badge variant="outline" className="hidden lg:flex items-center gap-1 font-mono text-[10px] opacity-60"><Keyboard className="h-3 w-3" /> M · Espaço · Enter</Badge></TooltipTrigger>
              <TooltipContent className="text-xs">
                <div className="space-y-1"><div><kbd className="font-mono">M</kbd> alternar comparação</div><div><kbd className="font-mono">Espaço</kbd> selecionar para comparar</div><div><kbd className="font-mono">Enter</kbd> abrir detalhes</div></div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant={compareMode ? "default" : "outline"} size="sm" onClick={() => setCompareMode(!compareMode)} className="h-8 gap-2">
            <Layers className="h-4 w-4" /> {compareMode ? "Comparando" : "Comparar"}
            {compare.selectedIds.length > 0 && <Badge variant="secondary" className="h-4 px-1 min-w-[1.25rem] text-[10px] ml-0.5">{compare.selectedIds.length}</Badge>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyShareLink} className="h-8 gap-2" disabled={!activeAsset}>
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {copied ? "Copiado" : "Compartilhar"}
          </Button>
          <ExportMenu assets={assets} organizationId={currentOrgId} filters={queryFilters} filtersSummary={{}} />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <PreviewSidebar assets={assets} activeIndex={activeIndex} onSelect={(idx) => selectAssetAt(idx, { pushHistory: true })} isLoading={isLoading} compareMode={compareMode} compare={compare} />
        <main className="flex-1 relative flex flex-col bg-muted/20 overflow-hidden">
          {compareMode ? (
            <CompareGrid assets={selectedAssets} max={compare.max} onRemove={(id) => compare.toggle(id)} onClear={compare.clear} onOpenDetails={(a) => setDetailAsset(a)} />
          ) : (
            <PreviewStage asset={activeAsset} isLoading={isLoading} onPrev={goPrev} onNext={goNext} onOpenDetails={() => activeAsset && setDetailAsset(activeAsset)} />
          )}
          {assetRemovedByFilter && (
            <ActiveFiltersSummaryPanel causes={removalCauses} onClearCause={clearCause} actionLabel={causeActionLabel} />
          )}
          <PreviewThumbStrip assets={assets} activeIndex={activeIndex} onSelect={(idx) => selectAssetAt(idx, { pushHistory: true })} compare={compare} />
        </main>
      </div>

      {detailAsset && <AssetDetailDrawer asset={detailAsset} onClose={() => setDetailAsset(null)} searchQuery={debouncedSearch} onSelectAsset={(a) => { setDetailAsset(null); const idx = assets.findIndex(x => x.id === a.id); if (idx >= 0) selectAssetAt(idx, { pushHistory: true }); }} />}
      <ExportProgressPanel />
    </div>
  );
}
