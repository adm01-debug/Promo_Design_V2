import { useCallback } from "react";

const PDF_PAGE_MEMORY_KEY = "dam:upload:pdf-thumb-pages";
const PDF_PAGE_MEMORY_LIMIT = 200;

type PdfMemoryEntry = number | number[];

function pdfFingerprint(f: File): string {
  return `${f.name}::${f.size}::${f.lastModified}`;
}

function readPdfPageMemory(): Record<string, PdfMemoryEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PDF_PAGE_MEMORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, PdfMemoryEntry>) : {};
  } catch {
    return {};
  }
}

export function usePdfPageMemory() {
  const getRememberedPdfPages = useCallback((f: File): number[] | null => {
    const map = readPdfPageMemory();
    const v = map[pdfFingerprint(f)];
    if (Array.isArray(v)) {
      const cleaned = v.filter((n) => typeof n === "number" && n >= 1).map((n) => Math.floor(n));
      return cleaned.length ? cleaned : null;
    }
    if (typeof v === "number" && v >= 1) return [Math.floor(v)];
    return null;
  }, []);

  const rememberPdfPages = useCallback((f: File, pages: number[]) => {
    if (typeof window === "undefined") return;
    const safe = pages.filter((p) => typeof p === "number" && p >= 1).map((p) => Math.floor(p));
    if (safe.length === 0) return;
    try {
      const map = readPdfPageMemory();
      map[pdfFingerprint(f)] = safe.length === 1 ? safe[0] : safe;
      const keys = Object.keys(map);
      if (keys.length > PDF_PAGE_MEMORY_LIMIT) {
        for (const k of keys.slice(0, keys.length - PDF_PAGE_MEMORY_LIMIT)) {
          delete map[k];
        }
      }
      localStorage.setItem(PDF_PAGE_MEMORY_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }, []);

  return { getRememberedPdfPages, rememberPdfPages };
}
