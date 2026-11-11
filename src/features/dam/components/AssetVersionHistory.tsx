import { useState, useEffect } from "react";
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
import { useAssetVersions, type Asset } from "../hooks/use-assets";
import { History, Search, X, List, GitCommit } from "lucide-react";
import { AssetAuditTrail } from "./AssetAuditTrail";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useVersionFilters,
  type SortKey,
  type ViewMode,
  type TimelineGrouping,
} from "../hooks/use-version-filters";
import { VersionTimeline } from "./version-history/VersionTimeline";
import {
  VersionThumb,
  VersionDescription,
  CopyVersionLinkButton,
  formatDateTime,
} from "./version-history/VersionHistoryItems";

interface Props {
  asset: Asset;
  onSelect: (a: Asset) => void;
}

const PAGE_SIZE = 10;

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function AssetVersionHistory({ asset, onSelect }: Props) {
  const { data, isLoading } = useAssetVersions(asset);
  const versions = data ?? [];
  const maxVersion = versions.reduce((m, v) => Math.max(m, v.version), 0);

  const {
    filters,
    setFilters,
    view,
    setView,
    timelineFollowSort,
    setTimelineFollowSort,
    timelineGrouping,
    setTimelineGrouping,
    authors,
    filteredVersions,
    hasActiveFilters,
    resetFilters,
  } = useVersionFilters(versions);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination whenever filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const visible = filteredVersions.slice(0, visibleCount);
  const remaining = Math.max(0, filteredVersions.length - visible.length);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
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
            {filteredVersions.length} de {versions.length}{" "}
            {versions.length === 1 ? "versão" : "versões"}
          </span>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetFilters}>
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
                Seguir ordenação selecionada{" "}
                {timelineFollowSort ? "" : "(padrão: mais recente → mais antiga)"}
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
                <ToggleGroupItem value="auto" className="h-7 px-2 text-[11px]">
                  Auto
                </ToggleGroupItem>
                <ToggleGroupItem value="month" className="h-7 px-2 text-[11px]">
                  Mês
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="h-7 px-2 text-[11px]">
                  Semana
                </ToggleGroupItem>
                <ToggleGroupItem value="day" className="h-7 px-2 text-[11px]">
                  Dia
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}
      </div>

      {filteredVersions.length === 0 ? (
        <div className="text-sm text-muted-foreground flex flex-col items-center gap-2 py-6 border border-dashed rounded-md">
          <History className="w-5 h-5" />
          Nenhuma versão corresponde aos filtros
          <Button variant="outline" size="sm" onClick={resetFilters}>
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
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px]">
                            atual
                          </Badge>
                        )}
                        {isSelected && !isCurrent && (
                          <Badge variant="outline" className="text-[10px]">
                            aberta
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        v{v.version} · {formatDateTime(v.created_at)} · {shortId(v.created_by)}
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

      {filteredVersions.length > 0 && remaining > 0 && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Carregar mais ({Math.min(PAGE_SIZE, remaining)} de {remaining} restante
            {remaining > 1 ? "s" : ""})
          </Button>
          {filteredVersions.length > PAGE_SIZE * 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setVisibleCount(filteredVersions.length)}
            >
              Mostrar todas ({filteredVersions.length})
            </Button>
          )}
        </div>
      )}

      {filteredVersions.length > 0 && remaining === 0 && filteredVersions.length > PAGE_SIZE && (
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
