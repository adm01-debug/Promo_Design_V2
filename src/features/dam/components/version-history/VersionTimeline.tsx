import { useMemo } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Asset } from "../../hooks/use-assets";
import type { SortKey, TimelineGrouping } from "../../hooks/use-version-filters";
import {
  VersionThumb,
  CopyVersionLinkButton,
  VersionDescription,
  VersionNodePreview,
  formatDateTime,
} from "./VersionHistoryItems";

interface VersionTimelineProps {
  entries: Asset[];
  maxVersion: number;
  currentAssetId: string;
  onSelect: (a: Asset) => void;
  followSort?: boolean;
  sort?: SortKey;
  grouping?: TimelineGrouping;
}

type ResolvedGranularity = "month" | "week" | "day";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day + 6) % 7;
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
    const label = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
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

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function VersionTimeline({
  entries,
  maxVersion,
  currentAssetId,
  onSelect,
  followSort,
  sort,
  grouping,
}: VersionTimelineProps) {
  const groups = useMemo(
    () => groupEntries(entries, { followSort, sort, grouping }),
    [entries, followSort, sort, grouping],
  );

  return (
    <div className="relative">
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
                              <Badge
                                variant={isCurrent ? "default" : "secondary"}
                                className="text-[10px] shrink-0"
                              >
                                v{v.version}
                              </Badge>
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
