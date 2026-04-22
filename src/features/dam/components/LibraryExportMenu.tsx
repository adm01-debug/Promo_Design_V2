import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Database, AlertTriangle } from "lucide-react";
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
import { buildAssetsCsvWithMetadata, downloadCsv } from "../lib/asset-export";
import { downloadAssetsPdf, type AssetsPdfFiltersSummary } from "../lib/asset-pdf";
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
  const count = assets.length;
  const disabled = count === 0;
  const allDisabled = !organizationId || total === 0;
  const willTruncate = total > MAX_EXPORT_ROWS;

  const handleCsv = () => {
    if (disabled) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    const csv = buildAssetsCsvWithMetadata(assets, clients, {
      ...filtersSummary,
      shown: count,
      total,
    });
    const ts = format(new Date(), "yyyyMMdd-HHmmss");
    downloadCsv(`dam-assets-${ts}.csv`, csv);
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
      downloadAssetsPdf(assets, clients, { ...filtersSummary, shown: count, total });
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
        });
        const ts = format(new Date(), "yyyyMMdd-HHmmss");
        downloadCsv(`dam-assets-todos-${ts}.csv`, csv);
      } else {
        downloadAssetsPdf(all, clients, {
          ...filtersSummary,
          shown: all.length,
          total: totalReported || all.length,
        });
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

  return (
    <>
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
