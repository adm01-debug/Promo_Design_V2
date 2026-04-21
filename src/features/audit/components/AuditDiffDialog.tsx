import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { AuditEntry } from "../hooks/use-audit-log";
import { cn } from "@/lib/utils";

interface Props {
  entry: AuditEntry | null;
  userLabel?: string;
  onClose: () => void;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function changedKeys(oldV: unknown, newV: unknown): Set<string> {
  const s = new Set<string>();
  if (!isObj(oldV) || !isObj(newV)) return s;
  const keys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
  for (const k of keys) {
    if (JSON.stringify(oldV[k]) !== JSON.stringify(newV[k])) s.add(k);
  }
  return s;
}

function renderJson(value: unknown, highlight: Set<string>): React.ReactNode {
  if (!isObj(value)) {
    return <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>;
  }
  return (
    <div className="text-xs font-mono space-y-0.5">
      {Object.entries(value).map(([k, v]) => (
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

const ACTION_VARIANT: Record<AuditEntry["action"], "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

export function AuditDiffDialog({ entry, userLabel, onClose }: Props) {
  const open = !!entry;
  if (!entry) return null;
  const highlight = entry.action === "UPDATE" ? changedKeys(entry.old_values, entry.new_values) : new Set<string>();
  const showOld = entry.action !== "INSERT";
  const showNew = entry.action !== "DELETE";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Badge variant={ACTION_VARIANT[entry.action]}>{entry.action}</Badge>
            <span className="font-mono text-sm">{entry.table_name}</span>
            {entry.record_id && (
              <span className="font-mono text-xs text-muted-foreground">{entry.record_id}</span>
            )}
          </DialogTitle>
          <div className="text-xs text-muted-foreground flex gap-3 pt-1">
            <span>{format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss")}</span>
            <span className="font-mono">{userLabel || entry.user_id}</span>
          </div>
        </DialogHeader>
        <div className={cn("grid gap-3 overflow-auto pr-1", showOld && showNew ? "grid-cols-2" : "grid-cols-1")}>
          {showOld && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-destructive mb-2">Antes</div>
              {renderJson(entry.old_values, highlight)}
            </div>
          )}
          {showNew && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">
                Depois
              </div>
              {renderJson(entry.new_values, highlight)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}