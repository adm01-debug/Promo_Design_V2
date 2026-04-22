import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
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
import { buildAssetsCsv, downloadCsv } from "../lib/asset-export";
import { downloadAssetsPdf, type AssetsPdfFiltersSummary } from "../lib/asset-pdf";
import { format } from "date-fns";

interface Props {
  assets: Asset[];
  clients: Client[];
  total: number;
  filtersSummary: Omit<AssetsPdfFiltersSummary, "shown" | "total">;
}

export function LibraryExportMenu({ assets, clients, total, filtersSummary }: Props) {
  const [busy, setBusy] = useState(false);
  const count = assets.length;
  const disabled = count === 0;

  const handleCsv = () => {
    if (disabled) {
      toast.warning("Nenhum asset para exportar");
      return;
    }
    const csv = buildAssetsCsv(assets, clients);
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
      // Defer to next tick so the UI updates before sync work
      await new Promise((r) => setTimeout(r, 0));
      downloadAssetsPdf(assets, clients, { ...filtersSummary, shown: count, total });
      toast.success(`PDF exportado (${count} assets)`);
    } catch (e) {
      toast.error(`Falha ao gerar PDF: ${e instanceof Error ? e.message : "erro"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs">Assets filtrados</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCsv} disabled={disabled}>
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
        <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
          Inclui apenas a página atual quando paginado.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}