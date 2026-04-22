import { describe, it, expect } from "vitest";
import { buildPaletteRows, paletteToCsv, paletteToJson } from "../palette-export";

const primary = [
  { name: "Marca", hex: "#3b82f6" },
  { name: 'Com "aspas", vírgula', hex: "#000000" },
];
const secondary = [{ name: "", hex: "#ffffff" }];

describe("palette-export", () => {
  it("buildPaletteRows preenche grupo, hex maiúsculo e níveis WCAG", () => {
    const rows = buildPaletteRows(primary, secondary);
    expect(rows).toHaveLength(3);
    expect(rows[0].group).toBe("primary");
    expect(rows[0].hex).toBe("#3B82F6");
    expect(rows[0].wcag_vs_white).toMatch(/^(AAA|AA|FAIL)$/);
    expect(rows[2].group).toBe("secondary");
    expect(rows[1].hex).toBe("#000000");
    expect(rows[1].wcag_vs_white).toBe("AAA");
  });

  it("paletteToCsv escapa aspas e vírgulas", () => {
    const rows = buildPaletteRows(primary, secondary);
    const csv = paletteToCsv(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("group,name,hex,wcag_vs_white,ratio_vs_white,wcag_vs_black,ratio_vs_black");
    expect(lines[2]).toContain('"Com ""aspas"", vírgula"');
    expect(lines).toHaveLength(4);
  });

  it("paletteToJson produz JSON válido com todas as colunas", () => {
    const rows = buildPaletteRows(primary, secondary);
    const parsed = JSON.parse(paletteToJson(rows));
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toHaveProperty("ratio_vs_white");
    expect(parsed[0]).toHaveProperty("wcag_vs_black");
  });
});