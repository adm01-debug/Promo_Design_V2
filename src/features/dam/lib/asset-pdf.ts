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

/**
 * Available PDF columns. The order here defines the canonical ordering when
 * the user picks a subset (we always render in canonical order, never in
 * the user's selection order).
 */
export const PDF_COLUMNS = [
  { id: "name",       label: "Nome" },
  { id: "type",       label: "Tipo" },
  { id: "client",     label: "Cliente" },
  { id: "version",    label: "Versão" },
  { id: "size",       label: "Tamanho" },
  { id: "tags",       label: "Tags" },
  { id: "created_at", label: "Criado em" },
] as const;

export type PdfColumnId = (typeof PDF_COLUMNS)[number]["id"];

export const DEFAULT_PDF_COLUMNS: PdfColumnId[] = PDF_COLUMNS.map((c) => c.id);

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
  pdfColumns?: PdfColumnId[],
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");

  // Resolve which PDF columns to render. Always emit in canonical order so the
  // layout stays predictable (e.g. "Nome" stays leftmost when selected).
  const selected = new Set<PdfColumnId>(
    pdfColumns && pdfColumns.length > 0 ? pdfColumns : DEFAULT_PDF_COLUMNS,
  );
  const activeCols = PDF_COLUMNS.filter((c) => selected.has(c.id));

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
  const tableWidth = pageW - MARGIN_X * 2;
  // Per-column fixed widths (only consumed if the column is active).
  const FIXED: Record<PdfColumnId, number | null> = {
    name: null, // flex
    type: 56,
    client: null, // flex
    version: 46,
    size: 64,
    tags: null, // flex
    created_at: 68,
  };
  // Flex distribution among active flex columns: name 32, client 22, tags 46 (sums to 1.0 if all three).
  const FLEX_SHARE: Record<PdfColumnId, number> = {
    name: 0.32, type: 0, client: 0.22, version: 0, size: 0, tags: 0.46, created_at: 0,
  };
  const fixedTotal = activeCols.reduce((acc, c) => acc + (FIXED[c.id] ?? 0), 0);
  const flexRoom = Math.max(180, tableWidth - fixedTotal);
  const flexShareSum = activeCols.reduce((acc, c) => acc + FLEX_SHARE[c.id], 0) || 1;

  // Build head + body restricted to active columns.
  const headRow = activeCols.map((c) => c.label);
  const valueFor = (a: Asset, id: PdfColumnId): string => {
    switch (id) {
      case "name": return a.name;
      case "type": return TYPE_LABEL[a.asset_type] ?? a.asset_type;
      case "client": return a.client_id ? clientMap.get(a.client_id) ?? "—" : "—";
      case "version": return String(a.version ?? "");
      case "size": return formatBytes(a.file_size);
      case "tags": {
        const tags = a.tags ?? [];
        const shown = tags.slice(0, 8).join(", ");
        return tags.length > 8 ? `${shown} +${tags.length - 8}` : shown;
      }
      case "created_at": return a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy") : "—";
    }
  };
  const bodyRows = assets.map((a) => activeCols.map((c) => valueFor(a, c.id)));

  // Column styles (width + alignment) per active column.
  const columnStyles: Record<number, Record<string, unknown>> = {};
  activeCols.forEach((c, idx) => {
    const fixed = FIXED[c.id];
    const width = fixed != null ? fixed : Math.round((FLEX_SHARE[c.id] / flexShareSum) * flexRoom);
    const style: Record<string, unknown> = { cellWidth: width };
    if (c.id === "name") style.fontStyle = "bold";
    if (c.id === "version" || c.id === "size" || c.id === "created_at") style.halign = "right";
    if (c.id === "tags") style.textColor = [80, 80, 90];
    columnStyles[idx] = style;
  });

  autoTable(doc, {
    head: [headRow],
    body: bodyRows,
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
    columnStyles,
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