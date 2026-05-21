import { loadImageWithFallback } from "./canvas-utils";
import { generateApprovalPdf } from "./pdf-export";

export type ExportFormat = "png" | "jpeg" | "webp";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
export type Placement = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
};

export interface ExportOptions {
  productImage: string;
  productSku: string;
  productName: string;
  logoPreview: string | null;
  showLogo: boolean;
  placements: Record<string, Placement>;
  logoOpacity: number;
  blendMode: BlendMode;
  shadowEnabled: boolean;
  shadowIntensity: number;
  viewAreaW: number;
  viewAreaH: number;
  exportScale: number;
  exportQuality: number;
  exportFormat: ExportFormat;
  approvedViews: Set<string>;
  views: {
    id: string;
    label: string;
    areaPercent: { x: number; y: number; w: number; h: number };
  }[];
  watermarkOptions?: {
    include: boolean;
    opacity: number;
    scale: number;
    position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
}

/**
 * Renders the multi-view mockup to a canvas
 */
export async function renderMultiViewCanvas(options: ExportOptions): Promise<HTMLCanvasElement> {
  const {
    productImage,
    logoPreview,
    showLogo,
    placements,
    logoOpacity,
    blendMode,
    shadowEnabled,
    shadowIntensity,
    exportScale,
    views,
    watermarkOptions,
  } = options;

  const productImg = await loadImageWithFallback(productImage);
  const logoImg = logoPreview ? await loadImageWithFallback(logoPreview) : null;
  const canvas = document.createElement("canvas");

  const baseSize = 1200;
  const size = baseSize * exportScale;

  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext("2d")!;

  // High quality settings
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (let i = 0; i < views.length; i++) {
    const view = views[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ox = col * size;
    const oy = row * size;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ox, oy, size, size);

    // Grid background for professional look
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1 * exportScale;
    for (let g = 0; g < size; g += 100 * exportScale) {
      ctx.beginPath();
      ctx.moveTo(ox + g, oy);
      ctx.lineTo(ox + g, oy + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, oy + g);
      ctx.lineTo(ox + size, oy + g);
      ctx.stroke();
    }

    const scale = (size * 0.85) / Math.max(productImg.width, productImg.height);
    const dx = ox + (size - productImg.width * scale) / 2;
    const dy = oy + (size - productImg.height * scale) / 2;

    ctx.drawImage(productImg, dx, dy, productImg.width * scale, productImg.height * scale);

    if (logoImg && showLogo) {
      const vp = placements[view.id] || {
        x: 10,
        y: 10,
        scale: 0.6,
        rotation: 0,
        flipH: false,
        flipV: false,
      };

      const vAreaW = (view.areaPercent.w / 100) * (productImg.width * scale);
      const vAreaH = (view.areaPercent.h / 100) * (productImg.height * scale);
      const vAreaX = dx + (view.areaPercent.x / 100) * (productImg.width * scale);
      const vAreaY = dy + (view.areaPercent.y / 100) * (productImg.height * scale);

      const logoScale = vp.scale;
      const logoW = vAreaW * logoScale;
      const logoH = logoW / (logoImg.width / logoImg.height);

      ctx.save();
      ctx.globalAlpha = logoOpacity / 100;
      ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;

      const editorRefSize = 800; // VIRTUAL_CANVAS_SIZE from editor
      const coordScaleX = vAreaW / ((view.areaPercent.w / 100) * editorRefSize);
      const coordScaleY = vAreaH / ((view.areaPercent.h / 100) * editorRefSize);

      ctx.translate(
        vAreaX + vp.x * coordScaleX + logoW / 2,
        vAreaY + vp.y * coordScaleY + logoH / 2,
      );

      ctx.rotate((vp.rotation * Math.PI) / 180);
      if (vp.flipH) ctx.scale(-1, 1);
      if (vp.flipV) ctx.scale(1, -1);

      if (shadowEnabled) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowIntensity / 100})`;
        ctx.shadowBlur = 15 * exportScale;
        ctx.shadowOffsetX = 4 * exportScale;
        ctx.shadowOffsetY = 4 * exportScale;
      }

      ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
      ctx.restore();
    }

    // Label
    ctx.fillStyle = "#111827";
    ctx.font = `bold ${28 * exportScale}px sans-serif`;
    ctx.fillText(view.label.toUpperCase(), ox + 40 * exportScale, oy + 60 * exportScale);

    if (options.approvedViews.has(view.id)) {
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(
        ox + size - 60 * exportScale,
        oy + 60 * exportScale,
        20 * exportScale,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${24 * exportScale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✓", ox + size - 60 * exportScale, oy + 62 * exportScale);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2 * exportScale;
    ctx.strokeRect(ox, oy, size, size);
  }

  if (watermarkOptions?.include) {
    ctx.save();
    const { opacity = 0.05, scale = 1, position = "center" } = watermarkOptions;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    const fontSize = 100 * exportScale * scale;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let wx = canvas.width / 2;
    let wy = canvas.height / 2;
    const angle = -Math.PI / 4;

    if (position === "top-left") {
      wx = canvas.width * 0.2;
      wy = canvas.height * 0.2;
    } else if (position === "top-right") {
      wx = canvas.width * 0.8;
      wy = canvas.height * 0.2;
    } else if (position === "bottom-left") {
      wx = canvas.width * 0.2;
      wy = canvas.height * 0.8;
    } else if (position === "bottom-right") {
      wx = canvas.width * 0.8;
      wy = canvas.height * 0.8;
    }

    ctx.translate(wx, wy);
    ctx.rotate(angle);
    ctx.fillText("PROMO BRINDES - APROVAÇÃO", 0, 0);
    ctx.restore();
  }

  return canvas;
}

export async function exportMockupImage(options: ExportOptions) {
  const canvas = await renderMultiViewCanvas(options);
  const { exportFormat, exportQuality, productSku } = options;
  const mimeType =
    exportFormat === "jpeg" ? "image/jpeg" : exportFormat === "webp" ? "image/webp" : "image/png";

  return new Promise<void>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mockup-${productSku || "design"}-${Date.now()}.${exportFormat}`;
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          canvas.width = 0;
          canvas.height = 0;
          resolve();
        }, 1000);
      },
      mimeType,
      exportFormat === "png" ? undefined : exportQuality,
    );
  });
}

export async function exportMockupPdf(
  options: ExportOptions & { colors: string[]; area: string; date: string; technique: string },
) {
  const canvas = await renderMultiViewCanvas(options);
  const dataUrl = canvas.toDataURL("image/png", 0.8);

  const pdf = generateApprovalPdf({
    productName: options.productName,
    technique: options.technique,
    dimensions: { width: options.viewAreaW, height: options.viewAreaH },
    colors: options.colors,
    area: options.area,
    date: options.date,
    mockupImageDataUrl: dataUrl,
  });

  pdf.save(`PROPOSTA_${options.productSku || "DESIGN"}_${Date.now()}.pdf`);
  canvas.width = 0;
  canvas.height = 0;
}
