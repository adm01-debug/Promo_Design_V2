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
};

const STATUS_COLOR: Record<OsStatus, [number, number, number]> = {
  aberta: [59, 130, 246],
  em_producao: [234, 179, 8],
  concluida: [34, 197, 94],
  cancelada: [239, 68, 68],
};

export interface ClientSummaryClient {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface ClientSummaryProgress {
  stage: string;
  current: number;
  total: number;
  percent: number;
}

export type ClientSummaryProgressCallback = (p: ClientSummaryProgress) => void;

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
  doc.text("Promo Brindes — Resumo do Projeto", 12, ph - 6);
  doc.text(`Página ${pageNum} de ${totalPages}`, pw - 12, ph - 6, { align: "right" });
}

function drawDonut(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  segments: { color: [number, number, number]; value: number }[],
) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    doc.setDrawColor(220);
    doc.setLineWidth(6);
    doc.circle(cx, cy, radius, "S");
    return;
  }
  // Aproximação: desenhar arcos como pequenas linhas/setores via triângulos
  let angle = -Math.PI / 2;
  segments.forEach((seg) => {
    if (seg.value === 0) return;
    const sweep = (seg.value / total) * Math.PI * 2;
    const steps = Math.max(6, Math.ceil((sweep / (Math.PI * 2)) * 60));
    doc.setFillColor(...seg.color);
    for (let i = 0; i < steps; i++) {
      const a1 = angle + (sweep * i) / steps;
      const a2 = angle + (sweep * (i + 1)) / steps;
      const x1 = cx + Math.cos(a1) * radius;
      const y1 = cy + Math.sin(a1) * radius;
      const x2 = cx + Math.cos(a2) * radius;
      const y2 = cy + Math.sin(a2) * radius;
      doc.triangle(cx, cy, x1, y1, x2, y2, "F");
    }
    angle += sweep;
  });
  // Furo central (donut)
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, radius * 0.55, "F");
  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(String(total), cx, cy + 1, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_TEXT);
  doc.text("OSs", cx, cy + 6, { align: "center" });
}

function drawBars(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  items: { label: string; value: number }[],
) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const rowH = h / Math.max(1, items.length);
  items.forEach((item, idx) => {
    const ry = y + idx * rowH;
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(
      item.label.length > 28 ? item.label.slice(0, 27) + "…" : item.label,
      x,
      ry + rowH * 0.6,
    );
    const barX = x + 60;
    const barW = (w - 80) * (item.value / max);
    doc.setFillColor(...GREEN);
    doc.rect(barX, ry + rowH * 0.25, Math.max(1, barW), rowH * 0.5, "F");
    doc.setTextColor(...GRAY_TEXT);
    doc.text(String(item.value), barX + barW + 2, ry + rowH * 0.6);
  });
}

export async function generateClientSummaryPdf(
  client: ClientSummaryClient,
  orders: StoredServiceOrder[],
  periodDays: number,
  logoDataUrl?: string,
  onProgress?: ClientSummaryProgressCallback,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 12;

  onProgress?.({ stage: "Preparando capa", current: 0, total: 0, percent: 5 });
  // ─── Capa ───
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 50, "F");
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", m, 10, 30, 30);
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("Resumo do Projeto", logoDataUrl ? 48 : m, 18);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(client.name, logoDataUrl ? 48 : m, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  if (client.company) doc.text(client.company, logoDataUrl ? 48 : m, 38);
  doc.text(
    `Período: últimos ${periodDays} dias • Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    logoDataUrl ? 48 : m,
    45,
  );

  // ─── KPIs ───
  onProgress?.({ stage: "Calculando KPIs", current: 0, total: 0, percent: 15 });
  const totalOrders = orders.length;
  const totalQty = orders.reduce((s, o) => s + (parseInt(o.quantity) || 0), 0);
  const byStatus: Record<OsStatus, number> = {
    aberta: 0,
    em_producao: 0,
    concluida: 0,
    cancelada: 0,
  };
  orders.forEach((o) => {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  });

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Indicadores", m, 64);

  // Cards de KPI
  const cardY = 70;
  const cardW = (pw - m * 2 - 8) / 2;
  const drawKpi = (x: number, label: string, value: string) => {
    doc.setDrawColor(220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cardY, cardW, 22, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 4, cardY + 6);
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 4, cardY + 17);
  };
  drawKpi(m, "Total de OSs", String(totalOrders));
  drawKpi(m + cardW + 8, "Total de peças", totalQty.toLocaleString("pt-BR"));

  // Donut por status
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text("OSs por status", m, 105);
  drawDonut(
    doc,
    m + 25,
    130,
    18,
    (Object.keys(byStatus) as OsStatus[]).map((k) => ({
      color: STATUS_COLOR[k],
      value: byStatus[k],
    })),
  );
  // Legenda
  let lgY = 115;
  (Object.keys(byStatus) as OsStatus[]).forEach((k) => {
    doc.setFillColor(...STATUS_COLOR[k]);
    doc.rect(m + 55, lgY - 3, 4, 4, "F");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.text(`${STATUS_LABEL[k]}: ${byStatus[k]}`, m + 62, lgY);
    lgY += 6;
  });

  // Top técnicas
  const techCount = new Map<string, number>();
  orders.forEach((o) => techCount.set(o.technique, (techCount.get(o.technique) ?? 0) + 1));
  const topTech = [...techCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Top técnicas", pw / 2 + 4, 105);
  if (topTech.length > 0) {
    drawBars(doc, pw / 2 + 4, 112, pw / 2 - m - 4, 35, topTech);
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY_TEXT);
    doc.text("Sem dados no período", pw / 2 + 4, 120);
  }

  // ─── Timeline ───
  onProgress?.({ stage: "Montando histórico", current: 0, total: 0, percent: 25 });
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Histórico de OSs", m, 18);

  autoTable(doc, {
    startY: 24,
    head: [["Data", "Nº OS", "Produto", "Técnica", "Qtd", "Status"]],
    body: orders.map((o) => [
      o.date ? new Date(o.date).toLocaleDateString("pt-BR") : "—",
      o.osNumber,
      o.productName,
      o.technique,
      o.quantity,
      STATUS_LABEL[o.status],
    ]),
    theme: "striped",
    headStyles: { fillColor: GREEN, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: m, right: m, bottom: 14 },
  });

  // ─── Galeria de mockups ───
  const withMockups = orders.filter((o) => o.mockupImageUrl).slice(0, 12);
  if (withMockups.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Galeria de Mockups", m, 18);

    let done = 0;
    onProgress?.({
      stage: "Baixando mockups",
      current: 0,
      total: withMockups.length,
      percent: 30,
    });
    const dataUrls = await Promise.all(
      withMockups.map(async (o) => {
        const url = await fetchAsDataUrl(o.mockupImageUrl);
        done++;
        onProgress?.({
          stage: "Baixando mockups",
          current: done,
          total: withMockups.length,
          percent: 30 + (done / withMockups.length) * 50,
        });
        return url;
      }),
    );
    onProgress?.({
      stage: "Montando galeria",
      current: withMockups.length,
      total: withMockups.length,
      percent: 85,
    });

    const cols = 3;
    const gap = 6;
    const cellW = (pw - m * 2 - gap * (cols - 1)) / cols;
    const cellH = cellW * 0.85;
    let gx = m;
    let gy = 26;

    withMockups.forEach((o, idx) => {
      if (gy + cellH > doc.internal.pageSize.getHeight() - 16) {
        doc.addPage();
        gy = 18;
      }
      doc.setDrawColor(220);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(gx, gy, cellW, cellH, 2, 2, "FD");
      const dataUrl = dataUrls[idx];
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, "JPEG", gx + 2, gy + 2, cellW - 4, cellH - 12, undefined, "FAST");
        } catch {
          /* ignore */
        }
      }
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "bold");
      doc.text(o.osNumber, gx + 3, gy + cellH - 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY_TEXT);
      const prod = o.productName.length > 22 ? o.productName.slice(0, 21) + "…" : o.productName;
      doc.text(prod, gx + 20, gy + cellH - 4);

      const col = (idx + 1) % cols;
      if (col === 0) {
        gx = m;
        gy += cellH + gap;
      } else {
        gx += cellW + gap;
      }
    });
  }

  // Footers
  onProgress?.({ stage: "Finalizando", current: 0, total: 0, percent: 95 });
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }

  onProgress?.({ stage: "Pronto", current: 0, total: 0, percent: 100 });
  return doc;
}

export function clientSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "cliente"
  );
}
