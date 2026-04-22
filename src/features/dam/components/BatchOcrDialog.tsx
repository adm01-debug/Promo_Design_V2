import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, ScanText, Check, X as XIcon, AlertCircle, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Asset } from "../hooks/use-assets";
import { cn } from "@/lib/utils";

interface BatchOcrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Assets currently visible in the library (already filtered/paginated). */
  assets: Asset[];
}

type LogEntry = {
  assetId: string;
  name: string;
  status: "pending" | "running" | "ok" | "skipped" | "empty" | "failed";
  message?: string;
  length?: number;
  durationMs?: number;
};

const OCR_SUPPORTED_MIMES = ["image/", "application/pdf"];

function isOcrSupported(asset: Asset): boolean {
  const m = (asset.mime_type ?? "").toLowerCase();
  return OCR_SUPPORTED_MIMES.some((p) => m.startsWith(p));
}

function StatusIcon({ status }: { status: LogEntry["status"] }) {
  switch (status) {
    case "pending":
      return <MinusCircle className="w-3.5 h-3.5 text-muted-foreground" />;
    case "running":
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
    case "ok":
      return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    case "empty":
      return <MinusCircle className="w-3.5 h-3.5 text-muted-foreground" />;
    case "skipped":
      return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
    case "failed":
      return <XIcon className="w-3.5 h-3.5 text-destructive" />;
  }
}

/**
 * Bulk OCR re-processing for assets visible in the library.
 * - Lets the user multi-select supported assets.
 * - Optionally restrict to those without text yet.
 * - Runs asset-ocr edge function sequentially and shows progress + per-asset log.
 */
export function BatchOcrDialog({ open, onOpenChange, assets }: BatchOcrDialogProps) {
  const supported = useMemo(() => assets.filter(isOcrSupported), [assets]);
  const [onlyMissing, setOnlyMissing] = useState(true);

  const eligible = useMemo(
    () =>
      onlyMissing
        ? supported.filter((a) => {
            const s = a.ocr_status ?? "none";
            return s === "none" || s === "failed" || s === "empty";
          })
        : supported,
    [supported, onlyMissing],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
  const [running, setRunning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setLogs({});
      setRunning(false);
      setCancelRequested(false);
      setDoneCount(0);
    }
  }, [open]);

  // Whenever the eligible list changes, drop selections no longer present.
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      const ids = new Set(eligible.map((a) => a.id));
      prev.forEach((id) => ids.has(id) && next.add(id));
      return next;
    });
  }, [eligible]);

  const allSelected = eligible.length > 0 && selected.size === eligible.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(eligible.map((a) => a.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalToRun = selected.size;
  const progressPct = totalToRun === 0 ? 0 : Math.round((doneCount / totalToRun) * 100);

  const startBatch = async () => {
    if (running || totalToRun === 0) return;
    setRunning(true);
    setCancelRequested(false);
    setDoneCount(0);
    const queue = eligible.filter((a) => selected.has(a.id));
    // Initialize log entries
    const initial: Record<string, LogEntry> = {};
    queue.forEach((a) => {
      initial[a.id] = { assetId: a.id, name: a.name, status: "pending" };
    });
    setLogs(initial);

    for (const asset of queue) {
      if (cancelRequested) break;
      setLogs((prev) => ({ ...prev, [asset.id]: { ...prev[asset.id], status: "running" } }));
      const startedAt = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("asset-ocr", {
          body: {
            assetId: asset.id,
            filePath: asset.file_path,
            mimeType: asset.mime_type ?? "",
          },
        });
        const durationMs = Math.round(performance.now() - startedAt);
        if (error) throw error;
        const result = data as {
          ok?: boolean;
          length?: number;
          hasText?: boolean;
          skipped?: boolean;
          error?: string;
        };
        if (result?.error) throw new Error(result.error);
        let status: LogEntry["status"];
        let message: string | undefined;
        if (result?.skipped) {
          status = "skipped";
          message = "Tipo de arquivo não suportado";
        } else if (result?.hasText) {
          status = "ok";
          message = `${result.length ?? 0} caracteres extraídos`;
        } else {
          status = "empty";
          message = "Nenhum texto detectado";
        }
        setLogs((prev) => ({
          ...prev,
          [asset.id]: { ...prev[asset.id], status, message, length: result?.length, durationMs },
        }));
      } catch (e) {
        const durationMs = Math.round(performance.now() - startedAt);
        setLogs((prev) => ({
          ...prev,
          [asset.id]: {
            ...prev[asset.id],
            status: "failed",
            message: e instanceof Error ? e.message : "Falha desconhecida",
            durationMs,
          },
        }));
      } finally {
        setDoneCount((c) => c + 1);
      }
    }

    setRunning(false);
  };

  const cancel = () => {
    setCancelRequested(true);
  };

  const logEntries = Object.values(logs);
  const summary = logEntries.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<LogEntry["status"], number>,
  );

  return (
    <Dialog open={open} onOpenChange={(v) => (!running ? onOpenChange(v) : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="w-4 h-4" /> Reprocessar OCR em lote
          </DialogTitle>
          <DialogDescription>
            Selecione assets visíveis na biblioteca e execute a extração de texto um a um, com progresso e logs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={onlyMissing}
              onCheckedChange={(v) => setOnlyMissing(v === true)}
              disabled={running}
            />
            Apenas sem texto / com falha
          </label>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {eligible.length} elegíveis de {supported.length} suportados ({assets.length} totais)
          </span>
        </div>

        <div className="flex items-center justify-between border-y py-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              disabled={running || eligible.length === 0}
            />
            Selecionar todos ({selected.size}/{eligible.length})
          </label>
          {running && (
            <span className="text-xs text-muted-foreground">
              {doneCount}/{totalToRun} processados
            </span>
          )}
        </div>

        <ScrollArea className="h-72 pr-3">
          {eligible.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground gap-2 text-sm">
              <ScanText className="w-8 h-8 opacity-50" />
              Nenhum asset elegível na lista atual.
            </div>
          ) : (
            <ul className="space-y-1">
              {eligible.map((a) => {
                const log = logs[a.id];
                const isSel = selected.has(a.id);
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                      log?.status === "running" && "border-primary/50 bg-primary/5",
                      log?.status === "failed" && "border-destructive/40 bg-destructive/5",
                      log?.status === "ok" && "border-emerald-500/40 bg-emerald-500/5",
                    )}
                  >
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => toggleOne(a.id)}
                      disabled={running}
                      aria-label={`Selecionar ${a.name}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium" title={a.name}>
                        {a.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {a.mime_type ?? "—"} · status: {a.ocr_status ?? "none"}
                      </div>
                    </div>
                    {log && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusIcon status={log.status} />
                        {log.message && (
                          <span className="text-[10px] text-muted-foreground max-w-[160px] truncate" title={log.message}>
                            {log.message}
                          </span>
                        )}
                        {log.durationMs !== undefined && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {log.durationMs}ms
                          </Badge>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {(running || logEntries.length > 0) && (
          <div className="space-y-1.5">
            <Progress value={progressPct} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>
                {doneCount}/{totalToRun} concluídos · {progressPct}%
              </span>
              <span className="flex flex-wrap gap-2">
                {summary.ok ? <span className="text-emerald-500">{summary.ok} ok</span> : null}
                {summary.empty ? <span>{summary.empty} sem texto</span> : null}
                {summary.skipped ? <span className="text-amber-500">{summary.skipped} ignorados</span> : null}
                {summary.failed ? <span className="text-destructive">{summary.failed} falhas</span> : null}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {running ? (
            <Button variant="outline" onClick={cancel} disabled={cancelRequested}>
              {cancelRequested ? "Cancelando…" : "Cancelar após o atual"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
          <Button onClick={startBatch} disabled={running || totalToRun === 0}>
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando…
              </>
            ) : (
              <>
                <ScanText className="w-4 h-4 mr-2" /> Processar {totalToRun > 0 ? `(${totalToRun})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}