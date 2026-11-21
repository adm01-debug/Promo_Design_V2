import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ListTodo,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Layers,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMagicUpJobs, MAGIC_UP_STYLE_LABELS, type MagicUpJob } from "@/features/magic-up";

type StatusFilter = "all" | MagicUpJob["status"];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "queued", label: "Na fila" },
  { value: "processing", label: "Processando" },
  { value: "done", label: "Concluídos" },
  { value: "failed", label: "Falhas" },
  { value: "cancelled", label: "Cancelados" },
];

function StatusBadge({ status }: { status: MagicUpJob["status"] }) {
  const config: Record<
    MagicUpJob["status"],
    { label: string; className: string; Icon: typeof Clock }
  > = {
    queued: {
      label: "Na fila",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      Icon: Clock,
    },
    processing: {
      label: "Processando",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      Icon: Loader2,
    },
    done: {
      label: "Concluído",
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
      Icon: CheckCircle2,
    },
    failed: {
      label: "Falhou",
      className: "bg-red-500/10 text-red-500 border-red-500/30",
      Icon: XCircle,
    },
    cancelled: {
      label: "Cancelado",
      className: "bg-muted text-muted-foreground border-border",
      Icon: RotateCcw,
    },
  };
  const { label, className, Icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${className}`}
    >
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

const isFinal = (job: MagicUpJob) => ["done", "failed", "cancelled"].includes(job.status);

const MagicUpJobs = () => {
  const { jobs, isLoading, cancelJob } = useMagicUpJobs();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const c: Record<MagicUpJob["status"], number> = {
      queued: 0,
      processing: 0,
      done: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const j of jobs) c[j.status] += 1;
    return c;
  }, [jobs]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? jobs : jobs.filter((j) => j.status === statusFilter)),
    [jobs, statusFilter],
  );

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-display font-semibold text-foreground">
            Fila de Jobs — Magic Up
          </h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
            {filtered.length} de {jobs.length}
          </span>
        </div>
      </div>

      {/* Resumo + filtros */}
      <div className="px-4 py-3 border-b border-border">
        <div className="grid grid-cols-5 gap-2 mb-3">
          {(Object.keys(counts) as MagicUpJob["status"][]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={`rounded-lg border p-2 text-left transition-colors ${
                statusFilter === s
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <p className="text-base font-bold text-foreground">{counts[s]}</p>
              <p className="text-[10px] text-muted-foreground">
                {STATUS_FILTERS.find((f) => f.value === s)?.label}
              </p>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === f.value
                  ? "bg-primary/20 text-primary"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && jobs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando jobs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-display font-semibold text-foreground mb-1">
                {jobs.length === 0 ? "Nenhum job ainda" : "Nenhum resultado"}
              </p>
              <p className="text-xs">
                {jobs.length === 0
                  ? `Use "Gerar" ou "Gerar lote" no gerador para criar jobs em lote.`
                  : "Nenhum job neste filtro."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => (
              <div key={job.id} className="rounded-xl border border-border bg-card p-3 flex gap-3">
                <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-surface-2 border border-border flex items-center justify-center">
                  {job.result_image_url && job.result_image_url !== "/placeholder.svg" ? (
                    <img
                      src={job.result_image_url}
                      alt={`Resultado ${job.style}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={job.status} />
                      <span className="text-xs font-semibold text-foreground">
                        {MAGIC_UP_STYLE_LABELS[job.style] ?? job.style}
                      </span>
                      {isFinal(job) && job.completed_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(job.completed_at), "dd/MM/yyyy HH:mm")}
                        </span>
                      )}
                    </div>
                    {!isFinal(job) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground shrink-0"
                        disabled={cancelJob.isPending}
                        onClick={() => cancelJob.mutate(job.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancelar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{job.prompt}</p>
                  {(job.product_name || job.product_sku) && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {[job.product_name, job.product_sku].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {job.error_message && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {job.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MagicUpJobs;
