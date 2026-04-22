import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderArchive, Keyboard, Layers, Link2, AlertCircle, Share2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { CompareTopBar } from "../components/CompareTopBar";
import { useCompareSelection } from "../hooks/use-compare-selection";
import { ExportMenu } from "../components/ExportMenu";
import { diagnoseAssetRemoval, type DiagnosisCause } from "../lib/filter-diagnosis";

export const LAST_ASSET_KEY = "dam-last-preview-asset";
export const LAST_ASSET_TTL_MS = 24 * 60 * 60 * 1000;
export const COMPARE_MODE_KEY = "dam-compare-mode";
/** Last URL query string (filters + ?asset + ?compare) used in /dam/preview. */
export const PREVIEW_QS_KEY = "dam-preview-qs";
/** Last set of compare-selected asset ids (CSV). Used when URL has no ?compare=. */
export const COMPARE_IDS_KEY = "dam-compare-ids";

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

/**
 * Peeks the raw localStorage entry without clearing it.
 * Returns { id, expired } so callers can show UX hints (e.g. expiration toasts).
 * - id is null if there is no entry or the entry is malformed.
 * - expired is true only when an entry exists but is past its TTL.
 */
export function peekLastPreviewAssetRaw(): { id: string | null; expired: boolean } {
  if (typeof window === "undefined") return { id: null, expired: false };
  try {
    const raw = localStorage.getItem(LAST_ASSET_KEY);
    if (!raw) return { id: null, expired: false };
    const parsed = JSON.parse(raw) as { id?: string; ts?: number };
    if (!parsed?.id || typeof parsed.ts !== "number") return { id: null, expired: false };
    const expired = Date.now() - parsed.ts > LAST_ASSET_TTL_MS;
    return { id: expired ? null : parsed.id, expired };
  } catch {
    return { id: null, expired: false };
  }
}

export default function DamPreviewPage() {
  const navigate = useNavigate();
  const { currentOrgId } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const filters = useDamFilters();
  const {
    state,
    queryString,
    setSort,
    reset: resetFilters,
    setAssetTypes,
    setClientId,
    setTags,
    setSearch,
    setIncludeArchived,
  } = filters;
  const [searchParams, setSearchParams] = useSearchParams();
  const assetIdParam = searchParams.get("asset");
  const didInitRef = useRef(false);
  const userNavRef = useRef(false);
  const didShowExpiredToastRef = useRef(false);
  const didShowFallbackToastRef = useRef(false);
  const lastUserSelectedIdRef = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const didHydrateCompareRef = useRef(false);
  const didRestoreSessionRef = useRef(false);

  // Mount-only: if the URL is empty (no filters / asset / compare) but we have a saved
  // session from a previous visit to /dam/preview, restore it via replace navigation.
  // This keeps /dam/preview "remembering" the last context the user worked with.
  useEffect(() => {
    if (didRestoreSessionRef.current) return;
    didRestoreSessionRef.current = true;
    if (typeof window === "undefined") return;
    if (searchParams.toString() !== "") return; // user came in WITH an explicit URL — respect it
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(PREVIEW_QS_KEY); } catch { /* ignore */ }
    if (!saved) return;
    const trimmed = saved.startsWith("?") ? saved.slice(1) : saved;
    if (!trimmed) return;
    navigate(`/dam/preview?${trimmed}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show a discreet toast on mount when the persisted "last preview" entry has expired (>24h).
  useEffect(() => {
    if (didShowExpiredToastRef.current) return;
    const { expired } = peekLastPreviewAssetRaw();
    if (expired) {
      didShowExpiredToastRef.current = true;
      clearLastPreviewAsset();
      toast("Sessão de pré-visualização expirada", {
        description: "Sua última sessão tem mais de 24h. Começando do início.",
        duration: 4000,
      });
    }
  }, []);

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

  // Persist current URL query string (filters + asset + compare) so re-entry into
  // /dam/preview with no params restores the same context.
  useEffect(() => {
    if (!didRestoreSessionRef.current) return; // wait until restore-on-mount has run
    try {
      const qs = searchParams.toString();
      if (qs) sessionStorage.setItem(PREVIEW_QS_KEY, qs);
    } catch { /* ignore */ }
  }, [searchParams]);

  // Persist compare selection (ids only). Used as a fallback when URL has no ?compare=.
  useEffect(() => {
    try {
      const ids = compare.selectedIds;
      if (ids.length >= 2) sessionStorage.setItem(COMPARE_IDS_KEY, ids.join(","));
      else sessionStorage.removeItem(COMPARE_IDS_KEY);
    } catch { /* ignore */ }
  }, [compare.selectedIds]);

  // Last asset that was actually visible in results — used to diagnose why it
  // disappeared after a filter change, and to restore selection when filters clear.
  const [lastKnownAsset, setLastKnownAsset] = useState<Asset | null>(null);

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

  // Hydrate compare selection from ?compare=id1,id2,... on first load when assets are available.
  useEffect(() => {
    if (didHydrateCompareRef.current) return;
    if (assets.length === 0) return;
    // Prefer ?compare= from URL; fall back to last set persisted in sessionStorage.
    let raw = searchParams.get("compare");
    if (!raw) {
      try { raw = sessionStorage.getItem(COMPARE_IDS_KEY); } catch { /* ignore */ }
    }
    if (!raw) {
      didHydrateCompareRef.current = true;
      return;
    }
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const valid = ids.filter((id) => assets.some((a) => a.id === id)).slice(0, compare.max);
    if (valid.length >= 2) {
      compare.clear();
      valid.forEach((id) => compare.toggle(id));
      setCompareMode(true);
    }
    didHydrateCompareRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  // Resolve selected assets into Asset[] (maintain selection order).
  const selectedAssets = useMemo(() => {
    if (compare.selectedIds.length === 0) return [];
    const map = new Map(assets.map((a) => [a.id, a]));
    return compare.selectedIds
      .map((id) => map.get(id))
      .filter((a): a is Asset => Boolean(a));
  }, [assets, compare.selectedIds]);

  // React to ?asset= changes (incl. browser back/forward) — explicitly depend on assetIdParam.
  useEffect(() => {
    if (assets.length === 0) return;
    if (!assetIdParam) return;
    const idx = assets.findIndex((a) => a.id === assetIdParam);
    if (idx >= 0) {
      // URL-driven selection counts as user intent — track for localStorage persistence.
      lastUserSelectedIdRef.current = assetIdParam;
      if (idx !== activeIndex) setActiveIndex(idx);
    }
  }, [assetIdParam, assets, activeIndex]);

  // First-load fallback: when no ?asset= and assets just arrived, default to index 0 once.
  // Guard: never overwrite when ?asset= is present and points to a valid asset in the list.
  useEffect(() => {
    if (didInitRef.current) return;
    if (assets.length === 0) return;
    didInitRef.current = true;
    if (!assetIdParam) {
      setActiveIndex(0);
      return;
    }
    // If the URL asset is in the list, the other effect handles positioning — do not reset.
    const idx = assets.findIndex((a) => a.id === assetIdParam);
    if (idx < 0) setActiveIndex(0);
  }, [assets.length, assetIdParam, assets]);

  // Clamp activeIndex if list shrinks
  useEffect(() => {
    if (activeIndex >= assets.length && assets.length > 0) {
      setActiveIndex(0);
    }
  }, [assets.length, activeIndex]);

  const activeAsset = assets[activeIndex] ?? null;
  const assetMissingFromList =
    Boolean(assetIdParam) && assets.length > 0 && !assets.some((a) => a.id === assetIdParam);

  // Build clientId -> name map for diagnosis messages.
  const clientNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients ?? []) map[c.id] = c.name;
    return map;
  }, [clients]);

  // Track last known asset (the last one actually present in results).
  useEffect(() => {
    if (activeAsset) setLastKnownAsset(activeAsset);
  }, [activeAsset]);

  // If the lastKnownAsset reappears in the list (e.g. after clearing filters),
  // restore it as active instead of staying on index 0.
  useEffect(() => {
    if (!lastKnownAsset) return;
    if (assets.length === 0) return;
    if (activeAsset?.id === lastKnownAsset.id) return;
    const idx = assets.findIndex((a) => a.id === lastKnownAsset.id);
    if (idx >= 0 && idx !== activeIndex) {
      setActiveIndex(idx);
    }
  }, [assets, lastKnownAsset, activeAsset, activeIndex]);

  // Diagnose why the last known asset is no longer in the results.
  const removalCauses: DiagnosisCause[] = useMemo(() => {
    if (!lastKnownAsset) return [];
    if (assets.some((a) => a.id === lastKnownAsset.id)) return [];
    return diagnoseAssetRemoval(lastKnownAsset, state, { clientNameById });
  }, [lastKnownAsset, assets, state, clientNameById]);

  const assetRemovedByFilter = removalCauses.length > 0;

  // Helper: clear a single cause.
  const clearCause = (kind: DiagnosisCause["kind"]) => {
    switch (kind) {
      case "assetTypes": setAssetTypes([]); break;
      case "clientId": setClientId("all"); break;
      case "tags": setTags([]); break;
      case "search": setSearch(""); break;
      case "includeArchived": setIncludeArchived(true); break;
    }
  };

  const causeActionLabel = (kind: DiagnosisCause["kind"]): string => {
    switch (kind) {
      case "assetTypes": return "Remover filtro de tipo";
      case "clientId": return "Remover filtro de cliente";
      case "tags": return "Remover filtro de tags";
      case "search": return "Limpar busca";
      case "includeArchived": return "Incluir arquivados";
    }
  };

  // When the URL/localStorage points to an asset that's not in the current results,
  // show a one-time toast offering to clear filters. The localStorage entry is kept
  // (filters may be temporary) — only cleared when the user explicitly chooses to clear filters.
  useEffect(() => {
    if (!assetMissingFromList) return;
    if (didShowFallbackToastRef.current) return;
    didShowFallbackToastRef.current = true;
    const primary = removalCauses[0]?.message;
    toast("Asset fora dos filtros atuais", {
      description: primary
        ? `${primary} Mostrando o primeiro disponível.`
        : "O asset visualizado por último não está disponível nos filtros atuais. Mostrando o primeiro disponível.",
      duration: 5000,
      action: {
        label: "Limpar filtros",
        onClick: () => {
          resetFilters();
          clearLastPreviewAsset();
        },
      },
    });
  }, [assetMissingFromList, resetFilters, removalCauses]);

  // Sync URL ?asset=<id> with current activeAsset.
  // Use push when the change came from a deliberate user action (arrows/thumbs),
  // replace when it's a passive sync (clamp/init/filter change).
  useEffect(() => {
    if (!activeAsset) return;
    if (searchParams.get("asset") === activeAsset.id) return;
    const next = new URLSearchParams(searchParams);
    next.set("asset", activeAsset.id);
    const replace = !userNavRef.current;
    userNavRef.current = false;
    setSearchParams(next, { replace });
  }, [activeAsset, searchParams, setSearchParams]);

  // Persist last viewed asset to localStorage — only when the user explicitly
  // selected it (arrows/thumbs/URL nav). This prevents a filter-induced fallback
  // (e.g. asset disappeared, fell back to index 0) from overwriting the user's
  // intent in localStorage. The URL change effect updates the ref on user nav.
  useEffect(() => {
    if (!activeAsset) return;
    if (lastUserSelectedIdRef.current !== activeAsset.id) return;
    try {
      localStorage.setItem(
        LAST_ASSET_KEY,
        JSON.stringify({ id: activeAsset.id, ts: Date.now() }),
      );
    } catch { /* ignore */ }
  }, [activeAsset]);

  const selectAssetAt = (idx: number, opts?: { pushHistory?: boolean }) => {
    if (assets.length === 0) return;
    if (opts?.pushHistory) userNavRef.current = true;
    const normalized = ((idx % assets.length) + assets.length) % assets.length;
    const target = assets[normalized];
    if (target) lastUserSelectedIdRef.current = target.id;
    setActiveIndex(normalized);
  };
  const goPrev = () => selectAssetAt(activeIndex - 1, { pushHistory: true });
  const goNext = () => selectAssetAt(activeIndex + 1, { pushHistory: true });

  const buildShareableUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    if (!activeAsset) return null;
    const params = new URLSearchParams(searchParams);
    params.set("asset", activeAsset.id);
    if (compareMode && compare.selectedIds.length >= 2) {
      params.set("compare", compare.selectedIds.join(","));
    } else {
      params.delete("compare");
    }
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
  };

  const handleCopyShareLink = async () => {
    const url = buildShareableUrl();
    if (!url) return;
    const showSuccess = () => {
      setCopied(true);
      if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
      toast.success("Link copiado", {
        description: compareMode && compare.selectedIds.length >= 2
          ? "Quem abrir verá a mesma comparação e filtros."
          : "Quem abrir verá o mesmo asset e filtros.",
        duration: 2500,
      });
    };
    try {
      await navigator.clipboard.writeText(url);
      showSuccess();
      return;
    } catch { /* fallback below */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) { showSuccess(); return; }
      throw new Error("execCommand failed");
    } catch {
      toast.error("Não foi possível copiar", { description: url, duration: 6000 });
    }
  };

  useEffect(() => () => {
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inEditable = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
      // When the detail drawer is open, let Radix `Sheet` own ALL keys (Esc closes
      // the drawer via onOpenChange → onClose → setDetailAsset(null), focus returns
      // to the previous trigger). Skipping here prevents Esc from both closing the
      // drawer AND navigating away from /dam/preview in the same keypress.
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
        if (assets.length > 0) selectAssetAt(0, { pushHistory: true });
      } else if (e.key === "End") {
        e.preventDefault();
        if (assets.length > 0) selectAssetAt(assets.length - 1, { pushHistory: true });
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
      } else if ((e.key === "C" || (e.key === "c" && e.shiftKey)) && !e.ctrlKey && !e.metaKey && !e.altKey && e.shiftKey) {
        e.preventDefault();
        void handleCopyShareLink();
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
        <TooltipProvider delayDuration={200}>
          {assets.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="h-6 gap-1 px-2 text-[11px] font-mono"
                  aria-label="Posição sincronizada com a URL"
                >
                  <Link2 className="w-3 h-3" />
                  {activeIndex + 1} / {assets.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Sincronizado com a URL (?asset=)</TooltipContent>
            </Tooltip>
          )}
          {(assetMissingFromList || assetRemovedByFilter) && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-transparent px-2 h-6 text-[11px] text-warning hover:bg-warning/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Asset removido pelos filtros — ver motivos"
                >
                  <AlertCircle className="w-3 h-3" />
                  Asset removido pelos filtros
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 text-xs space-y-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Por que sumiu?</div>
                  <div className="text-muted-foreground">
                    {lastKnownAsset
                      ? <>O asset <span className="font-medium text-foreground">{lastKnownAsset.name}</span> não está mais nos resultados.</>
                      : "O asset visualizado por último não está mais nos resultados."}
                  </div>
                </div>
                {removalCauses.length > 0 ? (
                  <ul className="space-y-2">
                    {removalCauses.map((c) => (
                      <li key={c.kind} className="space-y-1.5">
                        <div className="leading-snug">{c.message}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => clearCause(c.kind)}
                        >
                          {causeActionLabel(c.kind)}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground">
                    Não foi possível identificar o motivo exato — pode ter sido arquivado ou excluído.
                  </div>
                )}
                <div className="pt-1 border-t border-border">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full h-7 text-[11px]"
                    onClick={() => resetFilters()}
                  >
                    Limpar todos os filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </TooltipProvider>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleCopyShareLink()}
          disabled={!activeAsset || assets.length === 0}
          className="ml-auto h-8 gap-1.5"
          aria-label={
            compareMode && compare.selectedIds.length >= 2
              ? "Copiar link compartilhável da comparação atual"
              : "Copiar link compartilhável do asset atual"
          }
          title="Copiar link (Shift+C)"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar link"}</span>
        </Button>
        <span className="sr-only" role="status" aria-live="polite">
          {copied ? "Link copiado para a área de transferência" : ""}
        </span>
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={() => setCompareMode((v) => !v)}
          className="h-8 gap-1.5"
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
          ← / → (j/k) navegar · Home/End extremos · Enter detalhes · Ctrl+Enter nova aba · Z zoom · C copiar · D baixar · Shift+C link · M compare · Espaço selecionar · Esc voltar
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
            ← / → (j/k) navegar · Home/End extremos · Enter detalhes · Ctrl+Enter nova aba · Z zoom · C copiar · D baixar · Shift+C link · M compare · Espaço selecionar (no compare) · Esc voltar
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
            onSelect={(i) => selectAssetAt(i, { pushHistory: true })}
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
        searchQuery={debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined}
      />
    </div>
  );
}