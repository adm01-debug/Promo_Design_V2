import { useMemo, useState } from "react";
import { format } from "date-fns";
import { History, ChevronDown, GitCompare, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  useAssetAudit,
  FIELD_LABELS,
  type AssetAuditEntry,
  type TrackedField,
} from "../hooks/use-asset-audit";
import type { Asset } from "../hooks/use-assets";
import { AssetMetadataDiffDialog } from "./AssetMetadataDiffDialog";

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

const ACTION_META: Record<
  AssetAuditEntry["action"],
  { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Plus }
> = {
  INSERT: { label: "Criado", variant: "default", icon: Plus },
  UPDATE: { label: "Atualizado", variant: "secondary", icon: Pencil },
  DELETE: { label: "Removido", variant: "destructive", icon: Trash2 },
};

interface Props {
  asset: Asset;
}

export function AssetAuditTrail({ asset }: Props) {
  const { data, isLoading } = useAssetAudit(asset);
  const [open, setOpen] = useState(false);
  const [diff, setDiff] = useState<AssetAuditEntry | null>(null);

  // Show newest first
  const entries = useMemo(() => {
    const list = [...(data ?? [])];
    return list.reverse();
  }, [data]);

  // Build prev-state lookup (per asset_id) so UPDATE rows can compare against
  // the most recent prior snapshot for the same record. We rely on the asc
  // order from the hook before reversing.
  const prevSnapshots = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    const ascending = data ?? [];
    const result = new Map<string, Record<string, unknown> | null>();
    for (const e of ascending) {
      const prev = map.get(e.asset_id) ?? null;
      result.set(e.id, prev);
      if (e.new_values) map.set(e.asset_id, e.new_values);
    }
    return result;
  }, [data]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-4 border-t pt-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between text-sm font-medium hover:text-foreground/80 transition-colors"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico de auditoria
            {entries.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {entries.length}
              </Badge>
            )}
          </span>
          <ChevronDown
            className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-md">
            Sem registros de auditoria para esta versão
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => {
              const meta = ACTION_META[e.action];
              const Icon = meta.icon;
              const prev = prevSnapshots.get(e.id) ?? null;
              const canCompare = e.action === "UPDATE" && !!prev && !!e.new_values;
              return (
                <li
                  key={e.id}
                  className="rounded-md border border-border p-2.5 space-y-2 bg-card/50"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant={meta.variant} className="text-[10px] gap-1">
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </Badge>
                      {e.version !== null && (
                        <Badge variant="outline" className="text-[10px]">
                          v{e.version}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {shortId(e.user_id)}
                      </span>
                    </div>
                    {canCompare && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setDiff(e)}
                      >
                        <GitCompare className="w-3 h-3 mr-1" />
                        Comparar
                      </Button>
                    )}
                  </div>
                  {e.action === "UPDATE" && e.changed_fields.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {e.changed_fields.map((f: TrackedField) => (
                        <Badge
                          key={f}
                          variant="outline"
                          className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                        >
                          {FIELD_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {e.action === "UPDATE" && e.changed_fields.length === 0 && (
                    <div className="text-[11px] text-muted-foreground italic">
                      Sem mudanças nos campos rastreados
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleContent>

      <AssetMetadataDiffDialog
        open={!!diff}
        onClose={() => setDiff(null)}
        previousValues={diff ? prevSnapshots.get(diff.id) ?? null : null}
        currentValues={diff?.new_values ?? null}
        changedFields={diff?.changed_fields ?? []}
        version={diff?.version ?? null}
      />
    </Collapsible>
  );
}