import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { StoredServiceOrder, OsStatus } from "../hooks/use-service-orders";

const GREEN: [number, number, number] = [34, 139, 34];
const DARK: [number, number, number] = [15, 15, 20];
const GRAY_TEXT: [number, number, number] = [100, 100, 100];

const STATUS_LABEL: Record<OsStatus, string> = {
  aberta: "Aberta",
  em_producao: "Em Produção",
  concluida: "Concluída",
  cancelada: "Cancelada",
  aprovada: "Aprovada",
  pronta: "Pronta",
  entregue: "Entregue",
};

export interface BatchPdfFilters {
  status?: OsStatus | "all";
  search?: string;
}

export interface BatchPdfProgress {
  stage: string;
  current: number;
  total: number;
  percent: number;
}

export type BatchPdfProgressCallback = (p: BatchPdfProgress) => void;

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Promo Brindes — Ordens de Serviço", 12, ph - 6);
  doc.text(`Página ${pageNum} de ${totalPages}`, pw - 12, ph - 6, { align: "right" });
}

function drawCover(
  doc: jsPDF,
  orders: StoredServiceOrder[],
  filters: BatchPdfFilters,
  logoDataUrl?: string,
) {
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 40, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", 12, 8, 24, 24);
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Ordens de Serviço", logoDataUrl ? 42 : 12, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} • ${orders.length} OS(s)`,
    logoDataUrl ? 42 : 12,
    30,
  );

  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Filtros aplicados", 12, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const statusLabel =
    !filters.status || filters.status === "all" ? "Todos" : STATUS_LABEL[filters.status];
  doc.text(`Status: ${statusLabel}`, 12, 64);
  doc.text(`Busca: ${filters.search?.trim() || "—"}`, 12, 71);

  const totalQty = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
  doc.setFont("helvetica", "bold");
  doc.text(`Total de peças: ${totalQty.toLocaleString("pt-BR")}`, 12, 84);

  // Tabela resumo
  autoTable(doc, {
    startY: 92,
    head: [["Nº OS", "Cliente", "Produto", "Técnica", "Qtd", "Status", "Entrega"]],
    body: orders.map((o) => [
      o.osNumber,
      [o.clientName, o.clientCompany].filter(Boolean).join(" / "),
      o.productName,
      o.technique,
      o.quantity,
      STATUS_LABEL[o.status],
      o.deliveryDate || "—",
    ]),
    theme: "striped",
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 12, right: 12, bottom: 16 },
  });
}

async function drawOrderPage(doc: jsPDF, order: StoredServiceOrder, onMockupFetch?: () => void) {
  const pw = doc.internal.pageSize.getWidth();
  const m = 12;

  // Header
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`OS ${order.osNumber}`, m, 11);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(STATUS_LABEL[order.status], pw - m, 11, { align: "right" });

  // Bloco cliente
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", m, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${order.clientName}${order.clientCompany ? ` — ${order.clientCompany}` : ""}`, m, 35);
  if (order.clientEmail) doc.text(`E-mail: ${order.clientEmail}`, m, 41);
  if (order.clientPhone) doc.text(`Telefone: ${order.clientPhone}`, m, 47);

  // Bloco produto
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Produto", m, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${order.productName}${order.productSku ? ` (${order.productSku})` : ""}`, m, 67);
  if (order.productMaterial) doc.text(`Material: ${order.productMaterial}`, m, 73);
  if (order.productColors) doc.text(`Cores: ${order.productColors}`, m, 79);

  // Detalhes técnicos
  autoTable(doc, {
    startY: 88,
    head: [["Técnica", "Área", "Dimensões", "Qtd", "Entrega"]],
    body: [
      [
        order.technique,
        order.areaName || "—",
        order.areaWidth && order.areaHeight ? `${order.areaWidth} × ${order.areaHeight} cm` : "—",
        order.quantity,
        order.deliveryDate || "—",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: m, right: m },
  });

  // Mockup
  if (order.mockupImageUrl) {
    onMockupFetch?.();
    const dataUrl = await fetchAsDataUrl(order.mockupImageUrl);
    if (dataUrl) {
      const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      const maxW = pw - m * 2;
      const imgH = 90;
      try {
        doc.addImage(dataUrl, "JPEG", m, y, maxW, imgH, undefined, "FAST");
      } catch {
        /* ignore */
      }
    }
  }

  // Observações
  if (order.observations) {
    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", m, ph - 40);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(order.observations, pw - m * 2);
    doc.text(lines, m, ph - 33);
  }
}

export async function generateBatchPdf(
  orders: StoredServiceOrder[],
  filters: BatchPdfFilters,
  logoDataUrl?: string,
  onProgress?: BatchPdfProgressCallback,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  onProgress?.({ stage: "Montando capa", current: 0, total: orders.length, percent: 2 });
  drawCover(doc, orders, filters, logoDataUrl);
  onProgress?.({ stage: "Capa pronta", current: 0, total: orders.length, percent: 5 });

  const total = orders.length;
  for (let i = 0; i < total; i++) {
    const order = orders[i];
    const basePercent = 5 + (i / Math.max(1, total)) * 90;
    onProgress?.({
      stage: "Montando OS",
      current: i + 1,
      total,
      percent: basePercent,
    });
    doc.addPage();
    await drawOrderPage(doc, order, () => {
      onProgress?.({
        stage: "Baixando mockup",
        current: i + 1,
        total,
        percent: basePercent + (90 / Math.max(1, total)) * 0.4,
      });
    });
    // Yield to browser every 3 iterations so the UI can repaint
    if ((i + 1) % 3 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.({ stage: "Finalizando", current: total, total, percent: 98 });
  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  onProgress?.({ stage: "Pronto", current: total, total, percent: 100 });
  return doc;
}
