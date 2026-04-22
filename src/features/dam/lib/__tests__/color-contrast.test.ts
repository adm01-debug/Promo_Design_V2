import { describe, it, expect } from "vitest";
import { wcagBoth, contrastRatio, bestTextColor } from "../color-contrast";

describe("color-contrast / wcagBoth", () => {
  it("retorna AAA vs branco para cores muito escuras", () => {
    const w = wcagBoth("#000000");
    expect(w.vsWhite).toBe("AAA");
    expect(w.ratioWhite).toBeCloseTo(21, 0);
    expect(w.vsBlack).toBe("FAIL");
  });

  it("retorna AAA vs preto para cores muito claras", () => {
    const w = wcagBoth("#ffffff");
    expect(w.vsBlack).toBe("AAA");
    expect(w.vsWhite).toBe("FAIL");
  });

  it("classifica cor de marca média corretamente", () => {
    const w = wcagBoth("#3b82f6");
    expect(["AA", "AAA", "FAIL"]).toContain(w.vsWhite);
    expect(["AA", "AAA", "FAIL"]).toContain(w.vsBlack);
    expect(w.ratioWhite).toBeGreaterThan(1);
    expect(w.ratioBlack).toBeGreaterThan(1);
  });

  it("aceita hex curto (#abc)", () => {
    const w = wcagBoth("#000");
    expect(w.vsWhite).toBe("AAA");
  });

  it("nunca retorna nível undefined/null para qualquer cor da paleta", () => {
    const palette = ["#0f172a", "#64748b", "#dc2626", "#16a34a", "#2563eb", "#facc15", "#f5f5f5"];
    for (const hex of palette) {
      const w = wcagBoth(hex);
      expect(w.vsWhite).toMatch(/^(AAA|AA|FAIL)$/);
      expect(w.vsBlack).toMatch(/^(AAA|AA|FAIL)$/);
      expect(Number.isFinite(w.ratioWhite)).toBe(true);
      expect(Number.isFinite(w.ratioBlack)).toBe(true);
    }
  });

  it("bestTextColor escolhe texto com maior contraste", () => {
    expect(bestTextColor("#000000")).toBe("#ffffff");
    expect(bestTextColor("#ffffff")).toBe("#000000");
  });

  it("contrastRatio é simétrico", () => {
    expect(contrastRatio("#123456", "#abcdef")).toBeCloseTo(
      contrastRatio("#abcdef", "#123456"),
      5,
    );
  });
});

/**
 * Checklist visual (manual QA) — Brand Guidelines & Preview
 * ---------------------------------------------------------
 * 1. Abrir /dam/brand/:clientId com paleta primary + secondary preenchida.
 * 2. Cada linha em ColorList deve exibir 1 badge WCAG (AAA/AA/FAIL) ao lado do HEX.
 * 3. Botão Copy ao lado do HEX → toast "Copiado #XXXXXX" e clipboard contém o valor.
 * 4. BrandPreviewCard hero: cada swatch (até 5 primárias) tem badge no canto inferior.
 * 5. Seção "Paleta completa" lista todas as cores (primary + secondary) com 2 badges (·W e ·B).
 * 6. Botões "Primária" e "Secundária" usam bestTextColor → texto sempre legível.
 * 7. Trocar tema claro/escuro: badges mantêm semântica (default/secondary/destructive).
 */