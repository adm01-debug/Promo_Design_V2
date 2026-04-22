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
  /** When true, the library is showing ONLY archived items (overrides includeArchived). */
  archivedOnly?: boolean;
  /** Client-side OCR-only filter (text matched in OCR-extracted content). */
  ocrOnly?: boolean;
  /** Custom size range in bytes (any/both may be present). */
  minSize?: number;
  maxSize?: number;
  /** Display unit for the size range (KB/MB) — used to format min/max human-readably. */
  sizeUnit?: "KB" | "MB";
  /** Optional preset size label, e.g. "Pequeno (< 100 KB)". */
  sizeRangeLabel?: string;
  /** Label for the "updated within" preset, e.g. "Últimas 24h". */
  updatedRangeLabel?: string;
  /** Items per page used during browsing. */
  pageSize?: number;
  /** "grid" / "list" — which view mode the user was on when exporting. */
  viewMode?: "grid" | "list";
  sortLabel?: string;
  total: number;
  shown: number;
}

/** Format a byte-size into "1.5 MB", "120 KB" etc., honoring the user's chosen unit. */
function formatSize(bytes: number, unit?: "KB" | "MB"): string {
  if (unit === "KB") return `${(bytes / 1024).toFixed(bytes < 1024 * 10 ? 1 : 0)} KB`;
  if (unit === "MB") return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Builds an ordered list of `[label, value]` pairs for every active filter. */
export function buildFilterRows(filters: AssetsPdfFiltersSummary): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (filters.search) rows.push(["Busca", `"${filters.search}"`]);
  if (filters.assetTypes && filters.assetTypes.length > 0) {
    rows.push(["Tipos", filters.assetTypes.map((t) => TYPE_LABEL[t] ?? t).join(", ")]);
  }
  if (filters.clientName) rows.push(["Cliente", filters.clientName]);
  if (filters.tags && filters.tags.length > 0) {
    rows.push([
      "Tags",
      `${filters.tags.join(", ")} (modo: ${filters.tagsMode === "any" ? "qualquer" : "todas"})`,
    ]);
  }
  // Size — custom range overrides preset label.
  if (filters.minSize != null || filters.maxSize != null) {
    const min = filters.minSize != null ? formatSize(filters.minSize, filters.sizeUnit) : "—";
    const max = filters.maxSize != null ? formatSize(filters.maxSize, filters.sizeUnit) : "—";
    // Using ASCII arrow because Helvetica's built-in glyph table doesn't
    // include the U+2192 arrow and renders it as a fallback box/character.
    rows.push(["Tamanho", `${min} -> ${max}`]);
  } else if (filters.sizeRangeLabel) {
    rows.push(["Tamanho", filters.sizeRangeLabel]);
  }
  if (filters.updatedRangeLabel) rows.push(["Atualizado em", filters.updatedRangeLabel]);
  // Archived state — `archivedOnly` is more specific than `includeArchived`.
  if (filters.archivedOnly) rows.push(["Arquivados", "Apenas arquivados"]);
  else if (filters.includeArchived) rows.push(["Arquivados", "Inclui arquivados"]);
  if (filters.ocrOnly) rows.push(["OCR", "Apenas com OCR"]);
  if (filters.sortLabel) rows.push(["Ordenação", filters.sortLabel]);
  if (filters.viewMode) rows.push(["Visualização", filters.viewMode === "list" ? "Lista" : "Grade"]);
  if (filters.pageSize) rows.push(["Itens por página", String(filters.pageSize)]);
  rows.push(["Resultados", `${filters.shown} de ${filters.total}`]);
  return rows;
}

export function buildAssetsPdf(
  assets: Asset[],
  clients: Client[],
  filters: AssetsPdfFiltersSummary,
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const MARGIN_X = 40;
  const FOOTER_Y = pageH - 24;

  // Build the active-filter definition list once (rendered on every page header).
  const filterRows = buildFilterRows(filters);

  // Two-column layout: "Label: value" entries flow left→right, then wrap.
  // We pre-compute wrapped text per entry so the header height is stable across pages.
  const HEADER_TITLE_Y = 38;
  const HEADER_META_Y = 52;
  const SUMMARY_START_Y = 68;
  const SUMMARY_LINE_H = 11;
  const HEADER_BOTTOM_PAD = 10;
  const COL_GAP = 18;
  const COLS = 2;
  const colWidth = (pageW - MARGIN_X * 2 - COL_GAP * (COLS - 1)) / COLS;

  // For each filter, prepare the wrapped lines so we can flow them in two columns.
  doc.setFontSize(8.5);
  const wrappedFilterEntries = filterRows.map(([label, value]) => {
    const text = `${label}: ${value}`;
    return doc.splitTextToSize(text, colWidth) as string[];
  });

  // Distribute entries across COLS columns (top-down, then next column).
  const totalLines = wrappedFilterEntries.reduce((acc, l) => acc + l.length, 0);
  const linesPerCol = Math.ceil(totalLines / COLS);
  const columns: Array<{ x: number; lines: string[] }> = Array.from({ length: COLS }, (_, i) => ({
    x: MARGIN_X + i * (colWidth + COL_GAP),
    lines: [],
  }));
  let colIdx = 0;
  for (const entry of wrappedFilterEntries) {
    if (
      columns[colIdx].lines.length > 0 &&
      columns[colIdx].lines.length + entry.length > linesPerCol &&
      colIdx < COLS - 1
    ) {
      colIdx++;
    }
    columns[colIdx].lines.push(...entry);
  }

  const summaryHeight = Math.max(...columns.map((c) => c.lines.length)) * SUMMARY_LINE_H;
  const headerHeight = SUMMARY_START_Y + summaryHeight + HEADER_BOTTOM_PAD;

  /** Repaints the fixed header on every page (called by autoTable's didDrawPage). */
  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text("Biblioteca de Assets — Exportação", MARGIN_X, HEADER_TITLE_Y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`Gerado em ${generatedAt}`, pageW - MARGIN_X, HEADER_TITLE_Y, { align: "right" });

    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, HEADER_META_Y - 6, pageW - MARGIN_X, HEADER_META_Y - 6);

    doc.setFontSize(8.5);
    doc.setTextColor(70);
    for (const col of columns) {
      doc.text(col.lines, col.x, SUMMARY_START_Y);
    }
    doc.setTextColor(0);
  };

  // Table — column widths are computed from the available page width so the
  // layout adapts to A4 landscape regardless of jsPDF's measurements.
  const head = [["Nome", "Tipo", "Cliente", "Versão", "Tamanho", "Tags", "Criado em"]];
  const body = assets.map((a) => [
    a.name,
    TYPE_LABEL[a.asset_type] ?? a.asset_type,
    a.client_id ? clientMap.get(a.client_id) ?? "—" : "—",
    String(a.version ?? ""),
    formatBytes(a.file_size),
    // Show up to 8 tags, then "+N" if truncated. autoTable will wrap as needed.
    (() => {
      const tags = a.tags ?? [];
      const shown = tags.slice(0, 8).join(", ");
      return tags.length > 8 ? `${shown} +${tags.length - 8}` : shown;
    })(),
    a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy") : "—",
  ]);

  // Distribute remaining width between Nome (flex) and Tags (flex) so that
  // long names/tag lists wrap into multi-line cells instead of being clipped.
  const tableWidth = pageW - MARGIN_X * 2;
  const fixedCols = { tipo: 56, versao: 46, tamanho: 64, criado: 68 } as const;
  const fixedTotal = fixedCols.tipo + fixedCols.versao + fixedCols.tamanho + fixedCols.criado;
  // Cliente takes ~18% of remaining flex room, Nome ~32%, Tags ~50%.
  const flexRoom = Math.max(360, tableWidth - fixedTotal);
  const clienteW = Math.round(flexRoom * 0.22);
  const nomeW = Math.round(flexRoom * 0.32);
  const tagsW = flexRoom - clienteW - nomeW;

  autoTable(doc, {
    head,
    body,
    // First page also reserves space for the header.
    startY: headerHeight,
    // `margin.top` ensures every page break leaves room for the repeated header.
    margin: { left: MARGIN_X, right: MARGIN_X, top: headerHeight, bottom: 36 },
    // pageBreak: 'auto' + rowPageBreak: 'avoid' keeps rows from being split mid-cell.
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      overflow: "linebreak",
      valign: "top",
      lineColor: [225, 225, 230],
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: 255,
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    columnStyles: {
      0: { cellWidth: nomeW, fontStyle: "bold" },
      1: { cellWidth: fixedCols.tipo },
      2: { cellWidth: clienteW },
      3: { cellWidth: fixedCols.versao, halign: "right" },
      4: { cellWidth: fixedCols.tamanho, halign: "right" },
      5: { cellWidth: tagsW, textColor: [80, 80, 90] },
      6: { cellWidth: fixedCols.criado, halign: "right" },
    },
    didDrawPage: (data) => {
      // Repeat header on every page so context (filters, generated-at) is never lost.
      drawHeader();

      // Footer divider + page counter (rendered later with totals).
      doc.setDrawColor(230);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_X, FOOTER_Y - 8, pageW - MARGIN_X, FOOTER_Y - 8);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Biblioteca de Assets · ${filters.shown} de ${filters.total}`,
        MARGIN_X,
        FOOTER_Y,
      );
      // Page number is filled in below once the total is known.
      void data;
    },
  });

  // Pass 2: render "Página X de Y" once we know the total page count.
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Página ${i} de ${totalPages}`, pageW - MARGIN_X, FOOTER_Y, { align: "right" });
  }
  doc.setTextColor(0);

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