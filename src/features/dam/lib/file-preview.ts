/**
 * Shared utilities to generate client-side previews and rasterized thumbnails
 * for non-image files (SVG, PDF) used by the upload dialog and useAssetUpload.
 */

export type FileKind = "image" | "svg" | "pdf" | "ai" | "psd" | "other";

export function detectFileKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/svg+xml" || name.endsWith(".svg")) return "svg";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".ai")) return "ai";
  if (name.endsWith(".psd")) return "psd";
  if (mime.startsWith("image/")) return "image";
  return "other";
}

/** Build a blob URL displaying the SVG file as-is (vector preview). */
export async function buildSvgPreviewUrl(file: File): Promise<string> {
  const text = await file.text();
  const blob = new Blob([text], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}

/** Lazy-load pdfjs and configure the worker exactly once. */
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export interface RasterResult {
  /** JPEG/PNG blob suitable for upload as thumbnail. */
  blob: Blob | null;
  /** Object URL for in-memory preview. Caller is responsible for revoking. */
  url: string | null;
  width: number;
  height: number;
  canvas: HTMLCanvasElement | null;
}

/**
 * Render the first page of a PDF into an off-screen canvas.
 * targetWidth controls the rasterization scale. Returns null on any failure.
 */
export async function rasterizePdfFirstPage(
  file: File,
  targetWidth = 512,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.85,
  pageNumber = 1,
): Promise<RasterResult | null> {
  try {
    const pdfjs = await loadPdfjs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const safePage = Math.min(Math.max(1, Math.floor(pageNumber)), doc.numPages);
    const page = await doc.getPage(safePage);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, quality),
    );
    return {
      blob,
      url: blob ? URL.createObjectURL(blob) : null,
      width: Math.round(baseViewport.width),
      height: Math.round(baseViewport.height),
      canvas,
    };
  } catch {
    return null;
  }
}

/** Returns the number of pages in a PDF file, or null on failure. */
export async function getPdfPageCount(file: File): Promise<number | null> {
  try {
    const pdfjs = await loadPdfjs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    return doc.numPages;
  } catch {
    return null;
  }
}

/**
 * Rasterize an SVG file by drawing it onto a canvas. Used to generate a
 * JPEG thumbnail and capture intrinsic dimensions for storage.
 */
export async function rasterizeSvg(
  file: File,
  targetMax = 256,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.85,
): Promise<RasterResult | null> {
  const text = await file.text();
  const svgBlob = new Blob([text], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const result = await new Promise<RasterResult | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || targetMax;
        const h = img.naturalHeight || targetMax;
        const ratio = Math.min(targetMax / w, targetMax / h, 1);
        const tw = Math.max(1, Math.round(w * ratio));
        const th = Math.max(1, Math.round(h * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        // White background so transparent SVGs read on light/dark surfaces alike
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tw, th);
        ctx.drawImage(img, 0, 0, tw, th);
        canvas.toBlob(
          (blob) =>
            resolve({
              blob,
              url: blob ? URL.createObjectURL(blob) : null,
              width: w,
              height: h,
              canvas,
            }),
          mime,
          quality,
        );
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Extract up to 3 dominant colors from a rendered canvas (#rrggbb). */
export function extractDominantColors(canvas: HTMLCanvasElement): string[] {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const buckets = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4 * 4) {
      const a = data[i + 3];
      if (a < 128) continue;
      const r = data[i] & 0xf0;
      const g = data[i + 1] & 0xf0;
      const b = data[i + 2] & 0xf0;
      const key = `${r},${g},${b}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => {
        const [r, g, b] = k.split(",").map(Number);
        return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
      });
  } catch {
    return [];
  }
}
