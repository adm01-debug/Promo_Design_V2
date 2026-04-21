import jsPDF from "jspdf";
import type { ColorEntry, FontEntry } from "../hooks/use-brand-guidelines";
import { wcagBoth } from "./color-contrast";

interface BrandKitData {
  clientName: string;
  primary: ColorEntry[];
  secondary: ColorEntry[];
  fonts: FontEntry[];
  doRules: string[];
  dontRules: string[];
  notes?: string | null;
  logoDataUrl?: string | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
}

function detectImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp|svg\+xml)/i);
  if (!m) return "PNG";
  const t = m[1].toLowerCase();
  if (t === "jpeg" || t === "jpg") return "JPEG";
  if (t === "webp") return "WEBP";
  return "PNG";
}

export function generateBrandKitPdf(data: BrandKitData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  const ensureSpace = (needed: number) => {
    if (y + needed > 285) {
      doc.addPage();
      y = 15;
    }
  };

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Brand Guidelines", 15, y);
  y += 7;
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(data.clientName, 15, y);
  doc.setTextColor(0);
  y += 8;

  if (data.logoDataUrl) {
    try {
      const fmt = detectImageFormat(data.logoDataUrl);
      doc.addImage(data.logoDataUrl, fmt, pageW - 45, 12, 30, 30);
    } catch {
      // ignore
    }
  }

  // Colors
  const drawSwatches = (title: string, list: ColorEntry[]) => {
    if (list.length === 0) return;
    ensureSpace(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 15, y);
    y += 4;
    const sw = 22;
    const gap = 4;
    const rowH = sw + 18;
    let x = 15;
    list.forEach((c) => {
      if (x + sw > pageW - 15) {
        x = 15;
        y += rowH;
      }
      if (y + rowH > 285) {
        doc.addPage();
        y = 15;
        x = 15;
      }
      const [r, g, b] = hexToRgb(c.hex);
      doc.setFillColor(r, g, b);
      doc.rect(x, y, sw, sw, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      doc.text(c.hex.toUpperCase(), x, y + sw + 4);
      if (c.name) doc.text(c.name.slice(0, 14), x, y + sw + 8);
      const w = wcagBoth(c.hex);
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`${w.vsWhite} · vs branco`, x, y + sw + 12);
      doc.setTextColor(0);
      x += sw + gap;
    });
    y += rowH;
  };

  drawSwatches("Cores primárias", data.primary);
  drawSwatches("Cores secundárias", data.secondary);

  // Fonts
  if (data.fonts.length) {
    ensureSpace(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Tipografia", 15, y);
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.fonts.forEach((f) => {
      ensureSpace(6);
      const line = `• ${f.name}${f.usage ? ` — ${f.usage}` : ""}${f.source ? ` (${f.source})` : ""}`;
      doc.text(line, 15, y);
      y += 5;
    });
    y += 3;
  }

  // Rules
  const drawRules = (title: string, items: string[], color: [number, number, number]) => {
    if (items.length === 0) return;
    ensureSpace(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(title, 15, y);
    doc.setTextColor(0);
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    items.forEach((r) => {
      const lines = doc.splitTextToSize(`• ${r}`, pageW - 30);
      ensureSpace(lines.length * 4.5 + 2);
      doc.text(lines, 15, y);
      y += lines.length * 4.5;
    });
    y += 3;
  };

  drawRules("✓ Do", data.doRules, [16, 122, 60]);
  drawRules("✗ Don't", data.dontRules, [185, 28, 28]);

  if (data.notes) {
    ensureSpace(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Notas", 15, y);
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.notes, pageW - 30);
    doc.text(lines, 15, y);
  }

  return doc;
}