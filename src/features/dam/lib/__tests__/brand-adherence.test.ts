import { describe, it, expect } from "vitest";
import {
  computeBrandAdherenceScore,
  scoreColors,
  scoreContrast,
  scorePlacement,
  scoreRules,
  deltaE76,
  parseHex,
  type AdherenceGuidelines,
} from "../brand-adherence";

const guidelines: AdherenceGuidelines = {
  primary_colors: [{ hex: "#0066ff", name: "Azul" }],
  secondary_colors: [{ hex: "#ffffff", name: "Branco" }],
  do_rules: ["Use fundo claro para o logo"],
  dont_rules: ["Nunca aplique o logo sobre gradientes saturados"],
};

describe("brand-adherence utils", () => {
  it("parseHex aceita #rgb e #rrggbb e rejeita inválidos", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("#0066ff")).toEqual([0, 102, 255]);
    expect(parseHex("nope")).toBeNull();
  });

  it("deltaE76 = 0 para cores idênticas e > 0 para diferentes", () => {
    expect(deltaE76("#0066ff", "#0066ff")).toBe(0);
    expect(deltaE76("#0066ff", "#ff0000")).toBeGreaterThan(30);
  });

  it("scoreColors dá 100 quando a dominante bate com a paleta", () => {
    expect(scoreColors(["#0066ff"], guidelines)).toBe(100);
  });

  it("scoreColors dá 0 quando dominante muito distante", () => {
    expect(
      scoreColors(["#00ff00"], {
        ...guidelines,
        primary_colors: [{ hex: "#ff00ff", name: "" }],
        secondary_colors: [],
      }),
    ).toBeLessThan(30);
  });

  it("scoreContrast mapeia WCAG corretamente", () => {
    expect(scoreContrast(undefined)).toBe(50);
    expect(scoreContrast(7)).toBe(100);
    expect(scoreContrast(4.5)).toBeGreaterThanOrEqual(70);
    expect(scoreContrast(1)).toBe(0);
  });

  it("scorePlacement é neutro sem dados e alto quando bate com percentil", () => {
    expect(
      scorePlacement(undefined, {
        logo_x_percent_p50: 50,
        logo_y_percent_p50: 50,
        logo_scale_p50: 0.5,
      }),
    ).toBe(50);
    const perfect = scorePlacement(
      { x: 0.5, y: 0.5, scale: 0.5 },
      { logo_x_percent_p50: 0.5, logo_y_percent_p50: 0.5, logo_scale_p50: 0.5 },
    );
    expect(perfect).toBe(100);
  });

  it("scoreRules retorna neutro sem descriptors", () => {
    expect(scoreRules({ dominantColors: [] }, guidelines)).toBe(50);
  });
});

describe("computeBrandAdherenceScore", () => {
  it("retorna score entre 0 e 100", () => {
    const r = computeBrandAdherenceScore(
      {
        dominantColors: ["#0066ff", "#ffffff"],
        placement: { x: 0.5, y: 0.5, scale: 0.5 },
        contrastRatio: 7,
        surfaceType: "tshirt",
        blendMode: "multiply",
        descriptors: ["fundo claro"],
      },
      guidelines,
      { logo_x_percent_p50: 0.5, logo_y_percent_p50: 0.5, logo_scale_p50: 0.5 },
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.breakdown.colors).toBe(100);
    expect(r.breakdown.contrast).toBe(100);
    expect(r.breakdown.placement).toBe(100);
  });

  it("penaliza cores destoantes e placement distante", () => {
    const r = computeBrandAdherenceScore(
      { dominantColors: ["#00ff00"], placement: { x: 0.9, y: 0.9, scale: 0.9 } },
      { ...guidelines, primary_colors: [{ hex: "#0066ff", name: "" }], secondary_colors: [] },
      { logo_x_percent_p50: 0.1, logo_y_percent_p50: 0.1, logo_scale_p50: 0.1 },
    );
    expect(r.breakdown.colors).toBeLessThan(50);
    expect(r.breakdown.placement).toBe(0);
  });

  it("produz notas explicativas", () => {
    const r = computeBrandAdherenceScore(
      { dominantColors: ["#0066ff"], contrastRatio: 7 },
      guidelines,
    );
    expect(r.notes.length).toBeGreaterThan(0);
  });
});
