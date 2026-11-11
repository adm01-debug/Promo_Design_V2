/**
 * Brand adherence score — client-side pure utility.
 *
 * Given an art's observable attributes and a client's brand guidelines
 * (optionally enriched with learned design patterns), returns a 0–100 score
 * with a weighted breakdown.
 *
 * Weights (from ADR — plan Fase 3):
 *   - Colors:    40%  (paleta dominante vs primary/secondary via ΔE CIE76 em Lab)
 *   - Contrast:  20%  (WCAG relative luminance ratio de logo sobre fundo)
 *   - Placement: 20%  (distância euclidiana ao percentil 50 do padrão do cliente)
 *   - Rules:     20%  (match textual em do_rules / mismatch em dont_rules)
 *
 * Todas as funções são puras, sem I/O e sem dependências externas.
 */

import type { ColorEntry } from "@/features/dam/hooks/use-brand-guidelines";

// ---------- Public types ----------

export interface AdherenceArt {
  /** Cores dominantes extraídas do output (hex `#rrggbb`). */
  dominantColors: string[];
  /** Placement do logo relativo à superfície (0–1). Opcional. */
  placement?: { x: number; y: number; scale: number };
  /** Razão de contraste WCAG (logo vs fundo). Opcional. */
  contrastRatio?: number;
  /** Superfície detectada (ex.: 'tshirt', 'mug'). Opcional. */
  surfaceType?: string;
  /** Blend mode aplicado. Opcional. */
  blendMode?: string;
  /** Descrição/tags livres para checagem de regras. Opcional. */
  descriptors?: string[];
}

export interface AdherenceGuidelines {
  primary_colors: ColorEntry[];
  secondary_colors: ColorEntry[];
  do_rules: string[];
  dont_rules: string[];
}

export interface AdherencePatterns {
  logo_x_percent_p50?: number | null;
  logo_y_percent_p50?: number | null;
  logo_scale_p50?: number | null;
  preferred_blend_modes?: Record<string, number> | null;
  preferred_surface_types?: Record<string, number> | null;
}

export interface AdherenceBreakdown {
  colors: number; // 0–100
  contrast: number; // 0–100
  placement: number; // 0–100
  rules: number; // 0–100
}

export interface AdherenceResult {
  /** Score 0–100 (arredondado). */
  score: number;
  breakdown: AdherenceBreakdown;
  /** Notas por dimensão para explicabilidade na UI. */
  notes: string[];
}

// ---------- Weights ----------

export const ADHERENCE_WEIGHTS = {
  colors: 0.4,
  contrast: 0.2,
  placement: 0.2,
  rules: 0.2,
} as const;

// ---------- Color utils ----------

/** Normaliza `#rgb` ou `#rrggbb` → `[r,g,b]` em 0–255. Retorna null se inválido. */
export function parseHex(hex: string): [number, number, number] | null {
  if (typeof hex !== "string") return null;
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  return null;
}

function srgbToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgbToXyz([r, g, b]: [number, number, number]): [number, number, number] {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // sRGB D65
  return [
    R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    R * 0.2126729 + G * 0.7151522 + B * 0.072175,
    R * 0.0193339 + G * 0.119192 + B * 0.9503041,
  ];
}

function xyzToLab([x, y, z]: [number, number, number]): [number, number, number] {
  // D65 reference white
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): [number, number, number] | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return xyzToLab(rgbToXyz(rgb));
}

/** ΔE CIE76 entre dois hex. Retorna Infinity se algum for inválido. */
export function deltaE76(hexA: string, hexB: string): number {
  const a = hexToLab(hexA);
  const b = hexToLab(hexB);
  if (!a || !b) return Infinity;
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

// Threshold "cor idêntica ou muito próxima": ΔE < 10 é praticamente indistinguível.
// ΔE > 50 é uma cor claramente diferente. Interpolamos linearmente entre esses limites.
const DELTA_MIN = 5;
const DELTA_MAX = 50;

function colorMatchScore(dominant: string, palette: string[]): number {
  if (palette.length === 0) return 0;
  const best = palette.reduce((acc, p) => Math.min(acc, deltaE76(dominant, p)), Infinity);
  if (!Number.isFinite(best)) return 0;
  if (best <= DELTA_MIN) return 100;
  if (best >= DELTA_MAX) return 0;
  return Math.round(((DELTA_MAX - best) / (DELTA_MAX - DELTA_MIN)) * 100);
}

/** Score de cores 0–100. Peso maior para tons dominantes iniciais. */
export function scoreColors(dominant: string[], guidelines: AdherenceGuidelines): number {
  const palette = [
    ...guidelines.primary_colors.map((c) => c.hex),
    ...guidelines.secondary_colors.map((c) => c.hex),
  ].filter((h) => parseHex(h) !== null);

  const validDominant = dominant.filter((h) => parseHex(h) !== null);
  if (palette.length === 0 || validDominant.length === 0) return 0;

  // Pondera as 5 primeiras cores (mais representativas) com pesos decrescentes.
  const sample = validDominant.slice(0, 5);
  const weights = sample.map((_, i) => 1 / (i + 1)); // 1, 0.5, 0.33, 0.25, 0.2
  const totalW = weights.reduce((s, w) => s + w, 0);
  const weighted = sample.reduce((acc, c, i) => acc + colorMatchScore(c, palette) * weights[i], 0);
  return Math.round(weighted / totalW);
}

// ---------- Contrast (WCAG) ----------

/** Score de contraste 0–100 mapeando WCAG ratio (1–21). AA=4.5 → 70, AAA=7 → 100. */
export function scoreContrast(ratio: number | undefined): number {
  if (ratio === undefined || !Number.isFinite(ratio) || ratio <= 0) return 50; // neutro
  if (ratio >= 7) return 100;
  if (ratio >= 4.5) return 70 + Math.round(((ratio - 4.5) / (7 - 4.5)) * 30);
  if (ratio >= 3) return 40 + Math.round(((ratio - 3) / (4.5 - 3)) * 30);
  if (ratio >= 1.5) return Math.round(((ratio - 1) / (3 - 1)) * 40);
  return 0;
}

// ---------- Placement ----------

/** Score de placement 0–100 baseado em distância aos percentis do cliente. */
export function scorePlacement(
  placement: AdherenceArt["placement"],
  patterns: AdherencePatterns | undefined,
): number {
  if (!placement) return 50; // neutro quando não há dado
  if (!patterns) return 50;
  const { logo_x_percent_p50, logo_y_percent_p50, logo_scale_p50 } = patterns;
  if (logo_x_percent_p50 == null || logo_y_percent_p50 == null || logo_scale_p50 == null) {
    return 50;
  }
  const dx = placement.x - logo_x_percent_p50;
  const dy = placement.y - logo_y_percent_p50;
  const dScale = placement.scale - logo_scale_p50;
  // Distância normalizada em espaço [0,1]. Peso 2x para escala (mais visível).
  const dist = Math.sqrt(dx * dx + dy * dy + dScale * 2 * (dScale * 2));
  // dist=0 → 100; dist>=0.6 → 0. Linear entre esses limites.
  if (dist >= 0.6) return 0;
  return Math.round((1 - dist / 0.6) * 100);
}

// ---------- Rules ----------

function normalizeRule(rule: string): string {
  return rule
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ruleMatches(rule: string, haystack: string[]): boolean {
  const nRule = normalizeRule(rule);
  const tokens = nRule.split(/\s+/).filter((t) => t.length > 3);
  if (tokens.length === 0) return false;
  return tokens.some((t) => haystack.some((h) => h.includes(t)));
}

export function scoreRules(art: AdherenceArt, guidelines: AdherenceGuidelines): number {
  const haystack = [art.surfaceType ?? "", art.blendMode ?? "", ...(art.descriptors ?? [])]
    .map(normalizeRule)
    .filter((s) => s.length > 0);

  const dos = guidelines.do_rules.filter((r) => r.trim().length > 0);
  const donts = guidelines.dont_rules.filter((r) => r.trim().length > 0);

  if (dos.length === 0 && donts.length === 0) return 50; // neutro
  if (haystack.length === 0) return 50; // sem descriptors — não penaliza

  let hits = 0;
  for (const r of dos) {
    if (ruleMatches(r, haystack)) hits += 1;
  }
  let violations = 0;
  for (const r of donts) {
    if (ruleMatches(r, haystack)) violations += 1;
  }

  const doScore = dos.length > 0 ? (hits / dos.length) * 100 : 50;
  const dontPenalty = donts.length > 0 ? (violations / donts.length) * 100 : 0;
  // Cada categoria contribui metade; violações pesam o dobro (dedução direta).
  return Math.max(0, Math.min(100, Math.round(doScore * 0.6 + (50 - dontPenalty * 0.5) * 0.8)));
}

// ---------- Compose ----------

export function computeBrandAdherenceScore(
  art: AdherenceArt,
  guidelines: AdherenceGuidelines,
  patterns?: AdherencePatterns,
): AdherenceResult {
  const colors = scoreColors(art.dominantColors, guidelines);
  const contrast = scoreContrast(art.contrastRatio);
  const placement = scorePlacement(art.placement, patterns);
  const rules = scoreRules(art, guidelines);

  const score = Math.round(
    colors * ADHERENCE_WEIGHTS.colors +
      contrast * ADHERENCE_WEIGHTS.contrast +
      placement * ADHERENCE_WEIGHTS.placement +
      rules * ADHERENCE_WEIGHTS.rules,
  );

  const notes: string[] = [];
  if (colors >= 80) notes.push("Paleta alinhada às cores da marca.");
  else if (colors < 40) notes.push("Cores dominantes destoam da paleta cadastrada.");
  if (art.contrastRatio !== undefined) {
    if (contrast >= 80) notes.push("Contraste WCAG excelente.");
    else if (contrast < 40) notes.push("Contraste WCAG abaixo do recomendado (AA).");
  }
  if (patterns && art.placement && placement < 40) {
    notes.push("Placement do logo distante do padrão histórico do cliente.");
  }
  if (rules < 40) notes.push("Regras do/don't da marca não estão sendo respeitadas.");

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: { colors, contrast, placement, rules },
    notes,
  };
}
