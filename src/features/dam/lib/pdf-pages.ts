/**
 * Helpers for parsing / formatting PDF page selections used by the
 * batch upload flow.
 *
 * Input is a free-form string like "1, 3, 5-7" entered by the user.
 * Output is a deduplicated, sorted list of 1-indexed page numbers.
 * The first entry of a selection is treated as the PRIMARY thumb;
 * the remaining ones produce additional asset copies on upload.
 *
 * Selection order is preserved EXCEPT when produced from a string:
 * the string parser sorts ascending so the input is canonical. UI
 * checkbox toggling preserves click order, with the first click
 * becoming the primary page.
 */

export const MAX_PDF_PAGES_PER_ASSET = 20;

export interface ParsedPages {
  pages: number[];
  error: string | null;
}

/**
 * Parse a "1, 3, 5-7" style string into a list of unique page numbers.
 * Returns an inline error message if any token is malformed or out of range.
 */
export function parsePagesString(raw: string, totalPages?: number): ParsedPages {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { pages: [], error: null };
  const tokens = trimmed.split(/[,;\s]+/).filter(Boolean);
  const set = new Set<number>();
  for (const tok of tokens) {
    const range = tok.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) {
        return { pages: [], error: `Intervalo inválido: "${tok}"` };
      }
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (totalPages && hi > totalPages) {
        return { pages: [], error: `Página ${hi} fora do intervalo (1–${totalPages})` };
      }
      for (let i = lo; i <= hi; i++) set.add(i);
    } else if (/^\d+$/.test(tok)) {
      const n = Number(tok);
      if (n < 1) return { pages: [], error: `Página inválida: "${tok}"` };
      if (totalPages && n > totalPages) {
        return { pages: [], error: `Página ${n} fora do intervalo (1–${totalPages})` };
      }
      set.add(n);
    } else {
      return { pages: [], error: `Token inválido: "${tok}"` };
    }
  }
  const pages = [...set].sort((a, b) => a - b);
  if (pages.length > MAX_PDF_PAGES_PER_ASSET) {
    return {
      pages: [],
      error: `Máximo de ${MAX_PDF_PAGES_PER_ASSET} páginas por PDF (selecionadas: ${pages.length})`,
    };
  }
  return { pages, error: null };
}

/** Format a page list back into a compact "1, 3, 5-7" string. */
export function formatPagesString(pages: number[]): string {
  if (!pages.length) return "";
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    groups.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  groups.push(start === prev ? `${start}` : `${start}-${prev}`);
  return groups.join(", ");
}

/** Clamp a list of pages to [1, totalPages] and remove duplicates. */
export function clampPages(pages: number[], totalPages: number | null | undefined): number[] {
  if (!pages.length) return [];
  if (!totalPages) return [...new Set(pages.filter((p) => p >= 1))];
  return [...new Set(pages.map((p) => Math.min(Math.max(1, Math.floor(p)), totalPages)))];
}
