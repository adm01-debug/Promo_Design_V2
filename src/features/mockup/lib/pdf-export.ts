import jsPDF from "jspdf";
import "jspdf-autotable";

// jspdf-autotable augments jsPDF at runtime; declare the method for TS.
type JsPdfWithAutoTable = jsPDF & {
  autoTable: (options: Record<string, unknown>) => void;
};

interface MockupData {
  productName: string;
  technique: string;
  dimensions: { width: number; height: number };
  colors: string[];
  area: string;
  clientName?: string;
  date: string;
  mockupImageDataUrl: string;
}

/** Generate approval layout PDF (A4) */
export function generateApprovalPdf(data: MockupData): jsPDF {
  const isLandscape = data.dimensions.width > data.dimensions.height;
  const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LAYOUT DE APROVAÇÃO", margin, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${data.date}`, pageWidth - margin, 15, { align: "right" });
  if (data.clientName) {
    doc.text(`Cliente: ${data.clientName}`, pageWidth - margin, 22, { align: "right" });
  }

  // Mockup image
  const imgY = 45;
  const maxImgWidth = pageWidth - margin * 2;
  const maxImgHeight = pageHeight - 120;

  try {
    const imgRatio = data.dimensions.width / data.dimensions.height;
    let imgW = maxImgWidth;
    let imgH = imgW / imgRatio;
    if (imgH > maxImgHeight) {
      imgH = maxImgHeight;
      imgW = imgH * imgRatio;
    }
    const imgX = (pageWidth - imgW) / 2;
    doc.addImage(data.mockupImageDataUrl, "PNG", imgX, imgY, imgW, imgH);
  } catch {
    doc.setTextColor(150, 150, 150);
    doc.text("Imagem do mockup", pageWidth / 2, imgY + 40, { align: "center" });
  }

  // Technical data table
  const tableY = pageHeight - 60;
  doc.setTextColor(0, 0, 0);
  (doc as JsPdfWithAutoTable).autoTable({
    startY: tableY,
    margin: { left: margin, right: margin },
    head: [["Produto", "Técnica", "Área", "Dimensões", "Cores"]],
    body: [[
      data.productName,
      data.technique,
      data.area,
      `${data.dimensions.width}cm × ${data.dimensions.height}cm`,
      data.colors.join(", ") || "N/A",
    ]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 15, 20], textColor: [255, 255, 255] },
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Este layout é para fins de aprovação. Cores podem sofrer variação conforme material e técnica.",
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  return doc;
}
