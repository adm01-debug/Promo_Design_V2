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
}

export function generateServiceOrderPdf(form: PdfFormData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 15;

  // Header bar
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, pw, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEM DE SERVIÇO", m, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(form.osNumber, m, 28);
  doc.setFontSize(9);
  doc.text(`Data: ${form.date}`, pw - m, 15, { align: "right" });
  if (form.deliveryDate) {
    doc.text(`Entrega: ${form.deliveryDate}`, pw - m, 22, { align: "right" });
  }

  let y = 48;

  // Client section
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE", m, y);
  y += 2;
  (doc as any).autoTable({
    startY: y,
    margin: { left: m, right: m },
    head: [["Cliente", "Empresa", "Telefone", "E-mail"]],
    body: [[form.clientName || "–", form.clientCompany || "–", form.clientPhone || "–", form.clientEmail || "–"]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Product section
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO PRODUTO", m, y);
  y += 2;
  (doc as any).autoTable({
    startY: y,
    margin: { left: m, right: m },
    head: [["Produto", "SKU", "Material", "Cores do Produto"]],
    body: [[form.productName || "–", form.productSku || "–", form.productMaterial || "–", form.productColors || "–"]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Printing specs
  doc.setFont("helvetica", "bold");
  doc.text("ESPECIFICAÇÕES DE GRAVAÇÃO", m, y);
  y += 2;
  (doc as any).autoTable({
    startY: y,
    margin: { left: m, right: m },
    head: [["Técnica", "Área", "Largura", "Altura", "Formato", "Cores da Arte", "DPI"]],
    body: [[
      form.technique || "–",
      form.areaName || "–",
      form.areaWidth ? `${form.areaWidth}cm` : "–",
      form.areaHeight ? `${form.areaHeight}cm` : "–",
      form.areaShape || "–",
      form.artColors || "–",
      form.artDpi || "–",
    ]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Quantity & delivery
  doc.setFont("helvetica", "bold");
  doc.text("PRODUÇÃO", m, y);
  y += 2;
  (doc as any).autoTable({
    startY: y,
    margin: { left: m, right: m },
    head: [["Quantidade", "Data de Entrega", "Arquivo da Arte"]],
    body: [[form.quantity || "–", form.deliveryDate || "–", form.artFile || "–"]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 50], textColor: [255, 255, 255] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Art image preview (NEW)
  if (form.artFileDataUrl) {
    try {
      if (y > ph - 70) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text("ARTE / LOGO", m, y);
      y += 4;
      const artW = 50;
      const artH = 50;
      doc.addImage(form.artFileDataUrl, "PNG", m, y, artW, artH);
      y += artH + 8;
    } catch {
      // skip if image invalid
    }
  }

  // Mockup image
  if (form.mockupImageUrl) {
    try {
      if (y > ph - 80) { doc.addPage(); y = 20; }
      const maxW = pw - m * 2;
      const maxH = 70;
      doc.setFont("helvetica", "bold");
      doc.text("MOCKUP APROVADO", m, y);
      y += 4;
      doc.addImage(form.mockupImageUrl, "PNG", m, y, maxW, maxH);
      y += maxH + 6;
    } catch {
      // skip image if invalid
    }
  }

  // Observations
  if (form.observations) {
    if (y > ph - 50) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES", m, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(form.observations, pw - m * 2);
    doc.text(lines, m, y);
    y += lines.length * 4 + 6;
  }

  // Signature lines
  if (y > ph - 40) { doc.addPage(); y = 20; }
  y = Math.max(y + 10, ph - 40);
  doc.setDrawColor(180);
  doc.line(m, y, m + 65, y);
  doc.line(pw - m - 65, y, pw - m, y);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Responsável Produção", m + 32, y + 5, { align: "center" });
  doc.text("Aprovação Cliente", pw - m - 32, y + 5, { align: "center" });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `${form.osNumber} • Gerado por Promo Design Studio • ${new Date().toLocaleString("pt-BR")}`,
    pw / 2, ph - 6, { align: "center" }
  );

  return doc;
}
