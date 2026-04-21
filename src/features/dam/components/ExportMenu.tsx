import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileArchive, Loader2 } from "lucide-react";
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
import { buildAssetsCsv, downloadCsv, downloadAssetsZip } from "../lib/asset-export";
import { format } from "date-fns";

interface Props {
  assets: Asset[];
  selectedAssets: Asset[];
  clients: Client[];
  compareMode: boolean;
}

const ZIP_CONFIRM_THRESHOLD = 50;

export function ExportMenu({ assets, selectedAssets, clients, compareMode }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const total = assets.length;
  const selCount = selectedAssets.length;
  const selDisabled = !compareMode || selCount === 0;

  const exportCsv = (scope: Asset[], label: string) => {
    if (scope.length === 0) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    const csv = buildAssetsCsv(scope, clients);
    const ts = format(new Date(), "yyyyMMdd-HHmmss");
    downloadCsv(`dam-${label}-${ts}.csv`, csv);
    toast.success(`CSV exportado (${scope.length} assets)`);
  };

  const exportZip = async (scope: Asset[]) => {
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
    const toastId = toast.loading(`Empacotando 0/${scope.length} assets…`);
    try {
      const result = await downloadAssetsZip(scope, clients, (done, t) => {
        toast.loading(`Empacotando ${done}/${t} assets…`, { id: toastId });
      });
      if (result.failed === 0) {
        toast.success(`ZIP exportado (${result.ok} assets)`, { id: toastId });
      } else {
        toast.warning(
          `ZIP exportado com ${result.failed} falha(s) — veja manifest.csv (${result.ok} ok)`,
          { id: toastId },
        );
      }
    } catch (e) {
      toast.error(`Falha ao gerar ZIP: ${e instanceof Error ? e.message : "erro"}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">CSV de metadados</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportCsv(assets, "filtrados")} disabled={total === 0}>
          <FileSpreadsheet className="w-4 h-4" />
          <span className="flex-1">CSV — Filtrados</span>
          <span className="text-xs text-muted-foreground">{total}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportCsv(selectedAssets, "selecao")}
          disabled={selDisabled}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span className="flex-1">CSV — Seleção</span>
          <span className="text-xs text-muted-foreground">{selCount}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">ZIP com arquivos</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportZip(assets)} disabled={total === 0 || isExporting}>
          <FileArchive className="w-4 h-4" />
          <span className="flex-1">ZIP — Filtrados</span>
          <span className="text-xs text-muted-foreground">{total}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportZip(selectedAssets)} disabled={selDisabled || isExporting}>
          <FileArchive className="w-4 h-4" />
          <span className="flex-1">ZIP — Seleção</span>
          <span className="text-xs text-muted-foreground">{selCount}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
