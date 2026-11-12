import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { AuditEntry } from "../hooks/use-audit-log";
import { AuditDiffView } from "./AuditDiffView";

interface Props {
  entry: AuditEntry | null;
  userLabel?: string;
  onClose: () => void;
}

const ACTION_VARIANT: Record<AuditEntry["action"], "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

export function AuditDiffDialog({ entry, userLabel, onClose }: Props) {
  const open = !!entry;
  if (!entry) return null;

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
          <div className="text-xs text-muted-foreground flex gap-3 pt-1 items-center flex-wrap">
            <span>{format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss")}</span>
            <span className="font-mono">{userLabel || entry.user_id}</span>
            <Button asChild size="sm" variant="ghost" className="h-7 px-2 ml-auto">
              <Link to={`/audit/event/${entry.id}`} onClick={onClose}>
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir página completa
              </Link>
            </Button>
          </div>
        </DialogHeader>
        <div className="overflow-auto pr-1">
          <AuditDiffView
            oldValues={entry.old_values}
            newValues={entry.new_values}
            action={entry.action}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
