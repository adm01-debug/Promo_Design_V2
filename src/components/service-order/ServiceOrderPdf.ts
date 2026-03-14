import jsPDF from "jspdf";
import "jspdf-autotable";

export interface PdfFormData {
  osNumber: string;
  date: string;
  deliveryDate: string;
  clientName: string;
  clientCompany: string;
  clientPhone: string;
  clientEmail: string;
  productName: string;
  productSku: string;
  productMaterial: string;
  productColors: string;
  technique: string;
  areaName: string;
  areaWidth: string;
  areaHeight: string;
  areaShape: string;
  artColors: string;
  artDpi: string;
  artFile: string;
  artFileDataUrl: string;
  quantity: string;
  observations: string;
  mockupImageUrl: string;
  identificacaoCaixa: string;
  materialEvento: boolean;
  aprovarPrimeiraPeca: boolean;
  qtdCompra: string;
  qtdLiberada: string;
  fazParteKit: boolean;
  gravacaoDetalhe: string;
}

// Cores do template real
const GREEN = [34, 139, 34] as const; // Verde Promo Brindes
const DARK = [15, 15, 20] as const;
const WHITE = [255, 255, 255] as const;
const GRAY_LIGHT = [245, 245, 245] as const;
const GRAY_TEXT = [100, 100, 100] as const;

// Gabarito de técnicas com cores (baseado no PDF verso)
const TECHNIQUE_COLORS: Record<string, [number, number, number]> = {
  "Laser Fiber": [0, 128, 100],
  "Laser UV": [180, 180, 160],
  "Laser Co2": [60, 60, 60],
  "Serigrafia Têxtil": [200, 50, 50],
  "Serigrafia Vinílica Plana": [200, 160, 170],
  "Serigrafia Vinílica Rotativa": [0, 200, 200],
  "Tampografia": [230, 150, 50],
  "(DTF) Transfer Digital Têxtil": [220, 50, 80],
  "(DTF) Transfer Digital UV": [180, 50, 50],
  "Sublimação - Caneca": [80, 120, 60],
  "Sublimação Têxtil": [40, 100, 40],
  "Hot Stamping (Baixo Relevo)": [220, 180, 50],
  "Digital UV": [230, 200, 50],
  "Adesivo Resinado": [0, 180, 230],
  "Bordado": [150, 100, 50],
  "Decalque": [180, 200, 50],
  "Filme de Recorte": [180, 30, 50],
};

function sim(v: boolean) { return v ? "SIM" : "NÃO"; }
function val(v: string) { return v || "–"; }

export function generateServiceOrderPdf(form: PdfFormData, logoDataUrl?: string): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 12;

  // ═══════════════════════════════════════
  // PÁGINA 1 — FRENTE (Layout real Promo Brindes)
  // ═══════════════════════════════════════

  // ── Header verde com identificação ──
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 14, "F");

  // Logo da Promo Brindes
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", m, 1, 28, 12);
    } catch { /* fallback to text */ }
  }
  // Fallback text if no logo
  if (!logoDataUrl) {
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PROMO BRINDES", m, 9);
  }

  // Identificação Caixa
  doc.setFontSize(12);
  doc.text("IDENTIFICAÇÃO CAIXA", m + 50, 9);
  if (form.identificacaoCaixa) {
    doc.text(form.identificacaoCaixa, m + 115, 9);
  }

  // Técnica grande no canto superior direito
  doc.setFillColor(...DARK);
  doc.rect(pw - 65, 0, 65, 14, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(form.technique.toUpperCase() || "–", pw - m, 7, { align: "right" });
  doc.setFontSize(8);
  doc.text(`#TICKET ${form.osNumber}`, pw - m, 12, { align: "right" });

  let y = 20;

  // ── Bloco de dados (caixa com borda) ──
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.rect(m, y, pw - m * 2, 32, "S");

  doc.setTextColor(0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const col1 = m + 3;
  const col2 = pw / 2;

  // Linha 1
  doc.text(`Solicitação: ${form.date}`, col1, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text(`Entrega: ${form.deliveryDate || "___/___/______"}`, pw - m - 3, y + 6, { align: "right" });

  // Linha 2
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${val(form.clientName)}${form.clientCompany ? ` — ${form.clientCompany}` : ""}`, col1, y + 13);

  // Linha 3
  doc.text(`Produto: ${val(form.productName)}`, col1, y + 20);
  doc.text(`Cor do Produto: ${val(form.productColors)}`, col2, y + 20);

  // Linha 4
  doc.text(`Gravação: ${val(form.technique)}`, col2 + 40, y + 20);

  // Linha 5
  doc.text(`Material de Evento: ${sim(form.materialEvento)}`, col1, y + 27);
  doc.text(`Aprovar 1ª peça com Cliente (Amostra Física): ${sim(form.aprovarPrimeiraPeca)}`, col2, y + 27);

  y += 38;

  // ── Layout do material aplicado ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Layout do material aplicado:", pw / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREEN);
  doc.text("Favor, manter a proporção e local de gravação como na imagem abaixo.", pw / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 6;

  // Mockup image centralizado
  const mockupMaxH = 75;
  if (form.mockupImageUrl) {
    try {
      const maxW = pw - m * 4;
      doc.addImage(form.mockupImageUrl, "PNG", (pw - maxW) / 2, y, maxW, mockupMaxH);
    } catch { /* skip */ }
  } else {
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(m * 2, y, pw - m * 4, mockupMaxH, "F");
    doc.setTextColor(...GRAY_TEXT);
    doc.text("[Imagem do Mockup]", pw / 2, y + mockupMaxH / 2, { align: "center" });
    doc.setTextColor(0);
  }
  y += mockupMaxH + 6;

  // ── Quantidade e detalhe da gravação ──
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`${val(form.quantity)} Unidades`, pw / 2, y, { align: "center" });
  y += 6;

  if (form.gravacaoDetalhe) {
    doc.setFillColor(...GREEN);
    const dtW = doc.getTextWidth(form.gravacaoDetalhe) + 12;
    doc.roundedRect((pw - dtW) / 2, y - 4, dtW, 7, 1, 1, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.text(form.gravacaoDetalhe, pw / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 8;
  }

  // ── Linha tracejada separadora ──
  y += 2;
  doc.setDrawColor(180);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(m, y, pw - m, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // ── Arte / Logo com dimensões ──
  if (form.artFileDataUrl) {
    try {
      const artW = 30;
      const artH = 30;
      doc.addImage(form.artFileDataUrl, "PNG", m + 10, y, artW, artH);

      // Dimensões
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (form.areaWidth) {
        // Largura (horizontal arrow)
        doc.text(`${form.areaWidth} cm`, m + 10 + artW / 2, y - 2, { align: "center" });
        doc.line(m + 10, y - 1, m + 10 + artW, y - 1);
      }
      if (form.areaHeight) {
        // Altura (label à esquerda)
        doc.text(`${form.areaHeight} cm`, m + 5, y + artH / 2, { align: "center", angle: 90 });
      }

      // Nota
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Logo em tamanho ilustrativo:", m + 10 + artW + 20, y + 10);
      doc.setTextColor(...GREEN);
      doc.text("Ajustar para o tamanho real", m + 10 + artW + 20, y + 15);
      doc.setTextColor(0);

      y += artH + 8;
    } catch { /* skip */ }
  }

  // ── Linha tracejada separadora ──
  doc.setDrawColor(180);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(m, y, pw - m, y);
  doc.setLineDashPattern([], 0);
  y += 6;

  // ── Bloco inferior: Quantidades + Observação ──
  const boxY = y;
  const leftBoxW = 75;
  const rightBoxX = m + leftBoxW + 5;

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(m, boxY, leftBoxW, 30, "S");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Quantidade compra: `, m + 3, boxY + 7);
  doc.setFont("helvetica", "bold");
  doc.text(`${val(form.qtdCompra || form.quantity)} Uni.`, m + 38, boxY + 7);

  doc.setFont("helvetica", "normal");
  doc.text("Quantidade Liberada para", m + 3, boxY + 14);
  doc.text("personalização: ", m + 3, boxY + 19);
  doc.setFont("helvetica", "bold");
  doc.text(`${val(form.qtdLiberada || form.quantity)} Uni.`, m + 32, boxY + 19);

  doc.setFont("helvetica", "normal");
  doc.text(`Faz parte de Kit?: ${sim(form.fazParteKit)}`, m + 3, boxY + 26);

  // Observação box
  doc.rect(rightBoxX, boxY, pw - m - rightBoxX, 30, "S");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("Observação:", rightBoxX + 3, boxY + 7);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  if (form.observations) {
    const obsLines = doc.splitTextToSize(form.observations, pw - m - rightBoxX - 8);
    doc.text(obsLines.slice(0, 5), rightBoxX + 3, boxY + 13);
  }

  // ── Footer da página 1 ──
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    `${form.osNumber} • Gerado por Promo Design Studio • ${new Date().toLocaleString("pt-BR")}`,
    pw / 2, ph - 5, { align: "center" }
  );

  // ═══════════════════════════════════════
  // PÁGINA 2 — VERSO (Controle de Produção)
  // ═══════════════════════════════════════
  doc.addPage();

  y = 15;

  // Seções de controle: Triagem, Gravação, Manuseio, Expedição
  const sections = [
    { title: "Triagem", hasPerda: false },
    { title: "Gravação", hasPerda: true },
    { title: "Manuseio", hasPerda: true, perdaLabel: "Perca no Manuseio (Controle de Qualidade):" },
    { title: "Expedição", hasPerda: false },
  ];

  for (const section of sections) {
    if (y > ph - 60) { doc.addPage(); y = 15; }

    // Header da seção
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(m, y, pw - m * 2, 10, "F");
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(m, y, pw - m * 2, 10, "S");
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${section.title}:          /          /2025`, pw / 2, y + 7, { align: "center" });

    y += 12;

    // Conteúdo da seção
    const sectionH = section.hasPerda ? 28 : 20;
    doc.rect(m, y, pw - m * 2, sectionH, "S");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Horário de início: _____:_____", m + 5, y + 7);
    doc.text("Horário Final: _____:_____", pw - m - 5, y + 7, { align: "right" });

    if (section.hasPerda) {
      const perdaLabel = section.perdaLabel || `Perca na ${section.title}:`;
      doc.text(`${perdaLabel} ____________________________`, m + 5, y + 15);
      doc.text("Assinatura: ____________________________", m + 5, y + 23);
    } else {
      doc.text("Assinatura: ____________________________", m + 5, y + 15);
    }

    y += sectionH + 8;
  }

  // ── Gabarito de Técnicas ──
  y += 5;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Gabarito:", m, y);
  y += 8;

  const techniques = Object.entries(TECHNIQUE_COLORS);
  const colWidth = (pw - m * 2) / 3;

  for (let i = 0; i < techniques.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tx = m + col * colWidth;
    const ty = y + row * 10;

    const [name, color] = techniques[i];

    // Bolinha colorida
    doc.setFillColor(...color);
    doc.circle(tx + 4, ty - 1.5, 3, "F");

    // Nome da técnica
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(name, tx + 10, ty);
  }

  // Footer da página 2
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    `${form.osNumber} • Verso • Promo Design Studio`,
    pw / 2, ph - 5, { align: "center" }
  );

  return doc;
}
