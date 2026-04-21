import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TRACKED_FIELDS, FIELD_LABELS, type TrackedField } from "../hooks/use-asset-audit";

interface Props {
  open: boolean;
  onClose: () => void;
  previousValues: Record<string, unknown> | null;
  currentValues: Record<string, unknown> | null;
  changedFields: TrackedField[];
  version: number | null;
}

function renderValue(field: TrackedField, value: unknown) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">vazio</span>;
  }
  if (field === "tags" && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">sem tags</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((t, i) => (
          <Badge key={i} variant="outline" className="text-[10px]">
            {String(t)}
          </Badge>
        ))}
      </div>
    );
  }
  if (field === "dominant_colors" && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">—</span>;
    return (
      <div className="flex gap-1.5">
        {value.map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-7 h-7 rounded border border-border"
              style={{ backgroundColor: String(c) }}
            />
            <span className="text-[9px] font-mono">{String(c)}</span>
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <pre className="text-[11px] whitespace-pre-wrap break-all font-mono">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="text-xs break-all">{String(value)}</span>;
}

function Column({
  values,
  changed,
  variant,
  title,
}: {
  values: Record<string, unknown> | null;
  changed: TrackedField[];
  variant: "before" | "after";
  title: string;
}) {
  const changedSet = new Set(changed);
  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-2",
        variant === "before"
          ? "border-destructive/30 bg-destructive/5"
          : "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <div
        className={cn(
          "text-xs font-medium uppercase tracking-wide mb-1",
          variant === "before" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {title}
      </div>
      {TRACKED_FIELDS.map((field) => {
        const isChanged = changedSet.has(field);
        return (
          <div
            key={field}
            className={cn(
              "px-2 py-1.5 rounded space-y-1",
              isChanged && "bg-amber-500/15 border border-amber-500/30",
            )}
          >
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {FIELD_LABELS[field]}
            </div>
            <div>{renderValue(field, values?.[field])}</div>
          </div>
        );
      })}
    </div>
  );
}

export function AssetMetadataDiffDialog({
  open,
  onClose,
  previousValues,
  currentValues,
  changedFields,
  version,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Comparar metadados</span>
            {version !== null && (
              <Badge variant="secondary" className="text-[10px]">
                v{version}
              </Badge>
            )}
            {changedFields.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                {changedFields.length} {changedFields.length === 1 ? "campo alterado" : "campos alterados"}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 overflow-auto pr-1">
          <Column values={previousValues} changed={changedFields} variant="before" title="Antes" />
          <Column values={currentValues} changed={changedFields} variant="after" title="Depois" />
        </div>
      </DialogContent>
    </Dialog>
  );
}