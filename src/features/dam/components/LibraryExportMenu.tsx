import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Database, AlertTriangle, Settings2, History, Repeat2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Asset, AssetFilters } from "../hooks/use-assets";
import type { Client } from "@/features/clients/hooks/use-clients";
import {
  buildAssetsCsvWithMetadata,
  downloadCsv,
  CSV_COLUMNS,
  DEFAULT_CSV_COLUMNS,
  type CsvColumnId,
} from "../lib/asset-export";
import {
  downloadAssetsPdf,
  PDF_COLUMNS,
  DEFAULT_PDF_COLUMNS,
  type AssetsPdfFiltersSummary,
  type PdfColumnId,
} from "../lib/asset-pdf";
import { ColumnsDialog } from "./ColumnsDialog";
import {
  fetchAllFilteredAssets,
  estimateExportSeconds,
  MAX_EXPORT_ROWS,
} from "../lib/fetch-all-filtered-assets";
import { format } from "date-fns";

interface Props {
  assets: Asset[];
  clients: Client[];
  total: number;
  filtersSummary: Omit<AssetsPdfFiltersSummary, "shown" | "total">;
  /** Org id used to fetch beyond the current page when exporting "all filtered". */
  organizationId: string | null;
  /**
   * Same filters object passed to `useAssets`. Used by the "all filtered"
   * export mode to refetch every matching row across pages.
   */
  filters: AssetFilters;
}

/** Above this many rows, we ask the user to confirm before kicking off the export. */
const CONFIRM_THRESHOLD = 500;

/** localStorage keys used to remember the user's column selection across sessions. */
const CSV_COLS_KEY = "dam-export-csv-columns";
const PDF_COLS_KEY = "dam-export-pdf-columns";

/** localStorage key for the last-N export history (most recent first). */
const HISTORY_KEY = "dam-export-history";
const HISTORY_LIMIT = 5;

/** Snapshot of an export — enough to repeat it with the same filters/columns. */
interface ExportHistoryEntry {
  id: string;
  kind: "csv" | "pdf";
  /** "current" = visible page; "all" = all filtered rows. */
  scope: "current" | "all";
  at: number;
  rows: number;
  filters: AssetFilters;
  filtersSummary: Omit<AssetsPdfFiltersSummary, "shown" | "total">;
  columns: string[];
  /** Short human label like `CSV · Filtrados · 124 linhas`. */
  label: string;
}

function readHistory(): ExportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is ExportHistoryEntry =>
      e && typeof e === "object" &&
      (e.kind === "csv" || e.kind === "pdf") &&
      (e.scope === "current" || e.scope === "all"),
    ).slice(0, HISTORY_LIMIT);
  } catch { return []; }
}

function writeHistory(items: ExportHistoryEntry[]): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT))); } catch { /* ignore */ }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function readCols<Id extends string>(key: string, allowed: readonly Id[], fallback: Id[]): Id[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const allowedSet = new Set<string>(allowed);
    const filtered = parsed.filter((id): id is Id => typeof id === "string" && allowedSet.has(id));
    return filtered.length > 0 ? filtered : fallback;
  } catch {
    return fallback;
  }
}

function writeCols<Id extends string>(key: string, cols: Id[]): void {
  try { localStorage.setItem(key, JSON.stringify(cols)); } catch { /* quota / disabled */ }
}

export function LibraryExportMenu({
  assets,
  clients,
  total,
  filtersSummary,
  organizationId,
  filters,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [confirmAll, setConfirmAll] = useState<null | { kind: "csv" | "pdf"; estSec: number }>(null);
  // Column selections (persisted) for CSV/PDF.
  const csvAllIds = CSV_COLUMNS.map((c) => c.id) as CsvColumnId[];
  const pdfAllIds = PDF_COLUMNS.map((c) => c.id) as PdfColumnId[];
  const [csvCols, setCsvCols] = useState<CsvColumnId[]>(() =>
    readCols<CsvColumnId>(CSV_COLS_KEY, csvAllIds, DEFAULT_CSV_COLUMNS),
  );
  const [pdfCols, setPdfCols] = useState<PdfColumnId[]>(() =>
    readCols<PdfColumnId>(PDF_COLS_KEY, pdfAllIds, DEFAULT_PDF_COLUMNS),
  );
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [history, setHistory] = useState<ExportHistoryEntry[]>(() => readHistory());
  const count = assets.length;
  const disabled = count === 0;
  const allDisabled = !organizationId || total === 0;
  const willTruncate = total > MAX_EXPORT_ROWS;

  const recordExport = (entry: Omit<ExportHistoryEntry, "id" | "at" | "label">) => {
    const scopeLabel = entry.scope === "all" ? "Todos filtrados" : "Página atual";
    const label = `${entry.kind.toUpperCase()} · ${scopeLabel} · ${entry.rows.toLocaleString("pt-BR")} linhas`;
    const full: ExportHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: Date.now(),
      label,
    };
    setHistory((prev) => {
      const next = [full, ...prev].slice(0, HISTORY_LIMIT);
      writeHistory(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    writeHistory([]);
    toast.success("Histórico de exportações limpo");
  };

  const handleCsv = () => {
    if (disabled) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    const csv = buildAssetsCsvWithMetadata(assets, clients, {
      ...filtersSummary,
      shown: count,
      total,
    }, csvCols);
    const ts = format(new Date(), "yyyyMMdd-HHmmss");
    downloadCsv(`dam-assets-${ts}.csv`, csv);
    recordExport({ kind: "csv", scope: "current", rows: count, filters, filtersSummary, columns: csvCols });
    toast.success(`CSV exportado (${count} assets)`);
  };

  const handlePdf = async () => {
    if (disabled) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      downloadAssetsPdf(assets, clients, { ...filtersSummary, shown: count, total }, pdfCols);
      recordExport({ kind: "pdf", scope: "current", rows: count, filters, filtersSummary, columns: pdfCols });
      toast.success(`PDF exportado (${count} assets)`);
    } catch (e) {
      toast.error(`Falha ao gerar PDF: ${e instanceof Error ? e.message : "erro"}`);
    } finally {
      setBusy(false);
    }
  };

  /** Fetches every filtered row (across pages) and exports as CSV/PDF. */
  const runAllExport = async (kind: "csv" | "pdf") => {
    if (!organizationId || total === 0) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    setBusy(true);
    setProgress({ loaded: 0, total });
    const toastId = toast.loading(`Carregando ${total.toLocaleString("pt-BR")} assets…`);
    try {
      const { assets: all, truncated, totalReported } = await fetchAllFilteredAssets(
        organizationId,
        filters,
        { onProgress: (loaded, t) => setProgress({ loaded, total: t || total }) },
      );
      toast.loading(`Gerando ${kind.toUpperCase()}…`, { id: toastId });
      await new Promise((r) => setTimeout(r, 0));

      if (kind === "csv") {
        const csv = buildAssetsCsvWithMetadata(all, clients, {
          ...filtersSummary,
          shown: all.length,
          total: totalReported || all.length,
        }, csvCols);
        const ts = format(new Date(), "yyyyMMdd-HHmmss");
        downloadCsv(`dam-assets-todos-${ts}.csv`, csv);
        recordExport({ kind: "csv", scope: "all", rows: all.length, filters, filtersSummary, columns: csvCols });
      } else {
        downloadAssetsPdf(all, clients, {
          ...filtersSummary,
          shown: all.length,
          total: totalReported || all.length,
        }, pdfCols);
        recordExport({ kind: "pdf", scope: "all", rows: all.length, filters, filtersSummary, columns: pdfCols });
      }

      const msg = truncated
        ? `Exportação parcial: ${all.length.toLocaleString("pt-BR")} de ${totalReported.toLocaleString("pt-BR")} (limite ${MAX_EXPORT_ROWS.toLocaleString("pt-BR")}).`
        : `Exportados ${all.length.toLocaleString("pt-BR")} assets.`;
      toast.success(msg, { id: toastId });
    } catch (e) {
      toast.error(`Falha ao exportar: ${e instanceof Error ? e.message : "erro"}`, { id: toastId });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  /** Decides whether to confirm or run directly based on row count. */
  const triggerAllExport = (kind: "csv" | "pdf") => {
    if (allDisabled) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    const estSec = estimateExportSeconds(Math.min(total, MAX_EXPORT_ROWS), kind);
    if (total > CONFIRM_THRESHOLD) {
      setConfirmAll({ kind, estSec });
      return;
    }
    void runAllExport(kind);
  };

  /** Re-runs an export from history using the saved filters/columns/scope. */
  const repeatExport = async (entry: ExportHistoryEntry) => {
    // Restore the column selection that was used previously.
    if (entry.kind === "csv") {
      const cols = entry.columns.filter((c): c is CsvColumnId => (csvAllIds as string[]).includes(c));
      if (cols.length > 0) { setCsvCols(cols); writeCols(CSV_COLS_KEY, cols); }
    } else {
      const cols = entry.columns.filter((c): c is PdfColumnId => (pdfAllIds as string[]).includes(c));
      if (cols.length > 0) { setPdfCols(cols); writeCols(PDF_COLS_KEY, cols); }
    }
    if (entry.scope === "all") {
      // Defer to the same confirm flow so large repeats still get a heads-up.
      triggerAllExport(entry.kind);
      return;
    }
    if (entry.kind === "csv") handleCsv(); else await handlePdf();
  };

  return (
    <>
      {history[0] && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 mr-1"
          disabled={busy}
          onClick={() => { void repeatExport(history[0]); }}
          title={`Repetir: ${history[0].label} (${formatRelative(history[0].at)})`}
          aria-label={`Repetir última exportação: ${history[0].label}`}
        >
          <Repeat2 className="w-4 h-4" />
          Repetir {history[0].kind.toUpperCase()}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {busy && progress
              ? `Exportando ${progress.loaded.toLocaleString("pt-BR")}/${progress.total.toLocaleString("pt-BR")}`
              : "Exportar"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {history.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
                <History className="w-3 h-3" />
                Histórico recente
              </DropdownMenuLabel>
              {history.map((h) => (
                <DropdownMenuItem
                  key={h.id}
                  onClick={() => { void repeatExport(h); }}
                  disabled={busy}
                  title={`Repetir ${h.label}`}
                >
                  <Repeat2 className="w-4 h-4" />
                  <span className="flex-1 truncate">{h.label}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatRelative(h.at)}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={clearHistory}
                className="text-xs text-muted-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar histórico
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuLabel className="text-xs">Página atual</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleCsv} disabled={disabled || busy}>
            <FileSpreadsheet className="w-4 h-4" />
            <span className="flex-1">CSV (planilha)</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePdf} disabled={disabled || busy}>
            <FileText className="w-4 h-4" />
            <span className="flex-1">PDF (relatório)</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
            <Settings2 className="w-3 h-3" />
            Colunas
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setCsvDialogOpen(true); }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="flex-1">Colunas do CSV</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {csvCols.length}/{csvAllIds.length}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); setPdfDialogOpen(true); }}
          >
            <FileText className="w-4 h-4" />
            <span className="flex-1">Colunas do PDF</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {pdfCols.length}/{pdfAllIds.length}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
            <Database className="w-3 h-3" />
            Todos os filtrados
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => triggerAllExport("csv")} disabled={allDisabled || busy}>
            <FileSpreadsheet className="w-4 h-4" />
            <span className="flex-1">CSV — todos</span>
            <span className="text-xs text-muted-foreground">{total.toLocaleString("pt-BR")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerAllExport("pdf")} disabled={allDisabled || busy}>
            <FileText className="w-4 h-4" />
            <span className="flex-1">PDF — todos</span>
            <span className="text-xs text-muted-foreground">{total.toLocaleString("pt-BR")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground space-y-1">
            <div>"Página atual" exporta apenas o que está visível.</div>
            <div>"Todos os filtrados" busca todas as páginas.</div>
            {willTruncate && (
              <div className="flex items-start gap-1 text-amber-600 dark:text-amber-500">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  Limite de {MAX_EXPORT_ROWS.toLocaleString("pt-BR")} linhas — refine os filtros para incluir tudo.
                </span>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ColumnsDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        allColumns={CSV_COLUMNS}
        value={csvCols}
        defaults={DEFAULT_CSV_COLUMNS}
        assetCount={count > 0 ? count : total}
        title="Escolher colunas do CSV"
        description="Selecione quais colunas incluir no arquivo CSV."
        confirmLabel="Salvar seleção"
        onConfirm={(cols) => {
          setCsvCols(cols);
          writeCols(CSV_COLS_KEY, cols);
          toast.success(`Colunas do CSV atualizadas (${cols.length})`);
        }}
      />

      <ColumnsDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        allColumns={PDF_COLUMNS}
        value={pdfCols}
        defaults={DEFAULT_PDF_COLUMNS}
        assetCount={count > 0 ? count : total}
        title="Escolher colunas do PDF"
        description="Selecione quais colunas aparecem na tabela do PDF."
        confirmLabel="Salvar seleção"
        onConfirm={(cols) => {
          setPdfCols(cols);
          writeCols(PDF_COLS_KEY, cols);
          toast.success(`Colunas do PDF atualizadas (${cols.length})`);
        }}
      />

      <AlertDialog
        open={confirmAll !== null}
        onOpenChange={(o) => { if (!o) setConfirmAll(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Exportar {Math.min(total, MAX_EXPORT_ROWS).toLocaleString("pt-BR")} assets em {confirmAll?.kind.toUpperCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Esta exportação inclui todos os assets que correspondem aos filtros atuais (não apenas a página visível).
                </p>
                <p>
                  Tempo estimado: <strong>~{confirmAll?.estSec ?? 1}s</strong> para baixar e gerar o arquivo. Mantenha esta aba aberta até concluir.
                </p>
                {willTruncate && (
                  <p className="text-amber-600 dark:text-amber-500">
                    Aviso: o resultado tem mais de {MAX_EXPORT_ROWS.toLocaleString("pt-BR")} linhas. Apenas as primeiras {MAX_EXPORT_ROWS.toLocaleString("pt-BR")} serão incluídas (ordenadas: mais recentes primeiro). Refine os filtros para uma exportação completa.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const kind = confirmAll?.kind ?? "csv";
                setConfirmAll(null);
                void runAllExport(kind);
              }}
            >
              Exportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
