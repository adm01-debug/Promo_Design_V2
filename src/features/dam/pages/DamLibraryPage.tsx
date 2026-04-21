import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Archive, FolderArchive, LayoutGrid, List, Plus, Eye, ChevronDown, Loader2, FilterX } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useAssets, MIN_SEARCH_LENGTH, type Asset, type AssetType } from "../hooks/use-assets";
import { AssetCard } from "../components/AssetCard";
import { AssetUploadDialog } from "../components/AssetUploadDialog";
import { AssetDetailDrawer } from "../components/AssetDetailDrawer";
import { TagFilter } from "../components/TagFilter";
import { AssetListView } from "../components/AssetListView";
import { ActiveFiltersBar } from "../components/ActiveFiltersBar";
import { useDebounce } from "@/hooks/use-debounce";
import { LAST_ASSET_KEY, LAST_ASSET_TTL_MS } from "./DamPreviewPage";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

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
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : 1;
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

  const archivedCount = useMemo(
    () => displayedAssets.filter((a) => a.is_archived).length,
    [displayedAssets],
  );

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    displayedAssets.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [displayedAssets]);

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
                try {
                  const raw = localStorage.getItem(LAST_ASSET_KEY);
                  if (raw) {
                    const parsed = JSON.parse(raw) as { id?: string; ts?: number };
                    if (parsed?.id && typeof parsed.ts === "number" && Date.now() - parsed.ts < LAST_ASSET_TTL_MS) {
                      sp.set("asset", parsed.id);
                    }
                  }
                } catch { /* ignore */ }
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

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-col max-w-xs w-full">
          <Input
            placeholder="Buscar por nome, descrição ou tag..."
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
          <Toggle
            pressed={includeArchived}
            onPressedChange={setIncludeArchived}
            size="sm"
            variant="outline"
            aria-label="Mostrar arquivados"
            title="Mostrar arquivados"
          >
            <Archive className="w-4 h-4 mr-2" />
            Arquivados
          </Toggle>
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
        onClearAll={() => {
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
        }}
      />

      <div className="text-xs text-muted-foreground">
        {isLoading
          ? "Carregando..."
          : total === 0
            ? "Nenhum asset encontrado"
            : paginationMode === "loadmore"
              ? `Mostrando ${displayedAssets.length} de ${total} ${total === 1 ? "asset" : "assets"}${
                  includeArchived && archivedCount > 0
                    ? ` · ${archivedCount} arquivado${archivedCount > 1 ? "s" : ""}`
                    : ""
                }`
              : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total} ${total === 1 ? "asset" : "assets"}${
                  includeArchived && archivedCount > 0
                    ? ` · ${archivedCount} arquivado${archivedCount > 1 ? "s" : ""} nesta página`
                    : ""
                }`}
      </div>

      {isLoading && displayedAssets.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : displayedAssets.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Nenhum asset encontrado. Faça o upload do primeiro!
        </Card>
      ) : viewMode === "list" ? (
        <AssetListView assets={displayedAssets} clients={clients} onSelect={setSelected} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedAssets.map((a) => (
            <AssetCard key={a.id} asset={a} onClick={() => setSelected(a)} />
          ))}
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

      {paginationMode === "pages" && totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {buildPageList(page, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === page}
                    onClick={(e) => { e.preventDefault(); setPage(p); }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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