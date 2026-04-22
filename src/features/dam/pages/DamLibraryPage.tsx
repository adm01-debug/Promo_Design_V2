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
import { parseBoolParam } from "../lib/parse-bool-param";
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
const ARCHIVED_ONLY_KEY = "dam-archived-only";
const OCR_ONLY_KEY = "dam-ocr-only";
const PAGINATION_MODE_KEY = "dam-pagination-mode";
const SEARCH_KEY = "dam-search";
const ASSET_TYPES_KEY = "dam-asset-types";
const CLIENT_ID_KEY = "dam-client-id";
const TAGS_KEY = "dam-tags";
const SORT_KEY = "dam-sort";
const LIST_SHOW_SIZE_KEY = "dam-list-show-size";
const SIZE_RANGE_KEY = "dam-size-range";
const UPDATED_RANGE_KEY = "dam-updated-range";

type SizeRangeKey = "all" | "lt1mb" | "1to5mb" | "5to20mb" | "gt20mb";
const SIZE_RANGE_OPTIONS: {
  value: SizeRangeKey;
  label: string;
  min?: number;
  max?: number;
}[] = [
  { value: "all", label: "Qualquer tamanho" },
  { value: "lt1mb", label: "Até 1 MB", max: 1 * 1024 * 1024 },
  { value: "1to5mb", label: "1–5 MB", min: 1 * 1024 * 1024, max: 5 * 1024 * 1024 },
  { value: "5to20mb", label: "5–20 MB", min: 5 * 1024 * 1024, max: 20 * 1024 * 1024 },
  { value: "gt20mb", label: "Acima de 20 MB", min: 20 * 1024 * 1024 },
];

type UpdatedRangeKey = "all" | "24h" | "7d" | "30d" | "90d";
const UPDATED_RANGE_OPTIONS: { value: UpdatedRangeKey; label: string; hours?: number }[] = [
  { value: "all", label: "Qualquer data" },
  { value: "24h", label: "Últimas 24h", hours: 24 },
  { value: "7d", label: "Últimos 7 dias", hours: 24 * 7 },
  { value: "30d", label: "Últimos 30 dias", hours: 24 * 30 },
  { value: "90d", label: "Últimos 90 dias", hours: 24 * 90 },
];

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

type SortValue =
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
const SORT_OPTIONS: { value: SortValue; label: string; sortBy: "created_at" | "updated_at" | "name" | "file_size" | "version" | "relevance"; sortDir: "asc" | "desc" }[] = [
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

export default function DamLibraryPage() {
  const { currentOrgId, can } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activityOpen, setActivityOpen] = useState(false);
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
    const fromUrl = parseBoolParam(searchParams.get("archived"));
    if (fromUrl !== null) return fromUrl;
    return localStorage.getItem(INCLUDE_ARCHIVED_KEY) === "1";
  });
  const [archivedOnly, setArchivedOnly] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const fromUrl = parseBoolParam(searchParams.get("archivedOnly"));
    if (fromUrl !== null) return fromUrl;
    return localStorage.getItem(ARCHIVED_ONLY_KEY) === "1";
  });
  const [ocrOnly, setOcrOnly] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const fromUrl = parseBoolParam(searchParams.get("ocrOnly"));
    if (fromUrl !== null) return fromUrl;
    return localStorage.getItem(OCR_ONLY_KEY) === "1";
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
  const [showSizeColumn, setShowSizeColumn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LIST_SHOW_SIZE_KEY) === "1";
  });
  const [sizeRange, setSizeRange] = useState<SizeRangeKey>(() => {
    const fromUrl = searchParams.get("size") as SizeRangeKey | null;
    if (fromUrl && SIZE_RANGE_OPTIONS.some((o) => o.value === fromUrl)) return fromUrl;
    if (typeof window === "undefined") return "all";
    const ls = localStorage.getItem(SIZE_RANGE_KEY) as SizeRangeKey | null;
    if (ls && SIZE_RANGE_OPTIONS.some((o) => o.value === ls)) return ls;
    return "all";
  });
  useEffect(() => {
    try {
      if (sizeRange !== "all") localStorage.setItem(SIZE_RANGE_KEY, sizeRange);
      else localStorage.removeItem(SIZE_RANGE_KEY);
    } catch {
      /* ignore */
    }
  }, [sizeRange]);
  const [updatedRange, setUpdatedRange] = useState<UpdatedRangeKey>(() => {
    const fromUrl = searchParams.get("updated") as UpdatedRangeKey | null;
    if (fromUrl && UPDATED_RANGE_OPTIONS.some((o) => o.value === fromUrl)) return fromUrl;
    if (typeof window === "undefined") return "all";
    const ls = localStorage.getItem(UPDATED_RANGE_KEY) as UpdatedRangeKey | null;
    if (ls && UPDATED_RANGE_OPTIONS.some((o) => o.value === ls)) return ls;
    return "all";
  });
  useEffect(() => {
    try {
      if (updatedRange !== "all") localStorage.setItem(UPDATED_RANGE_KEY, updatedRange);
      else localStorage.removeItem(UPDATED_RANGE_KEY);
    } catch {
      /* ignore */
    }
  }, [updatedRange]);
  useEffect(() => {
    try {
      if (showSizeColumn) localStorage.setItem(LIST_SHOW_SIZE_KEY, "1");
      else localStorage.removeItem(LIST_SHOW_SIZE_KEY);
    } catch {
      /* ignore */
    }
  }, [showSizeColumn]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [batchOcrOpen, setBatchOcrOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const quickPreview = useQuickPreview();
  const [copiedLink, setCopiedLink] = useState(false);
  // Captured ONCE at mount: was the Arquivados toggle activated through the
  // URL (?archived=...)? Used to surface a subtle "applied via link" hint.
  const [archivedFromUrlAtMount] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return parseBoolParam(searchParams.get("archived")) === true;
  });
  const [archivedUrlHintDismissed, setArchivedUrlHintDismissed] = useState(false);
  // First-time-only Tooltip on the Arquivados toggle: opens once when the
  // user toggles it for the first time this session, then never reopens.
  const [archivedTooltipOpen, setArchivedTooltipOpen] = useState(false);
  const [archivedTooltipShown, setArchivedTooltipShown] = useState(false);
  // Single source of truth for the SR-only live region. We compose a single
  // sentence per phase so screen readers don't announce overlapping fragments.
  const [a11yStatus, setA11yStatus] = useState<string>("");
  const handleIncludeArchivedToggle = (next: boolean) => {
    setIncludeArchived(next);
    if (!archivedTooltipShown) {
      setArchivedTooltipShown(true);
      setArchivedTooltipOpen(true);
      window.setTimeout(() => setArchivedTooltipOpen(false), 2500);
    }
  };

  // Copies the current full URL (including all active filters and toggles like
  // ?archived=1) to the clipboard so the user can share the exact view.
  const handleCopyLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedLink(true);
      toast.success("Link copiado", {
        description: "URL com filtros atuais copiada para a área de transferência.",
      });
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  // Wipes every dam-* preference persisted in localStorage and returns all
  // toggles/filters/pagination to factory defaults. URL search params are
  // cleared so reload starts clean.
  const handleResetPreferences = () => {
    const KEYS = [
      VIEW_MODE_KEY,
      PAGE_SIZE_KEY,
      PAGE_KEY,
      TAGS_MODE_KEY,
      INCLUDE_ARCHIVED_KEY,
      ARCHIVED_ONLY_KEY,
      OCR_ONLY_KEY,
      PAGINATION_MODE_KEY,
      SEARCH_KEY,
      ASSET_TYPES_KEY,
      CLIENT_ID_KEY,
      TAGS_KEY,
      SORT_KEY,
      LIST_SHOW_SIZE_KEY,
      SIZE_RANGE_KEY,
      UPDATED_RANGE_KEY,
    ];
    for (const k of KEYS) {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    }
    setSearch("");
    setAssetTypes([]);
    setClientId("all");
    setSelectedTags([]);
    setTagsMode("all");
    setIncludeArchived(false);
    setArchivedOnly(false);
    setOcrOnly(false);
    setSort("created_desc");
    setPage(1);
    setPageSize(24);
    setPaginationMode("pages");
    setViewMode("grid");
    setSizeRange("all");
    setUpdatedRange("all");
    setShowSizeColumn(false);
    setSearchParams(new URLSearchParams(), { replace: true });
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
    includeArchived;

  const canUpload = can(["owner", "admin", "designer"]);

  const clearAllFilters = () => {
    setSearch("");
    setAssetTypes([]);
    setClientId("all");
    setSelectedTags([]);
    setIncludeArchived(false);
    setSizeRange("all");
    setUpdatedRange("all");
    writeLS(SEARCH_KEY, null);
    writeLS(ASSET_TYPES_KEY, null);
    writeLS(CLIENT_ID_KEY, null);
    writeLS(TAGS_KEY, null);
    writeLS(SORT_KEY, null);
    writeLS(INCLUDE_ARCHIVED_KEY, null);
    try { localStorage.removeItem(SIZE_RANGE_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(UPDATED_RANGE_KEY); } catch { /* ignore */ }
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
    try { localStorage.setItem(ARCHIVED_ONLY_KEY, archivedOnly ? "1" : "0"); } catch { /* ignore */ }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (archivedOnly) next.set("archivedOnly", "1");
      else next.delete("archivedOnly");
      return next;
    }, { replace: true });
  }, [archivedOnly, setSearchParams]);

  useEffect(() => {
    try { localStorage.setItem(OCR_ONLY_KEY, ocrOnly ? "1" : "0"); } catch { /* ignore */ }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (ocrOnly) next.set("ocrOnly", "1");
      else next.delete("ocrOnly");
      return next;
    }, { replace: true });
  }, [ocrOnly, setSearchParams]);

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
    try {
      if (page > 1 && paginationMode === "pages") localStorage.setItem(PAGE_KEY, String(page));
      else localStorage.removeItem(PAGE_KEY);
    } catch { /* ignore */ }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (page > 1 && paginationMode === "pages") next.set("page", String(page));
      else next.delete("page");
      if (pageSize !== 24) next.set("pageSize", String(pageSize));
      else next.delete("pageSize");
      return next;
    }, { replace: false });
  }, [page, pageSize, paginationMode, setSearchParams]);

  // React to browser back/forward: re-sync page & pageSize from URL.
  useEffect(() => {
    const urlPage = Number(searchParams.get("page"));
    const nextPage = Number.isFinite(urlPage) && urlPage >= 1 ? urlPage : 1;
    if (nextPage !== page) setPage(nextPage);
    const urlSize = Number(searchParams.get("pageSize"));
    const nextSize = Number.isFinite(urlSize) && urlSize > 0 ? urlSize : 24;
    if (nextSize !== pageSize) setPageSize(nextSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      if (sizeRange !== "all") next.set("size", sizeRange); else next.delete("size");
      if (updatedRange !== "all") next.set("updated", updatedRange); else next.delete("updated");
      return next;
    }, { replace: true });
  }, [debouncedSearch, assetTypes, clientId, selectedTags, tagsMode, sort, sizeRange, updatedRange, setSearchParams]);

  // If user clears search while sorting by relevance, fall back to "Mais recentes"
  useEffect(() => {
    if (sort === "relevance" && !debouncedSearch.trim()) setSort("created_desc");
  }, [debouncedSearch, sort]);

  // Reset to page 1 when filters/search/sort/pageSize change
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [debouncedSearch, assetTypes, clientId, selectedTags, tagsMode, includeArchived, archivedOnly, sort, pageSize, sizeRange, updatedRange]);

  const filters = useMemo(
    () => {
      const opt = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[1];
      const range = SIZE_RANGE_OPTIONS.find((o) => o.value === sizeRange);
      const updRange = UPDATED_RANGE_OPTIONS.find((o) => o.value === updatedRange);
      const updatedAfter = updRange?.hours
        ? new Date(Date.now() - updRange.hours * 60 * 60 * 1000).toISOString()
        : undefined;
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
        minSize: range?.min,
        maxSize: range?.max,
        updatedAfter,
      };
    },
    [assetTypes, clientId, selectedTags, tagsMode, includeArchived, archivedOnly, debouncedSearch, sort, page, pageSize, sizeRange, updatedRange],
  );

  const { assets, total, totalPages, isLoading, isFetching, restore } = useAssets(currentOrgId, filters);
  // Track which page the displayed `assets` correspond to (after a successful fetch).
  // While the current `page` doesn't match the last loaded page, we are paginating → show skeleton.
  const [loadedPage, setLoadedPage] = useState<number>(page);
  useEffect(() => {
    if (!isFetching) setLoadedPage(page);
  }, [isFetching, page]);
  const isPaginating = isFetching && !isLoading && loadedPage !== page;

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

  // Cache last-known totals so the counter stays stable during refetches and never
  // flickers back to "Carregando..." when paginating or filtering.
  const lastTotalsRef = useRef<{ total: number; totalPages: number; page: number; pageSize: number; displayedLen: number } | null>(null);
  if (!isLoading) {
    lastTotalsRef.current = {
      total,
      totalPages,
      page,
      pageSize,
      displayedLen: assets.length,
    };
  }
  const stable = lastTotalsRef.current;

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
          <Select value={sizeRange} onValueChange={(v) => setSizeRange(v as SizeRangeKey)}>
            <SelectTrigger className="w-44" aria-label="Filtrar por tamanho">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          if (!src) return <span>Carregando...</span>;
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
              <span data-testid="dam-results-counter" aria-live="polite">
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
                  aria-live="polite"
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
        viewMode === "list" ? (
          <div className="space-y-2">
            {Array.from({ length: Math.min(pageSize, 24) }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: Math.min(pageSize, 30) }).map((_, i) => (
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
              isFetching && !isLoading && "opacity-60 pointer-events-none",
            )}
            aria-busy={isFetching && !isLoading}
          >
            {isFetching && !isLoading && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-2 rounded-md bg-background/90 backdrop-blur px-2.5 py-1 text-xs text-muted-foreground shadow-sm border">
                <Loader2 className="w-3 h-3 animate-spin" />
                Carregando…
              </div>
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