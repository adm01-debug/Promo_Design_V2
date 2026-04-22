import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileArchive, Loader2, FolderTree, ChevronDown, Star, ListChecks, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Asset } from "../hooks/use-assets";
import type { Client } from "@/features/clients/hooks/use-clients";
import { buildAssetsCsv, downloadCsv, downloadAssetsZip, downloadAssetsZipsByType, ExportCanceledError, DEFAULT_CSV_COLUMNS, CSV_COLUMNS, type CsvColumnId } from "../lib/asset-export";
import { format } from "date-fns";
import { useExportQueue, newJobId } from "../hooks/use-export-queue";
import { CsvColumnsDialog } from "./CsvColumnsDialog";

interface Props {
  assets: Asset[];
  selectedAssets: Asset[];
  clients: Client[];
  compareMode: boolean;
}

const ZIP_CONFIRM_THRESHOLD = 50;

/** Persisted last-used export action so the user can repeat with one click. */
type ExportScope = "filtered" | "selection";
type ExportFormat = "csv" | "zip" | "zip-by-type";
interface ExportPref { scope: ExportScope; format: ExportFormat }
const PREF_KEY = "dam-export-pref";
const CSV_COLUMNS_KEY = "dam-export-csv-columns";

function readCsvColumns(): CsvColumnId[] {
  try {
    const raw = localStorage.getItem(CSV_COLUMNS_KEY);
    if (!raw) return [...DEFAULT_CSV_COLUMNS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_CSV_COLUMNS];
    const valid = new Set(CSV_COLUMNS.map((c) => c.id));
    const filtered = parsed.filter((id): id is CsvColumnId => typeof id === "string" && valid.has(id as CsvColumnId));
    return filtered.length > 0 ? filtered : [...DEFAULT_CSV_COLUMNS];
  } catch { return [...DEFAULT_CSV_COLUMNS]; }
}

function writeCsvColumns(cols: CsvColumnId[]): void {
  try { localStorage.setItem(CSV_COLUMNS_KEY, JSON.stringify(cols)); } catch { /* ignore */ }
}

function readPref(): ExportPref | null {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ExportPref>;
    if ((p.scope === "filtered" || p.scope === "selection") &&
        (p.format === "csv" || p.format === "zip" || p.format === "zip-by-type")) {
      return { scope: p.scope, format: p.format };
    }
  } catch { /* ignore */ }
  return null;
}

function writePref(pref: ExportPref): void {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch { /* ignore */ }
}

const FORMAT_LABEL: Record<ExportFormat, string> = {
  "csv": "CSV",
  "zip": "ZIP",
  "zip-by-type": "ZIP por tipo",
};
const SCOPE_LABEL: Record<ExportScope, string> = {
  "filtered": "Filtrados",
  "selection": "Seleção",
};

export function ExportMenu({ assets, selectedAssets, clients, compareMode }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [pref, setPref] = useState<ExportPref | null>(() => readPref());
  useEffect(() => { if (pref) writePref(pref); }, [pref]);
  const [csvColumns, setCsvColumns] = useState<CsvColumnId[]>(() => readCsvColumns());
  const [csvDialog, setCsvDialog] = useState<{ open: boolean; scope: Asset[]; label: string; kind: ExportScope } | null>(null);
  const enqueue = useExportQueue((s) => s.enqueue);
  const updateJob = useExportQueue((s) => s.update);
  const setPanelOpen = useExportQueue((s) => s.setPanelOpen);
  const queueCount = useExportQueue((s) => s.jobs.length);
  const runningCount = useExportQueue((s) => s.jobs.filter((j) => j.status === "running" || j.status === "queued").length);

  const total = assets.length;
  const selCount = selectedAssets.length;
  const selDisabled = !compareMode || selCount === 0;

  const runCsv = (scope: Asset[], label: string, columns: CsvColumnId[] = csvColumns) => {
    if (scope.length === 0) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    const id = newJobId();
    enqueue({
      id,
      label: `CSV — ${label === "selecao" ? "Seleção" : "Filtrados"} (${scope.length} · ${columns.length} col)`,
      kind: "csv",
      total: 1,
    });
    try {
      const csv = buildAssetsCsv(scope, clients, columns);
      const ts = format(new Date(), "yyyyMMdd-HHmmss");
      downloadCsv(`dam-${label}-${ts}.csv`, csv);
      updateJob(id, { status: "done", done: 1, finishedAt: Date.now(), summary: `${scope.length} assets · ${columns.length} colunas` });
      toast.success(`CSV exportado (${scope.length} assets · ${columns.length} colunas)`);
    } catch (e) {
      updateJob(id, { status: "error", error: e instanceof Error ? e.message : "erro", finishedAt: Date.now() });
      toast.error(`Falha ao gerar CSV: ${e instanceof Error ? e.message : "erro"}`);
    }
  };

  const runZip = async (scope: Asset[]) => {
    if (scope.length === 0) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    if (scope.length > ZIP_CONFIRM_THRESHOLD) {
      const ok = window.confirm(
        `Exportar ${scope.length} assets como ZIP? Isso pode levar alguns minutos.`,
      );
      if (!ok) return;
    }
    setIsExporting(true);
    const id = newJobId();
    const controller = new AbortController();
    enqueue({
      id,
      label: `ZIP (${scope.length} assets)`,
      kind: "zip",
      total: scope.length,
      controller,
    });
    try {
      const result = await downloadAssetsZip(scope, clients, (done) => {
        updateJob(id, { done });
      }, controller.signal);
      if (result.failed === 0) {
        updateJob(id, { status: "done", done: scope.length, finishedAt: Date.now(), summary: `${result.ok} assets` });
        toast.success(`ZIP exportado (${result.ok} assets)`);
      } else {
        updateJob(id, { status: "done", done: scope.length, finishedAt: Date.now(), summary: `${result.ok} ok · ${result.failed} falhas (veja manifest.csv)` });
        toast.warning(`ZIP exportado com ${result.failed} falha(s) — veja manifest.csv (${result.ok} ok)`);
      }
    } catch (e) {
      if (e instanceof ExportCanceledError) {
        updateJob(id, { status: "canceled", finishedAt: Date.now() });
        toast.info("Exportação cancelada");
      } else {
        updateJob(id, { status: "error", error: e instanceof Error ? e.message : "erro", finishedAt: Date.now() });
        toast.error(`Falha ao gerar ZIP: ${e instanceof Error ? e.message : "erro"}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const runZipByType = async (scope: Asset[]) => {
    if (scope.length === 0) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    const types = new Set(scope.map((a) => a.asset_type || "other"));
    if (types.size < 2) {
      const ok = window.confirm(
        `Todos os ${scope.length} assets são do mesmo tipo (${[...types][0]}). Gerar ZIP por tipo mesmo assim?`,
      );
      if (!ok) return;
    }
    if (scope.length > ZIP_CONFIRM_THRESHOLD) {
      const ok = window.confirm(
        `Exportar ${scope.length} assets em ZIPs separados por tipo? Isso pode levar alguns minutos.`,
      );
      if (!ok) return;
    }
    setIsExporting(true);
    const id = newJobId();
    const controller = new AbortController();
    enqueue({
      id,
      label: `ZIP por tipo (${scope.length} assets)`,
      kind: "zip-by-type",
      total: scope.length,
      controller,
    });
    try {
      const result = await downloadAssetsZipsByType(scope, clients, (done) => {
        updateJob(id, { done });
      }, controller.signal);
      const summary = Object.entries(result.byType)
        .map(([t, c]) => `${t}: ${c.ok}${c.failed > 0 ? ` (${c.failed} falhas)` : ""}`)
        .join(" · ");
      if (result.failed === 0) {
        updateJob(id, { status: "done", done: scope.length, finishedAt: Date.now(), summary });
        toast.success(`ZIP por tipo exportado — ${summary}`);
      } else {
        updateJob(id, { status: "done", done: scope.length, finishedAt: Date.now(), summary });
        toast.warning(`ZIP por tipo com ${result.failed} falha(s) — ${summary}`);
      }
    } catch (e) {
      if (e instanceof ExportCanceledError) {
        updateJob(id, { status: "canceled", finishedAt: Date.now() });
        toast.info("Exportação cancelada");
      } else {
        updateJob(id, { status: "error", error: e instanceof Error ? e.message : "erro", finishedAt: Date.now() });
        toast.error(`Falha ao gerar ZIP por tipo: ${e instanceof Error ? e.message : "erro"}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  /** Wraps a runner so it remembers the chosen (scope, format) for the quick button. */
  const exportCsv = (scope: Asset[], label: string, kind: ExportScope) => {
    if (scope.length === 0) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    // Open column-picker dialog before running.
    setCsvDialog({ open: true, scope, label, kind });
  };
  const handleCsvDialogConfirm = (cols: CsvColumnId[]) => {
    setCsvColumns(cols);
    writeCsvColumns(cols);
    if (!csvDialog) return;
    setPref({ scope: csvDialog.kind, format: "csv" });
    runCsv(csvDialog.scope, csvDialog.label, cols);
  };
  const exportZip = (scope: Asset[], kind: ExportScope) => {
    setPref({ scope: kind, format: "zip" });
    return runZip(scope);
  };
  const exportZipByType = (scope: Asset[], kind: ExportScope) => {
    setPref({ scope: kind, format: "zip-by-type" });
    return runZipByType(scope);
  };

  /** Resolve the asset list for the saved scope, falling back when selection is empty/unavailable. */
  function resolvePrefScope(p: ExportPref): { scope: Asset[]; usedFallback: boolean } {
    if (p.scope === "selection") {
      if (!selDisabled && selCount > 0) return { scope: selectedAssets, usedFallback: false };
      return { scope: assets, usedFallback: true };
    }
    return { scope: assets, usedFallback: false };
  }

  const runQuickExport = () => {
    if (!pref) return;
    const { scope, usedFallback } = resolvePrefScope(pref);
    if (scope.length === 0) {
      toast.warning("Nenhum asset disponível para exportar");
      return;
    }
    if (usedFallback) {
      toast.info("Sem seleção ativa — usando assets filtrados");
    }
    const scopeLabel = usedFallback ? "filtered" : pref.scope;
    const csvLabel = scopeLabel === "selection" ? "selecao" : "filtrados";
    if (pref.format === "csv") runCsv(scope, csvLabel, csvColumns);
    else if (pref.format === "zip") void runZip(scope);
    else void runZipByType(scope);
  };

  const quickLabel = pref
    ? `${FORMAT_LABEL[pref.format]} · ${SCOPE_LABEL[pref.scope]}`
    : null;

  // The CSV+selection variant has no asset list when compare is off; the quick button
  // handles that via fallback above, but we still disable it when nothing is exportable.
  const quickDisabled = !pref || isExporting || (pref.scope === "filtered" ? total === 0 : (selDisabled && total === 0));

  return (
    <div className="inline-flex items-center">
      {queueCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 mr-2 relative"
          onClick={() => setPanelOpen(true)}
          title="Mostrar fila de exportações"
          aria-label="Mostrar fila de exportações"
        >
          <ListChecks className="w-3.5 h-3.5" />
          Fila
          <Badge variant={runningCount > 0 ? "default" : "secondary"} className="h-4 px-1 text-[10px] tabular-nums">
            {runningCount > 0 ? `${runningCount}/${queueCount}` : queueCount}
          </Badge>
        </Button>
      )}
      {pref && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-r-none border-r-0"
          disabled={quickDisabled}
          onClick={runQuickExport}
          title={`Repetir última exportação: ${quickLabel}`}
          aria-label={`Repetir última exportação: ${quickLabel}`}
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Star className="w-3.5 h-3.5 fill-current" />
          )}
          {quickLabel}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={pref ? "h-8 gap-1 px-2 rounded-l-none" : "h-8 gap-1.5"}
            disabled={isExporting}
            aria-label="Abrir menu de exportação"
          >
            {!pref && (isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            ))}
            {pref ? <ChevronDown className="w-3.5 h-3.5" /> : "Exportar"}
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {pref && (
          <>
            <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-current" /> Padrão salvo
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => { setPref(null); try { localStorage.removeItem(PREF_KEY); } catch { /* ignore */ } toast.success("Padrão de exportação removido"); }}
              className="text-xs text-muted-foreground"
            >
              Limpar padrão ({quickLabel})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs">CSV de metadados</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportCsv(assets, "filtrados", "filtered")} disabled={total === 0}>
          <FileSpreadsheet className="w-4 h-4" />
          <span className="flex-1">CSV — Filtrados</span>
          <span className="text-xs text-muted-foreground">{total}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportCsv(selectedAssets, "selecao", "selection")}
          disabled={selDisabled}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="flex-1">CSV — Seleção</span>
          <span className="text-xs text-muted-foreground">{selCount}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">ZIP com arquivos</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportZip(assets, "filtered")} disabled={total === 0 || isExporting}>
          <FileArchive className="w-4 h-4" />
          <span className="flex-1">ZIP — Filtrados</span>
          <span className="text-xs text-muted-foreground">{total}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportZip(selectedAssets, "selection")} disabled={selDisabled || isExporting}>
          <FileArchive className="w-4 h-4" />
          <span className="flex-1">ZIP — Seleção</span>
          <span className="text-xs text-muted-foreground">{selCount}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">ZIP separado por tipo</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => exportZipByType(assets, "filtered")}
          disabled={total === 0 || isExporting}
        >
          <FolderTree className="w-4 h-4" />
          <span className="flex-1">Por tipo — Filtrados</span>
          <span className="text-xs text-muted-foreground">{total}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportZipByType(selectedAssets, "selection")}
          disabled={selDisabled || isExporting}
        >
          <FolderTree className="w-4 h-4" />
          <span className="flex-1">Por tipo — Seleção</span>
          <span className="text-xs text-muted-foreground">{selCount}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
