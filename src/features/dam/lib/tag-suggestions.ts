import type { AssetType } from "../hooks/use-assets";

const normalizeTag = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, " ");
const TAG_REGEX = /^[a-z0-9\-_ ]{1,30}$/;

const STOPWORDS = new Set<string>([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "ou",
  "para",
  "com",
  "sem",
  "em",
  "um",
  "uma",
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "for",
  "with",
  "to",
  "in",
  "final",
  "v1",
  "v2",
  "v3",
  "rev",
  "copy",
  "copia",
  "cópia",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "pdf",
  "ai",
  "psd",
  "tif",
  "tiff",
]);

export function tagsFromFileName(name: string): string[] {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .split(/[\s_\-.()[\]{},]+/g)
    .map((t) => normalizeTag(t))
    .filter(
      (t) =>
        t.length >= 3 &&
        t.length <= 30 &&
        !STOPWORDS.has(t) &&
        TAG_REGEX.test(t) &&
        !/^\d+$/.test(t),
    );
}

export function buildAutoSuggestions(
  entries: { file: File }[],
  assetType: AssetType,
  currentTags: string[],
): string[] {
  const current = new Set(currentTags.map(normalizeTag));
  const seen = new Set<string>();
  const out: string[] = [];

  if (!current.has(assetType)) {
    out.push(assetType);
    seen.add(assetType);
  }

  for (const e of entries) {
    for (const t of tagsFromFileName(e.file.name)) {
      if (current.has(t) || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= 12) return out;
    }
  }
  return out;
}
