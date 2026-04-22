import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssetVersions, type Asset, getAssetSignedUrl } from "../hooks/use-assets";
import { History, Search, X, MessageSquare, MessageSquareDashed } from "lucide-react";
import { AssetAuditTrail } from "./AssetAuditTrail";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  asset: Asset;
  onSelect: (a: Asset) => void;
}

type SortKey = "version_desc" | "version_asc" | "date_desc" | "date_asc";

interface VersionFilters {
  query: string;
  author: string; // "all" or created_by id
  sort: SortKey;
}

const DEFAULT_FILTERS: VersionFilters = {
  query: "",
  author: "all",
  sort: "version_desc",
};

const STORAGE_KEY = "dam:version-history-filters";

function loadFilters(): VersionFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<VersionFilters>;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      author: typeof parsed.author === "string" ? parsed.author : "all",
      sort:
        parsed.sort === "version_asc" ||
        parsed.sort === "date_desc" ||
        parsed.sort === "date_asc" ||
        parsed.sort === "version_desc"
          ? parsed.sort
          : "version_desc",
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function VersionThumb({ asset }: { asset: Asset }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const path = asset.thumbnail_path ?? asset.file_path;
    if (!(asset.mime_type ?? "").startsWith("image/")) return;
    getAssetSignedUrl(path, 3600).then((u) => !cancelled && setUrl(u));
    return () => { cancelled = true; };
  }, [asset]);
  if (!url) return <div className="w-12 h-12 rounded bg-muted" />;
  return <img src={url} alt={asset.name} className="w-12 h-12 rounded object-cover bg-muted" />;
}

export function AssetVersionHistory({ asset, onSelect }: Props) {
  const { data, isLoading } = useAssetVersions(asset);
  const versions = data ?? [];
  const maxVersion = versions.reduce((m, v) => Math.max(m, v.version), 0);

  const [filters, setFilters] = useState<VersionFilters>(() => loadFilters());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [filters]);

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of versions) {
      if (!map.has(v.created_by)) map.set(v.created_by, shortId(v.created_by));
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [versions]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase().replace(/^v/, "");
    let list = versions.filter((v) => {
      if (filters.author !== "all" && v.created_by !== filters.author) return false;
      if (!q) return true;
      if (String(v.version).startsWith(q)) return true;
      if (v.name.toLowerCase().includes(filters.query.trim().toLowerCase())) return true;
      return false;
    });
    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case "version_asc":
          return a.version - b.version;
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "version_desc":
        default:
          return b.version - a.version;
      }
    });
    return list;
  }, [versions, filters]);

  const hasActiveFilters =
    filters.query.trim() !== "" || filters.author !== "all" || filters.sort !== "version_desc";

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (versions.length <= 1) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2 py-3">
        <History className="w-4 h-4" />
        Nenhuma versão anterior. Use "Nova versão" para criar uma.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Buscar por versão (v3) ou nome…"
            className="pl-8 h-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.author}
            onValueChange={(v) => setFilters((f) => ({ ...f, author: v }))}
          >
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Autor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os autores</SelectItem>
              {authors.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.sort}
            onValueChange={(v) => setFilters((f) => ({ ...f, sort: v as SortKey }))}
          >
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="version_desc">Versão (maior → menor)</SelectItem>
              <SelectItem value="version_asc">Versão (menor → maior)</SelectItem>
              <SelectItem value="date_desc">Data (mais recente)</SelectItem>
              <SelectItem value="date_asc">Data (mais antiga)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filtered.length} de {versions.length} {versions.length === 1 ? "versão" : "versões"}
          </span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              <X className="w-3 h-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground flex flex-col items-center gap-2 py-6 border border-dashed rounded-md">
          <History className="w-5 h-5" />
          Nenhuma versão corresponde aos filtros
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((v) => {
            const isCurrent = v.version === maxVersion;
            const isSelected = v.id === asset.id;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onSelect(v)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md border text-left transition-colors hover:bg-accent ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 bg-accent/50"
                      : "border-border"
                  }`}
                >
                  <VersionThumb asset={v} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{v.name}</span>
                      {isCurrent && <Badge variant="default" className="text-[10px]">atual</Badge>}
                      {isSelected && !isCurrent && (
                        <Badge variant="outline" className="text-[10px]">aberta</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      v{v.version} · {new Date(v.created_at).toLocaleDateString("pt-BR")} · {shortId(v.created_by)}
                    </div>
                    <VersionDescription description={v.description} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AssetAuditTrail asset={asset} />
    </div>
  );
}

function VersionDescription({ description }: { description: string | null }) {
  const text = (description ?? "").trim();
  const hasText = text.length > 0;
  const Icon = hasText ? MessageSquare : MessageSquareDashed;
  const label = hasText ? text : "Sem comentário";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`mt-1 flex items-start gap-1.5 text-xs ${
              hasText ? "text-foreground/80" : "text-muted-foreground italic"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
            <span className="truncate">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs whitespace-pre-wrap">
          {hasText ? text : "Nenhuma descrição foi adicionada para esta versão."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}