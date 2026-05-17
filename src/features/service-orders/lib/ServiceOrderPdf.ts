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
function val(v: string | number | undefined) { return v ? String(v) : "–"; }

export function generateServiceOrderPdf(form: PdfFormData, logoDataUrl?: string): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 12;

  // ═══════════════════════════════════════
  // PÁGINA 1 — FRENTE (Layout Promo Brindes)
  // ═══════════════════════════════════════

  // ── Header verde com identificação ──
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 18, "F");

  // Logo da Promo Brindes
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", m, 2, 35, 14);
    } catch { /* fallback to text */ }
  } else {
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PROMO BRINDES", m, 10);
  }

  // Identificação Caixa (Highlight)
  doc.setFillColor(255, 255, 255, 0.2);
  doc.roundedRect(m + 50, 4, 70, 10, 1, 1, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO CAIXA", m + 53, 10.5);
  doc.setFontSize(12);
  doc.text(val(form.identificacaoCaixa), m + 115, 10.5, { align: "right" });

  // Técnica grande no canto superior direito
  doc.setFillColor(...DARK);
  doc.rect(pw - 65, 0, 65, 18, "F");
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(form.technique.toUpperCase() || "TÉCNICA", pw - m, 8, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`#TICKET ${form.osNumber}`, pw - m, 13, { align: "right" });

  let y = 25;

  // ── Bloco de dados do Cliente e OS ──
  doc.setDrawColor(220);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(m, y, pw - m * 2, 35, 1, 1, "FD");

  doc.setTextColor(0);
  doc.setFontSize(8);
  const col1 = m + 4;
  const col2 = pw / 2;

  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE E SOLICITAÇÃO", col1, y + 6);
  doc.line(col1, y + 8, pw - m - 4, y + 8);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Solicitação: ${val(form.date)}`, col1, y + 14);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text(`ENTREGA: ${val(form.deliveryDate)}`, pw - m - 4, y + 14, { align: "right" });
  
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${val(form.clientName)}`, col1, y + 21);
  if (form.clientCompany) {
    doc.text(`Empresa: ${val(form.clientCompany)}`, col2, y + 21);
  }
  
  doc.text(`E-mail: ${val(form.clientEmail)}`, col1, y + 28);
  doc.text(`Telefone: ${val(form.clientPhone)}`, col2, y + 28);

  y += 42;

  // ── Detalhes do Produto ──
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(m, y, pw - m * 2, 20, "F");
  doc.setDrawColor(200);
  doc.rect(m, y, pw - m * 2, 20, "S");

  doc.setFont("helvetica", "bold");
  doc.text("DETALHES DO PRODUTO", col1, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(`Produto: ${val(form.productName)}`, col1, y + 13);
  doc.text(`SKU: ${val(form.productSku)}`, col2, y + 13);
  doc.text(`Material: ${val(form.productMaterial)}`, col1, y + 17);
  doc.text(`Cor do Produto: ${val(form.productColors)}`, col2, y + 17);

  y += 26;

  // ── Layout do material aplicado ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("LAYOUT DO MATERIAL APLICADO", pw / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREEN);
  doc.text("Manter proporção e posicionamento conforme imagem abaixo.", pw / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 6;

  // Mockup image
  const mockupMaxH = 70;
  if (form.mockupImageUrl) {
    try {
      const maxW = pw - m * 4;
      doc.addImage(form.mockupImageUrl, "PNG", (pw - maxW) / 2, y, maxW, mockupMaxH);
    } catch { /* skip */ }
  } else {
    doc.setFillColor(...GRAY_LIGHT);
    doc.rect(m * 2, y, pw - m * 4, mockupMaxH, "F");
    doc.setTextColor(...GRAY_TEXT);
    doc.text("[Sem imagem de mockup]", pw / 2, y + mockupMaxH / 2, { align: "center" });
  }
  y += mockupMaxH + 8;

  // ── Quantidade e Técnica ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${val(form.quantity)} UNIDADES`, pw / 2, y, { align: "center" });
  y += 8;

  if (form.gravacaoDetalhe) {
    doc.setFillColor(...GREEN);
    const dtW = doc.getTextWidth(form.gravacaoDetalhe.toUpperCase()) + 16;
    doc.roundedRect((pw - dtW) / 2, y - 5, dtW, 8, 1, 1, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.text(form.gravacaoDetalhe.toUpperCase(), pw / 2, y + 1, { align: "center" });
    doc.setTextColor(0);
    y += 10;
  }

  // ── Arte / Logotipo ──
  doc.setDrawColor(230);
  doc.line(m, y, pw - m, y);
  y += 6;

  if (form.artFileDataUrl) {
    try {
      const artW = 35;
      const artH = 35;
      doc.addImage(form.artFileDataUrl, "PNG", m + 10, y, artW, artH);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DIMENSÕES DA GRAVAÇÃO:", m + 10 + artW + 10, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(`Largura: ${val(form.areaWidth)} cm`, m + 10 + artW + 10, y + 17);
      doc.text(`Altura: ${val(form.areaHeight)} cm`, m + 10 + artW + 10, y + 23);
      doc.text(`Área: ${val(form.areaName)}`, m + 10 + artW + 10, y + 29);
      
      doc.setTextColor(...GREEN);
      doc.setFontSize(7);
      doc.text("* Arte em tamanho ilustrativo. Ajustar para produção.", m + 10 + artW + 10, y + 35);
      doc.setTextColor(0);

      y += artH + 10;
    } catch { /* skip */ }
  }

  // ── Rodapé Técnico ──
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(m, ph - 45, pw - m * 2, 35, "S");

  const footerCol1 = m + 4;
  const footerCol2 = m + 65;
  const footerY = ph - 40;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMAÇÕES DE PRODUÇÃO", footerCol1, footerY);
  doc.setFont("helvetica", "normal");
  doc.text(`Qtd Compra: ${val(form.qtdCompra)}`, footerCol1, footerY + 7);
  doc.text(`Qtd Liberada: ${val(form.qtdLiberada)}`, footerCol1, footerY + 13);
  doc.text(`Faz parte de Kit: ${sim(form.fazParteKit)}`, footerCol1, footerY + 19);

  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES TÉCNICAS:", footerCol2, footerY);
  doc.setFont("helvetica", "normal");
  if (form.observations) {
    const obsLines = doc.splitTextToSize(form.observations, pw - m - footerCol2 - 5);
    doc.text(obsLines.slice(0, 4), footerCol2, footerY + 6);
  }

  // Status de Aprovação
  doc.setFont("helvetica", "bold");
  doc.text(`Material de Evento: ${sim(form.materialEvento)}`, m + 4, ph - 15);
  doc.text(`Aprovar 1ª Peça: ${sim(form.aprovarPrimeiraPeca)}`, pw / 2, ph - 15);

  // Footer Copyright
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(
    `OS ${form.osNumber} • PROMO DESIGN • ${new Date().toLocaleString("pt-BR")}`,
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
    `${form.osNumber} • Verso • Promo Design`,
    pw / 2, ph - 5, { align: "center" }
  );

  return doc;
}

export function generateFinalArtPdf(form: PdfFormData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20;

  // Header limpo para arte final
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ARTE FINAL PARA PRODUÇÃO", pw / 2, 15, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`OS: ${form.osNumber} | Técnica: ${form.technique}`, pw / 2, 20, { align: "center" });
  
  doc.setDrawColor(200);
  doc.line(m, 24, pw - m, 24);

  let y = 35;

  // Informações Técnicas da Arte
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ESPECIFICAÇÕES:", m, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Produto: ${form.productName} (${form.productSku})`, m, y + 6);
  doc.text(`Cores da Gravação (Pantone): ${val(form.artColors)}`, m, y + 12);
  doc.text(`Dimensões Reais: ${val(form.areaWidth)} x ${val(form.areaHeight)} cm`, m, y + 18);
  
  y += 35;

  // Arte em destaque
  if (form.artFileDataUrl) {
    try {
      const maxArtW = pw - m * 2;
      const maxArtH = 100;
      doc.addImage(form.artFileDataUrl, "PNG", m, y, maxArtW, maxArtH, undefined, "FAST");
      y += maxArtH + 15;
    } catch {
      doc.text("[Erro ao carregar imagem da arte]", m, y);
      y += 20;
    }
  }

  // Notas de Produção
  doc.setFont("helvetica", "bold");
  doc.text("NOTAS PARA O OPERADOR:", m, y);
  doc.setFont("helvetica", "normal");
  doc.text(`• Técnica: ${form.technique}`, m, y + 8);
  if (form.gravacaoDetalhe) doc.text(`• Detalhe: ${form.gravacaoDetalhe}`, m, y + 14);
  if (form.observations) {
    const lines = doc.splitTextToSize(`• Obs: ${form.observations}`, pw - m * 2);
    doc.text(lines, m, y + 20);
  }

  // Footer de segurança
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("Documento gerado automaticamente pelo Sistema de Gestão Promo Design.", pw / 2, ph - 15, { align: "center" });
  doc.text("Verificar dimensões e cores antes de iniciar a produção em larga escala.", pw / 2, ph - 10, { align: "center" });

  return doc;
}
