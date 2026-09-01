import { useExportQueue, type ExportJob } from "../hooks/use-export-queue";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, XCircle, CheckCircle2, AlertCircle, Loader2, Trash2, ChevronDown, ChevronUp, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

function statusIcon(s: ExportJob["status"]) {
  if (s === "running" || s === "queued") return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
  if (s === "done") return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />;
  if (s === "canceled") return <Ban className="w-3.5 h-3.5 text-muted-foreground" />;
  return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
}

function statusLabel(s: ExportJob["status"]): string {
  switch (s) {
    case "queued": return "Na fila";
    case "running": return "Em andamento";
    case "done": return "Concluído";
    case "canceled": return "Cancelado";
    case "error": return "Erro";
  }
}

function JobRow({ job }: { job: ExportJob }) {
  const cancel = useExportQueue((s) => s.cancel);
  const remove = useExportQueue((s) => s.remove);
  const pct = job.total > 0 ? Math.round((job.done / job.total) * 100) : 0;
  const finished = job.status === "done" || job.status === "canceled" || job.status === "error";
  return (
    <div className="px-3 py-2 border-t border-border first:border-t-0">
      <div className="flex items-center gap-2">
        {statusIcon(job.status)}
        <span className="text-xs font-medium truncate flex-1" title={job.label}>{job.label}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{job.kind}</Badge>
        {!finished && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => cancel(job.id)}
            title="Cancelar exportação"
            aria-label={`Cancelar ${job.label}`}
          >
            <XCircle className="w-3.5 h-3.5 text-destructive" />
          </Button>
        )}
        {finished && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => remove(job.id)}
            title="Remover da fila"
            aria-label={`Remover ${job.label}`}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Progress
          value={pct}
          className={cn("h-1.5 flex-1", job.status === "error" && "[&>div]:bg-destructive", job.status === "canceled" && "[&>div]:bg-muted-foreground")}
        />
        <span className="text-[10px] tabular-nums text-muted-foreground w-20 text-right">
          {job.total > 0 ? `${job.done}/${job.total}` : statusLabel(job.status)}
        </span>
      </div>
      {job.summary && job.status === "done" && (
        <p className="text-[10px] text-muted-foreground mt-1 truncate" title={job.summary}>{job.summary}</p>
      )}
      {job.error && (
        <p className="text-[10px] text-destructive mt-1 truncate" title={job.error}>{job.error}</p>
      )}
    </div>
  );
}

export function ExportProgressPanel() {
  const jobs = useExportQueue((s) => s.jobs);
  const open = useExportQueue((s) => s.panelOpen);
  const setOpen = useExportQueue((s) => s.setPanelOpen);
  const clearFinished = useExportQueue((s) => s.clearFinished);
  const [collapsed, setCollapsed] = useState(false);

  if (jobs.length === 0 || !open) return null;

  const running = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const finishedCount = jobs.length - running;

  return (
    <Card
      className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] shadow-xl z-50 border-border bg-background/95 backdrop-blur"
      role="region"
      aria-label="Painel de exportações"
    >
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="text-xs font-semibold flex-1">
          Exportações
          {running > 0 && <span className="ml-1.5 text-muted-foreground font-normal">· {running} em andamento</span>}
        </span>
        {finishedCount > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={clearFinished}
            title="Limpar concluídas"
            aria-label="Limpar exportações concluídas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir" : "Recolher"}
          aria-label={collapsed ? "Expandir painel" : "Recolher painel"}
        >
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setOpen(false)}
          title="Fechar painel"
          aria-label="Fechar painel"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto">
          {jobs.map((j) => <JobRow key={j.id} job={j} />)}
        </div>
      )}
    </Card>
  );
}