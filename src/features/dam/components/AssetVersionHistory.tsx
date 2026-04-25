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
import { History, Search, X, MessageSquare, MessageSquareDashed, Link2, Check, List, GitCommit } from "lucide-react";
import { AssetAuditTrail } from "./AssetAuditTrail";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
const VIEW_STORAGE_KEY = "dam:version-history-view";
const TIMELINE_FOLLOW_SORT_KEY = "dam:version-history-timeline-follow-sort";
const TIMELINE_GROUPING_KEY = "dam:version-history-timeline-grouping";
const PAGE_SIZE = 10;

type ViewMode = "list" | "timeline";
type TimelineGrouping = "auto" | "month" | "week" | "day";

function loadView(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return raw === "timeline" ? "timeline" : "list";
  } catch {
    return "list";
  }
}

function loadTimelineFollowSort(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TIMELINE_FOLLOW_SORT_KEY) === "1";
  } catch {
    return false;
  }
}

function loadTimelineGrouping(): TimelineGrouping {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = window.localStorage.getItem(TIMELINE_GROUPING_KEY);
    return raw === "month" || raw === "week" || raw === "day" || raw === "auto" ? raw : "auto";
  } catch {
    return "auto";
  }
}

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [view, setView] = useState<ViewMode>(() => loadView());
  const [timelineFollowSort, setTimelineFollowSort] = useState<boolean>(() => loadTimelineFollowSort());
  const [timelineGrouping, setTimelineGrouping] = useState<TimelineGrouping>(() => loadTimelineGrouping());

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // ignore
    }
  }, [view]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TIMELINE_FOLLOW_SORT_KEY, timelineFollowSort ? "1" : "0");
    } catch {
      // ignore
    }
  }, [timelineFollowSort]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TIMELINE_GROUPING_KEY, timelineGrouping);
    } catch {
      // ignore
    }
  }, [timelineGrouping]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore quota / privacy mode errors
    }
  }, [filters]);

  // Reset pagination whenever filters change so the user starts from the top
  // of the freshly filtered list.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
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

  const visible = filtered.slice(0, visibleCount);
  const remaining = Math.max(0, filtered.length - visible.length);

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
          <div className="flex items-center gap-1">
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
            <ToggleGroup
              type="single"
              size="sm"
              value={view}
              onValueChange={(v) => v && setView(v as ViewMode)}
              className="h-7"
              aria-label="Modo de visualização do histórico"
            >
              <ToggleGroupItem value="list" className="h-7 px-2" aria-label="Lista">
                <List className="w-3.5 h-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="timeline" className="h-7 px-2" aria-label="Timeline">
                <GitCommit className="w-3.5 h-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {view === "timeline" && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Switch
                id="timeline-follow-sort"
                checked={timelineFollowSort}
                onCheckedChange={setTimelineFollowSort}
                className="scale-75 origin-left"
              />
              <Label htmlFor="timeline-follow-sort" className="cursor-pointer text-xs font-normal">
                Seguir ordenação selecionada {timelineFollowSort ? "" : "(padrão: mais recente → mais antiga)"}
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Agrupar por:</span>
              <ToggleGroup
                type="single"
                size="sm"
                value={timelineGrouping}
                onValueChange={(v) => v && setTimelineGrouping(v as TimelineGrouping)}
                className="h-7"
                aria-label="Granularidade do agrupamento da timeline"
              >
                <ToggleGroupItem value="auto" className="h-7 px-2 text-[11px]">Auto</ToggleGroupItem>
                <ToggleGroupItem value="month" className="h-7 px-2 text-[11px]">Mês</ToggleGroupItem>
                <ToggleGroupItem value="week" className="h-7 px-2 text-[11px]">Semana</ToggleGroupItem>
                <ToggleGroupItem value="day" className="h-7 px-2 text-[11px]">Dia</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}
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
      ) : view === "timeline" ? (
        <VersionTimeline
          entries={visible}
          maxVersion={maxVersion}
          currentAssetId={asset.id}
          onSelect={onSelect}
          followSort={timelineFollowSort}
          sort={filters.sort}
          grouping={timelineGrouping}
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((v) => {
            const isCurrent = v.version === maxVersion;
            const isSelected = v.id === asset.id;
            return (
              <li key={v.id}>
                <div
                  className={`group w-full flex items-center gap-3 p-2 rounded-md border transition-colors hover:bg-accent ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 bg-accent/50"
                      : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(v)}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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
                  <CopyVersionLinkButton asset={v} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > 0 && remaining > 0 && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Carregar mais ({Math.min(PAGE_SIZE, remaining)} de {remaining} restante{remaining > 1 ? "s" : ""})
          </Button>
          {filtered.length > PAGE_SIZE * 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setVisibleCount(filtered.length)}
            >
              Mostrar todas ({filtered.length})
            </Button>
          )}
        </div>
      )}

      {filtered.length > 0 && remaining === 0 && filtered.length > PAGE_SIZE && (
        <div className="flex justify-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setVisibleCount(PAGE_SIZE)}
          >
            Recolher
          </Button>
        </div>
      )}

      <AssetAuditTrail asset={asset} />
    </div>
  );
}

function CopyVersionLinkButton({ asset }: { asset: Asset }) {
  const [copied, setCopied] = useState(false);

  const buildShareValue = () => {
    // Prefer a deep link to this exact version; fall back to a portable identifier
    // (e.g. when running in tests or non-browser env).
    const identifier = `asset:${asset.id}@v${asset.version}`;
    if (typeof window === "undefined") return identifier;
    const url = new URL(window.location.href);
    url.searchParams.set("asset", asset.id);
    url.searchParams.set("v", String(asset.version));
    return url.toString();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const value = buildShareValue();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Link da v${asset.version} copiado`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100"
            onClick={handleCopy}
            aria-label={`Copiar link da versão ${asset.version}`}
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="end">
          {copied ? "Copiado!" : `Copiar link da v${asset.version}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

interface VersionTimelineProps {

function VersionNodePreview({ asset, isCurrent }: { asset: Asset; isCurrent: boolean }) {
  const text = (asset.description ?? "").trim();
  const hasText = text.length > 0;
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-1.5 font-medium">
        <span>v{asset.version}</span>
        {isCurrent && <span className="text-[10px] uppercase tracking-wide opacity-80">atual</span>}
      </div>
      <div className="opacity-80">{formatDateTime(asset.created_at)}</div>
      <div className={hasText ? "whitespace-pre-wrap" : "italic opacity-70"}>
        {hasText ? text : "Sem comentário"}
      </div>
    </div>
  );
}

interface VersionTimelineProps {
  entries: Asset[];
  maxVersion: number;
  currentAssetId: string;
  onSelect: (a: Asset) => void;
  followSort?: boolean;
  sort?: SortKey;
  grouping?: TimelineGrouping;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ResolvedGranularity = "month" | "week" | "day";

function startOfWeek(d: Date): Date {
  // ISO week starts on Monday
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}

function resolveGranularity(entries: Asset[], grouping: TimelineGrouping): ResolvedGranularity {
  if (grouping !== "auto") return grouping;
  if (entries.length < 2) return "month";
  const times = entries.map((e) => new Date(e.created_at).getTime());
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  if (spanDays <= 7) return "day";
  if (spanDays <= 60) return "week";
  return "month";
}

function bucketFor(date: Date, gran: ResolvedGranularity): { key: string; label: string } {
  if (gran === "day") {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const label = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    return { key, label };
  }
  if (gran === "week") {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const key = `W-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    const label = `Semana de ${fmt(start)} – ${fmt(end)} ${start.getFullYear()}`;
    return { key, label };
  }
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { key, label };
}

function groupEntries(
  entries: Asset[],
  options?: { followSort?: boolean; sort?: SortKey; grouping?: TimelineGrouping },
): Array<{ key: string; label: string; items: Asset[] }> {
  // By default the timeline reads newest-first (chronological story). When the
  // user opts in to "follow sort", we preserve the order coming from `entries`
  // so the grouping mirrors the active sort (date or version, asc or desc).
  const sorted = options?.followSort
    ? [...entries]
    : [...entries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  const gran = resolveGranularity(entries, options?.grouping ?? "auto");
  const groups = new Map<string, { key: string; label: string; items: Asset[] }>();
  for (const v of sorted) {
    const d = new Date(v.created_at);
    const { key, label } = bucketFor(d, gran);
    const existing = groups.get(key);
    if (existing) existing.items.push(v);
    else groups.set(key, { key, label, items: [v] });
  }
  return Array.from(groups.values());
}

function VersionTimeline({ entries, maxVersion, currentAssetId, onSelect, followSort, sort, grouping }: VersionTimelineProps) {
  const groups = useMemo(
    () => groupEntries(entries, { followSort, sort, grouping }),
    [entries, followSort, sort, grouping],
  );

  return (
    <div className="relative">
      {/* Vertical spine */}
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />

      <ol className="space-y-5">
        {groups.map((group) => (
          <li key={group.key} className="space-y-3">
            <div className="relative pl-10">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">
                {group.label}
              </span>
            </div>

            <ol className="space-y-3">
              {group.items.map((v) => {
                const isCurrent = v.version === maxVersion;
                const isSelected = v.id === currentAssetId;
                return (
                  <li key={v.id} className="relative pl-10">
                    {/* Node dot — hover/focus para preview rápido */}
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            tabIndex={0}
                            aria-label={`Pré-visualização da versão ${v.version}`}
                            className={`absolute left-[8px] top-3 w-4 h-4 rounded-full border-2 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              isSelected
                                ? "bg-primary border-primary ring-4 ring-primary/20"
                                : isCurrent
                                  ? "bg-background border-primary"
                                  : "bg-background border-border"
                            }`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="right" align="start" className="max-w-xs">
                          <VersionNodePreview asset={v} isCurrent={isCurrent} />
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div
                      className={`group rounded-md border p-2 transition-colors hover:bg-accent ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 bg-accent/50"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onSelect(v)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                        >
                          <VersionThumb asset={v} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={isCurrent ? "default" : "secondary"} className="text-[10px] shrink-0">
                                v{v.version}
                              </Badge>
                              <span className="font-medium text-sm truncate">{v.name}</span>
                              {isCurrent && (
                                <Badge variant="default" className="text-[10px]">atual</Badge>
                              )}
                              {isSelected && !isCurrent && (
                                <Badge variant="outline" className="text-[10px]">aberta</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(v.created_at)} · {shortId(v.created_by)}
                            </div>
                            <VersionDescription description={v.description} />
                          </div>
                        </button>
                        <CopyVersionLinkButton asset={v} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}