import { describe, it, expect } from "vitest";
import {
  cmToPx,
  pxToCm,
  detectSurfaceType,
  calculateAutoFit,
  PERSPECTIVE_PRESETS,
} from "@/features/mockup";
import type { SurfaceType } from "@/features/mockup";

// ============================================================
// cmToPx / pxToCm conversion
// ============================================================
describe("cmToPx", () => {
  it("converts 1cm at 300dpi correctly", () => {
    expect(cmToPx(1, 300)).toBe(118);
  });

  it("converts 2.54cm to 1 inch (300dpi = 300px)", () => {
    expect(cmToPx(2.54, 300)).toBe(300);
  });

  it("converts 0cm to 0px", () => {
    expect(cmToPx(0, 300)).toBe(0);
  });

  it("uses default 300 DPI", () => {
    expect(cmToPx(2.54)).toBe(300);
  });

  it("handles 72 DPI", () => {
    expect(cmToPx(2.54, 72)).toBe(72);
  });

  it("handles large values", () => {
    expect(cmToPx(100, 300)).toBe(11811);
  });

  it("handles fractional cm", () => {
    expect(cmToPx(0.5, 300)).toBe(59);
  });
});

describe("pxToCm", () => {
  it("converts 300px at 300dpi to 2.54cm", () => {
    expect(pxToCm(300, 300)).toBeCloseTo(2.54, 2);
  });

  it("converts 0px to 0cm", () => {
    expect(pxToCm(0, 300)).toBe(0);
  });

  it("roundtrip: cmToPx → pxToCm ~= original", () => {
    const original = 5.0;
    const px = cmToPx(original, 300);
    const back = pxToCm(px, 300);
    expect(back).toBeCloseTo(original, 1);
  });

  it("uses default 300 DPI", () => {
    expect(pxToCm(300)).toBeCloseTo(2.54, 2);
  });
});

// ============================================================
// PERSPECTIVE_PRESETS
// ============================================================
describe("PERSPECTIVE_PRESETS", () => {
  it("has 5 presets", () => {
    expect(PERSPECTIVE_PRESETS).toHaveLength(5);
  });

  it("all presets have required fields", () => {
    PERSPECTIVE_PRESETS.forEach((preset) => {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(typeof preset.css).toBe("object");
    });
  });

  const expectedIds: SurfaceType[] = ["flat", "curved", "cylindrical", "spherical", "angled"];
  it("contains all expected surface types", () => {
    const ids = PERSPECTIVE_PRESETS.map((p) => p.id);
    expectedIds.forEach((id) => {
      expect(ids).toContain(id);
    });
  });

  it("flat preset has empty CSS (no transformation)", () => {
    const flat = PERSPECTIVE_PRESETS.find((p) => p.id === "flat");
    expect(flat?.css).toEqual({});
  });

  it("cylindrical preset has perspective and borderRadius", () => {
    const cyl = PERSPECTIVE_PRESETS.find((p) => p.id === "cylindrical");
    expect(cyl?.css.perspective).toBeDefined();
    expect(cyl?.css.borderRadius).toBeDefined();
  });

  it("spherical preset has 50% borderRadius", () => {
    const sph = PERSPECTIVE_PRESETS.find((p) => p.id === "spherical");
    expect(sph?.css.borderRadius).toBe("50%");
  });

  it("all labels are in Portuguese", () => {
    const labels = PERSPECTIVE_PRESETS.map((p) => p.label);
    expect(labels).toContain("Plano");
    expect(labels).toContain("Curvo");
    expect(labels).toContain("Cilíndrico");
    expect(labels).toContain("Esférico");
    expect(labels).toContain("Angular");
  });
});

// ============================================================
// detectSurfaceType
// ============================================================
describe("detectSurfaceType", () => {
  it("detects cylindrical for drinkware", () => {
    expect(detectSurfaceType("drinkware")).toBe("cylindrical");
  });

  it("detects cylindrical for caneca category", () => {
    expect(detectSurfaceType("caneca")).toBe("cylindrical");
  });

  it("detects cylindrical for squeeze template", () => {
    expect(detectSurfaceType("", "squeeze-001")).toBe("cylindrical");
  });

  it("detects flat for vestuário", () => {
    expect(detectSurfaceType("vestuário")).toBe("flat");
  });

  it("detects flat for embalagem", () => {
    expect(detectSurfaceType("embalagem")).toBe("flat");
  });

  it("detects flat for papelaria", () => {
    expect(detectSurfaceType("papelaria")).toBe("flat");
  });

  it("detects flat for camiseta template", () => {
    expect(detectSurfaceType("", "camiseta-basica")).toBe("flat");
  });

  it("detects flat for caderno template", () => {
    expect(detectSurfaceType("", "caderno-a5")).toBe("flat");
  });

  it("detects flat for sacola template", () => {
    expect(detectSurfaceType("", "sacola-eco")).toBe("flat");
  });

  it("detects curved for boné template", () => {
    expect(detectSurfaceType("", "boné-5-paineis")).toBe("curved");
  });

  it("detects curved for bone template (without accent)", () => {
    expect(detectSurfaceType("", "bone-trucker")).toBe("curved");
  });

  it("detects angled for pen template", () => {
    expect(detectSurfaceType("", "pen-drive")).toBe("angled");
  });

  it("detects angled for tech category", () => {
    expect(detectSurfaceType("tech")).toBe("angled");
  });

  it("defaults to flat for unknown category", () => {
    expect(detectSurfaceType("outros")).toBe("flat");
  });

  it("defaults to flat for empty strings", () => {
    expect(detectSurfaceType("", "")).toBe("flat");
  });

  it("is case-insensitive", () => {
    expect(detectSurfaceType("DRINKWARE")).toBe("cylindrical");
    expect(detectSurfaceType("Vestuário")).toBe("flat");
    expect(detectSurfaceType("TECH")).toBe("angled");
  });

  it("category takes priority when both match", () => {
    // caneca in category = cylindrical, even if template says camiseta
    expect(detectSurfaceType("caneca", "camiseta")).toBe("cylindrical");
  });
});

// ============================================================
// calculateAutoFit
// ============================================================
describe("calculateAutoFit", () => {
  // Create a mock image-like object
  const mockImg = (w: number, h: number) => ({ width: w, height: h }) as HTMLImageElement;

  it("centers a square logo in a square area", () => {
    const result = calculateAutoFit(mockImg(100, 100), 200, 200);
    expect(result.x).toBeCloseTo(20, 0);
    expect(result.y).toBeCloseTo(20, 0);
    expect(result.scale).toBeCloseTo(0.8, 1);
  });

  it("scales wider logo to fit width", () => {
    const result = calculateAutoFit(mockImg(400, 100), 200, 200);
    expect(result.scale).toBeGreaterThan(0);
    expect(result.scale).toBeLessThanOrEqual(1.5);
  });

  it("scales taller logo to fit height", () => {
    const result = calculateAutoFit(mockImg(100, 400), 200, 200);
    expect(result.scale).toBeGreaterThan(0);
    expect(result.scale).toBeLessThanOrEqual(1.5);
  });

  it("clamps scale to minimum 0.1", () => {
    // Extremely mismatched proportions
    const result = calculateAutoFit(mockImg(1, 10000), 200, 200);
    expect(result.scale).toBeGreaterThanOrEqual(0.1);
  });

  it("clamps scale to maximum 1.5", () => {
    const result = calculateAutoFit(mockImg(10, 10), 2000, 2000);
    expect(result.scale).toBeLessThanOrEqual(1.5);
  });

  it("respects custom padding", () => {
    const result = calculateAutoFit(mockImg(100, 100), 200, 200, 0.2);
    // With 20% padding, usable area is 120x120, so scale should be 0.6
    expect(result.scale).toBeCloseTo(0.6, 1);
  });

  it("returns positive x,y coordinates (logo within area)", () => {
    const result = calculateAutoFit(mockImg(300, 200), 400, 300);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });
});
