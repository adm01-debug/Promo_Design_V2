function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").trim();
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const norm = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

export function contrastRatio(hex1: string, hex2: string): number {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return 1;
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "FAIL";

export function wcagLevel(hex: string, against: string = "#ffffff"): WcagLevel {
  const ratio = contrastRatio(hex, against);
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "FAIL";
}

export function bestTextColor(bgHex: string): "#ffffff" | "#000000" {
  return contrastRatio(bgHex, "#ffffff") >= contrastRatio(bgHex, "#000000") ? "#ffffff" : "#000000";
}

export interface WcagBoth {
  vsWhite: WcagLevel;
  vsBlack: WcagLevel;
  ratioWhite: number;
  ratioBlack: number;
}

export function wcagBoth(hex: string): WcagBoth {
  const ratioWhite = contrastRatio(hex, "#ffffff");
  const ratioBlack = contrastRatio(hex, "#000000");
  const level = (r: number): WcagLevel => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : "FAIL");
  return {
    vsWhite: level(ratioWhite),
    vsBlack: level(ratioBlack),
    ratioWhite,
    ratioBlack,
  };
}

const FULL_HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const SHORT_HEX_RE = /^#[0-9A-Fa-f]{3}$/;

export function isValidHex(value: string): boolean {
  return FULL_HEX_RE.test(value);
}

/** Normaliza um HEX: garante prefixo #, expande shorthand (#abc → #AABBCC) e converte para maiúsculo. */
export function normalizeHex(raw: string): string {
  let v = (raw ?? "").trim().toUpperCase();
  if (!v) return "";
  if (!v.startsWith("#")) v = `#${v}`;
  if (SHORT_HEX_RE.test(v)) {
    v = `#${v.slice(1).split("").map((c) => c + c).join("")}`;
  }
  return v;
}