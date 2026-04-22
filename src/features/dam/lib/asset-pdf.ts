import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Asset } from "../hooks/use-assets";
import type { Client } from "@/features/clients/hooks/use-clients";

const TYPE_LABEL: Record<string, string> = {
  logo: "Logo",
  art: "Arte",
  photo: "Foto",
  mockup: "Mockup",
  document: "Documento",
  other: "Outro",
};

function formatBytes(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export interface AssetsPdfFiltersSummary {
  search?: string;
  assetTypes?: string[];
  clientName?: string;
  tags?: string[];
  tagsMode?: "all" | "any";
  includeArchived?: boolean;
  sortLabel?: string;
  total: number;
  shown: number;
}

export function buildAssetsPdf(
  assets: Asset[],
  clients: Client[],
  filters: AssetsPdfFiltersSummary,
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Biblioteca de Assets — Exportação", 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Gerado em ${generatedAt}`, 40, 56);

  // Filters summary
  const lines: string[] = [];
  if (filters.search) lines.push(`Busca: "${filters.search}"`);
  if (filters.assetTypes && filters.assetTypes.length > 0) {
    lines.push(`Tipos: ${filters.assetTypes.map((t) => TYPE_LABEL[t] ?? t).join(", ")}`);
  }
  if (filters.clientName) lines.push(`Cliente: ${filters.clientName}`);
  if (filters.tags && filters.tags.length > 0) {
    lines.push(`Tags (${filters.tagsMode === "any" ? "qualquer" : "todas"}): ${filters.tags.join(", ")}`);
  }
  if (filters.includeArchived) lines.push("Inclui arquivados");
  if (filters.sortLabel) lines.push(`Ordenação: ${filters.sortLabel}`);
  lines.push(`Resultados: ${filters.shown} de ${filters.total}`);

  doc.setFontSize(9);
  doc.setTextColor(60);
  let y = 74;
  for (const line of lines) {
    doc.text(line, 40, y);
    y += 12;
  }

  // Table
  const head = [["Nome", "Tipo", "Cliente", "Versão", "Tamanho", "Tags", "Criado em"]];
  const body = assets.map((a) => [
    a.name,
    TYPE_LABEL[a.asset_type] ?? a.asset_type,
    a.client_id ? clientMap.get(a.client_id) ?? "—" : "—",
    String(a.version ?? ""),
    formatBytes(a.file_size),
    (a.tags ?? []).slice(0, 5).join(", "),
    a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy") : "—",
  ]);

  autoTable(doc, {
    head,
    body,
    startY: y + 6,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    columnStyles: {
      0: { cellWidth: 200 },
      1: { cellWidth: 60 },
      2: { cellWidth: 130 },
      3: { cellWidth: 50, halign: "right" },
      4: { cellWidth: 70, halign: "right" },
      5: { cellWidth: 200 },
      6: { cellWidth: 70 },
    },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ?? pageSize.getHeight();
      const pageWidth = pageSize.width ?? pageSize.getWidth();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - 60,
        pageHeight - 20,
      );
    },
  });

  return doc;
}

export function downloadAssetsPdf(
  assets: Asset[],
  clients: Client[],
  filters: AssetsPdfFiltersSummary,
): void {
  const doc = buildAssetsPdf(assets, clients, filters);
  const ts = format(new Date(), "yyyyMMdd-HHmmss");
  doc.save(`dam-assets-${ts}.pdf`);
}