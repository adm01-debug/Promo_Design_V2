import { describe, it, expect } from "vitest";
import {
  parseHex,
  hexToLab,
  deltaE76,
  scoreColors,
  scoreContrast,
  scorePlacement,
  scoreRules,
  computeBrandAdherenceScore,
  type AdherenceGuidelines,
  type AdherencePatterns,
} from "../brand-adherence";

const emptyGuidelines: AdherenceGuidelines = {
  primary_colors: [],
  secondary_colors: [],
  do_rules: [],
  dont_rules: [],
};

describe("parseHex", () => {
  it.each([
    ["#ffffff", [255, 255, 255]],
    ["#000", [0, 0, 0]],
    ["ff0000", [255, 0, 0]],
    ["#00FF00", [0, 255, 0]],
  ])("parses %s", (input, expected) => {
    expect(parseHex(input)).toEqual(expected);
  });

  it.each(["", "#12", "#12345", "zzzzzz", "#gggggg"])("rejects %s", (input) => {
    expect(parseHex(input)).toBeNull();
  });

  it("rejects non-string input", () => {
    // @ts-expect-error runtime guard
    expect(parseHex(null)).toBeNull();
    // @ts-expect-error runtime guard
    expect(parseHex(42)).toBeNull();
  });
});

describe("hexToLab & deltaE76", () => {
  it("returns L≈100 for pure white", () => {
    const lab = hexToLab("#ffffff")!;
    expect(lab[0]).toBeGreaterThan(99);
  });

  it("returns L≈0 for pure black", () => {
    const lab = hexToLab("#000000")!;
    expect(lab[0]).toBeLessThan(1);
  });

  it("deltaE for identical colors is 0", () => {
    expect(deltaE76("#3366ff", "#3366ff")).toBeCloseTo(0, 5);
  });

  it("deltaE for near-identical is small", () => {
    expect(deltaE76("#3366ff", "#3367ff")).toBeLessThan(5);
  });

  it("deltaE for opposite colors is huge", () => {
    expect(deltaE76("#000000", "#ffffff")).toBeGreaterThan(90);
  });

  it("deltaE returns Infinity for invalid inputs", () => {
    expect(deltaE76("nope", "#000")).toBe(Infinity);
    expect(deltaE76("#000", "nope")).toBe(Infinity);
  });
});

describe("scoreColors", () => {
  const gl: AdherenceGuidelines = {
    ...emptyGuidelines,
    primary_colors: [{ name: "Blue", hex: "#3366ff" }],
    secondary_colors: [{ name: "Gray", hex: "#808080" }],
  };

  it("returns 100 when dominant matches primary exactly", () => {
    expect(scoreColors(["#3366ff"], gl)).toBe(100);
  });

  it("returns near-100 for very close color", () => {
    expect(scoreColors(["#3367ff"], gl)).toBeGreaterThan(85);
  });

  it("returns 0 when far from palette", () => {
    // amarelo puro vs azul+cinza → deltaE muito grande
    expect(scoreColors(["#ffff00"], gl)).toBeLessThan(20);
  });

  it("returns 0 with empty palette", () => {
    expect(scoreColors(["#3366ff"], emptyGuidelines)).toBe(0);
  });

  it("returns 0 with empty dominant list", () => {
    expect(scoreColors([], gl)).toBe(0);
  });

  it("weights dominant colors: first color dominates", () => {
    // primeira cor combina, segunda não. Score deve ficar alto (>50).
    const s = scoreColors(["#3366ff", "#ffff00"], gl);
    expect(s).toBeGreaterThan(60);
  });

  it("ignores invalid hex silently", () => {
    expect(scoreColors(["nope", "#3366ff"], gl)).toBe(100);
  });
});

describe("scoreContrast", () => {
  it("returns 100 for AAA (>=7)", () => {
    expect(scoreContrast(7)).toBe(100);
    expect(scoreContrast(15)).toBe(100);
  });

  it("returns 70-100 for AA (4.5-7)", () => {
    expect(scoreContrast(4.5)).toBe(70);
    expect(scoreContrast(5.75)).toBeGreaterThanOrEqual(80);
  });

  it("returns 40-70 for large-text-only (3-4.5)", () => {
    expect(scoreContrast(3)).toBe(40);
    expect(scoreContrast(3.75)).toBeGreaterThan(50);
  });

  it("returns 0-40 for poor contrast", () => {
    expect(scoreContrast(1.5)).toBeLessThanOrEqual(20);
    expect(scoreContrast(1.1)).toBeLessThanOrEqual(10);
  });

  it("returns 0 for ratio<=1", () => {
    expect(scoreContrast(1)).toBe(0);
    expect(scoreContrast(0)).toBe(50); // treated as missing
    expect(scoreContrast(-1)).toBe(50);
  });

  it("returns 50 (neutral) when undefined", () => {
    expect(scoreContrast(undefined)).toBe(50);
  });
});

describe("scorePlacement", () => {
  const patterns: AdherencePatterns = {
    logo_x_percent_p50: 0.5,
    logo_y_percent_p50: 0.3,
    logo_scale_p50: 0.35,
  };

  it("100 when placement matches p50 exactly", () => {
    expect(
      scorePlacement({ x: 0.5, y: 0.3, scale: 0.35 }, patterns),
    ).toBe(100);
  });

  it("50 (neutral) when placement missing", () => {
    expect(scorePlacement(undefined, patterns)).toBe(50);
  });

  it("50 (neutral) when patterns missing", () => {
    expect(scorePlacement({ x: 0.5, y: 0.3, scale: 0.35 }, undefined)).toBe(50);
  });

  it("50 (neutral) when pattern fields null", () => {
    expect(
      scorePlacement(
        { x: 0.5, y: 0.3, scale: 0.35 },
        { logo_x_percent_p50: null, logo_y_percent_p50: null, logo_scale_p50: null },
      ),
    ).toBe(50);
  });

  it("degrades linearly with distance", () => {
    const near = scorePlacement({ x: 0.55, y: 0.35, scale: 0.35 }, patterns);
    const far = scorePlacement({ x: 0.9, y: 0.9, scale: 0.8 }, patterns);
    expect(near).toBeGreaterThan(far);
    expect(far).toBe(0);
  });
});

describe("scoreRules", () => {
  it("returns 50 (neutral) when no rules configured", () => {
    expect(scoreRules({ dominantColors: [], surfaceType: "tshirt" }, emptyGuidelines)).toBe(50);
  });

  it("returns 50 when rules exist but no descriptors on art", () => {
    const gl: AdherenceGuidelines = { ...emptyGuidelines, do_rules: ["usar em tshirt"] };
    expect(scoreRules({ dominantColors: [] }, gl)).toBe(50);
  });

  it("rewards do_rule matches", () => {
    const gl: AdherenceGuidelines = { ...emptyGuidelines, do_rules: ["usar em tshirt escura"] };
    const s = scoreRules({ dominantColors: [], surfaceType: "tshirt" }, gl);
    expect(s).toBeGreaterThan(60);
  });

  it("penalizes dont_rule violations", () => {
    const gl: AdherenceGuidelines = {
      ...emptyGuidelines,
      dont_rules: ["nunca usar multiply em fundo escuro"],
    };
    const violation = scoreRules(
      { dominantColors: [], blendMode: "multiply", descriptors: ["fundo"] },
      gl,
    );
    const clean = scoreRules({ dominantColors: [], blendMode: "normal" }, gl);
    expect(violation).toBeLessThan(clean);
  });

  it("handles accented rules (NFD normalization)", () => {
    const gl: AdherenceGuidelines = { ...emptyGuidelines, do_rules: ["usar em camiseta"] };
    const s = scoreRules({ dominantColors: [], descriptors: ["camiseta"] }, gl);
    expect(s).toBeGreaterThan(50);
  });
});

describe("computeBrandAdherenceScore — integração", () => {
  const gl: AdherenceGuidelines = {
    primary_colors: [{ name: "Blue", hex: "#3366ff" }],
    secondary_colors: [{ name: "Gray", hex: "#808080" }],
    do_rules: ["usar em tshirt"],
    dont_rules: ["evitar multiply escuro"],
  };
  const patterns: AdherencePatterns = {
    logo_x_percent_p50: 0.5,
    logo_y_percent_p50: 0.3,
    logo_scale_p50: 0.35,
  };

  it("art perfeita → score alto (>=85)", () => {
    const result = computeBrandAdherenceScore(
      {
        dominantColors: ["#3366ff", "#808080"],
        placement: { x: 0.5, y: 0.3, scale: 0.35 },
        contrastRatio: 8,
        surfaceType: "tshirt",
        blendMode: "normal",
      },
      gl,
      patterns,
    );
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.breakdown.colors).toBe(100);
    expect(result.breakdown.contrast).toBe(100);
    expect(result.breakdown.placement).toBe(100);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("art catastrófica → score baixo (<40)", () => {
    const result = computeBrandAdherenceScore(
      {
        dominantColors: ["#ffff00"],
        placement: { x: 0.95, y: 0.95, scale: 0.9 },
        contrastRatio: 1.3,
      },
      gl,
      patterns,
    );
    expect(result.score).toBeLessThan(40);
  });

  it("score é sempre 0-100 clampado", () => {
    const result = computeBrandAdherenceScore({ dominantColors: [] }, emptyGuidelines);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("breakdown fields são 0-100", () => {
    const result = computeBrandAdherenceScore(
      { dominantColors: ["#3366ff"], contrastRatio: 5 },
      gl,
    );
    Object.values(result.breakdown).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it("produz notas explicáveis quando cores destoam", () => {
    const result = computeBrandAdherenceScore(
      { dominantColors: ["#ffff00"] },
      gl,
    );
    expect(result.notes.some((n) => n.includes("destoam"))).toBe(true);
  });
});
