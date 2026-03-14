/**
 * Canvas utilities for mockup composition
 */

/** Load image with CORS fallback (fetch → Blob URL) */
export async function loadImageWithFallback(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = async () => {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const img2 = new window.Image();
        img2.onload = () => resolve(img2);
        img2.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img2.src = url;
      } catch {
        reject(new Error(`Failed to load image: ${src}`));
      }
    };
    img.src = src;
  });
}

/** Convert cm to px at given DPI */
export function cmToPx(cm: number, dpi: number = 300): number {
  return Math.round((cm / 2.54) * dpi);
}

/** Convert px to cm at given DPI */
export function pxToCm(px: number, dpi: number = 300): number {
  return (px * 2.54) / dpi;
}

/** Detect product bounds from an image (transparent background) */
export async function detectProductBounds(
  img: HTMLImageElement
): Promise<{ x: number; y: number; width: number; height: number }> {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;

  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const alpha = data[(y * img.width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Process logo for laser technique (monochrome silhouette) */
export function processLogoForLaser(
  img: HTMLImageElement,
  color: string = "#000000"
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Parse hex color
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Count unique colors in an image (for Pantone mapping) */
export function countUniqueColors(img: HTMLImageElement, threshold: number = 30): string[] {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const colorMap = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    // Quantize to reduce noise
    const r = Math.round(data[i] / threshold) * threshold;
    const g = Math.round(data[i + 1] / threshold) * threshold;
    const b = Math.round(data[i + 2] / threshold) * threshold;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  // Sort by frequency, return top colors as hex
  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map(Number);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    });
}

/** Convert SVG/WebP to PNG via Canvas */
export async function convertToPng(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const img = await loadImageWithFallback(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

/** Compose logo onto product image at given position */
export function composeMockup(
  productImg: HTMLImageElement,
  logoCanvas: HTMLCanvasElement | HTMLImageElement,
  position: { x: number; y: number; width: number; height: number },
  outputWidth: number = 1200
): HTMLCanvasElement {
  const scale = outputWidth / productImg.width;
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = Math.round(productImg.height * scale);
  const ctx = canvas.getContext("2d")!;

  // Draw product
  ctx.drawImage(productImg, 0, 0, canvas.width, canvas.height);

  // Draw logo at position
  ctx.drawImage(
    logoCanvas,
    position.x * scale,
    position.y * scale,
    position.width * scale,
    position.height * scale
  );

  return canvas;
}
