import { wcagBoth } from "./color-contrast";
import type { ColorEntry } from "../hooks/use-brand-guidelines";

export interface PaletteExportRow {
  group: "primary" | "secondary";
  name: string;
  hex: string;
  wcag_vs_white: "AAA" | "AA" | "FAIL";
  ratio_vs_white: number;
  wcag_vs_black: "AAA" | "AA" | "FAIL";
  ratio_vs_black: number;
}

export function buildPaletteRows(
  primary: ColorEntry[],
  secondary: ColorEntry[],
): PaletteExportRow[] {
  const map = (group: "primary" | "secondary") => (c: ColorEntry): PaletteExportRow => {
    const w = wcagBoth(c.hex);
    return {
      group,
      name: c.name || "",
      hex: c.hex.toUpperCase(),
      wcag_vs_white: w.vsWhite,
      ratio_vs_white: Number(w.ratioWhite.toFixed(2)),
      wcag_vs_black: w.vsBlack,
      ratio_vs_black: Number(w.ratioBlack.toFixed(2)),
    };
  };
  return [...primary.map(map("primary")), ...secondary.map(map("secondary"))];
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function paletteToCsv(rows: PaletteExportRow[]): string {
  const headers = [
    "group",
    "name",
    "hex",
    "wcag_vs_white",
    "ratio_vs_white",
    "wcag_vs_black",
    "ratio_vs_black",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.group,
        escapeCsv(r.name),
        r.hex,
        r.wcag_vs_white,
        r.ratio_vs_white.toString(),
        r.wcag_vs_black,
        r.ratio_vs_black.toString(),
      ].join(","),
    );
  }
  return lines.join("\n");
}

export function paletteToJson(rows: PaletteExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}