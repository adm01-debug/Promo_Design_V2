import { cn } from "@/lib/utils";
import type { AuditAction } from "../hooks/use-audit-log";

export interface AuditDiffViewProps {
  oldValues: unknown;
  newValues: unknown;
  action: AuditAction;
  showOnlyChanged?: boolean;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function changedKeys(oldV: unknown, newV: unknown): Set<string> {
  const s = new Set<string>();
  if (!isObj(oldV) || !isObj(newV)) return s;
  const keys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
  for (const k of keys) {
    if (JSON.stringify(oldV[k]) !== JSON.stringify(newV[k])) s.add(k);
  }
  return s;
}

function renderJson(value: unknown, highlight: Set<string>, onlyChanged: boolean): React.ReactNode {
  if (!isObj(value)) {
    return (
      <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
    );
  }
  const entries = Object.entries(value).filter(([k]) =>
    onlyChanged && highlight.size > 0 ? highlight.has(k) : true,
  );
  if (entries.length === 0) {
    return <div className="text-xs text-muted-foreground italic">Sem campos para exibir.</div>;
  }
  return (
    <div className="text-xs font-mono space-y-0.5">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className={cn(
            "px-2 py-1 rounded",
            highlight.has(k) && "bg-amber-500/15 border border-amber-500/30",
          )}
        >
          <span className="text-muted-foreground">{k}:</span>{" "}
          <span className="break-all">{JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  );
}

export function AuditDiffView({
  oldValues,
  newValues,
  action,
  showOnlyChanged = false,
}: AuditDiffViewProps) {
  const highlight = action === "UPDATE" ? changedKeys(oldValues, newValues) : new Set<string>();
  const showOld = action !== "INSERT";
  const showNew = action !== "DELETE";

  return (
    <div
      className={cn(
        "grid gap-3",
        showOld && showNew ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1",
      )}
    >
      {showOld && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-destructive mb-2">
            Antes
          </div>
          {renderJson(oldValues, highlight, showOnlyChanged)}
        </div>
      )}
      {showNew && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">
            Depois
          </div>
          {renderJson(newValues, highlight, showOnlyChanged)}
        </div>
      )}
    </div>
  );
}
