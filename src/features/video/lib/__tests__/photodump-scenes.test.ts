import { describe, expect, it } from "vitest";
import {
  SCENE_PALETTES,
  computeProductPlacement,
  createSeededRandom,
  getScenePalette,
  hashSeed,
} from "../photodump-scenes";

describe("photodump-scenes", () => {
  it("tem paleta própria para todos os cenários da página", () => {
    // Espelha a lista de SCENARIOS de VideoPhotodump.tsx.
    const sceneIds = [
      "studio-white",
      "studio-dark",
      "lifestyle-desk",
      "outdoor-nature",
      "urban-street",
      "cafe",
      "beach",
      "neon",
      "marble",
      "wood",
      "gradient",
      "christmas",
      "desert-dusk",
      "rain-city",
      "museum",
      "gym",
      "airport",
      "subway",
      "rooftop",
      "garden-party",
    ];
    for (const id of sceneIds) {
      expect(SCENE_PALETTES[id], id).toBeDefined();
      expect(SCENE_PALETTES[id].id).toBe(id);
    }
  });

  it("gera paletas distintas por cenário (nenhuma cena repete o visual)", () => {
    const signatures = new Set(
      Object.values(SCENE_PALETTES).map(
        (p) => `${p.backdrop.join("|")}|${p.floor?.join("|") ?? "-"}|${p.horizon}|${p.decor}`,
      ),
    );
    expect(signatures.size).toBe(Object.keys(SCENE_PALETTES).length);
  });

  it("cai num fallback determinístico para cenário desconhecido", () => {
    const a = getScenePalette("cenario-inexistente");
    const b = getScenePalette("cenario-inexistente");
    expect(a).toEqual(b);
    expect(a.id).toBe("cenario-inexistente");
    expect(["bokeh", "beams", "streaks", "grid"]).toContain(a.decor);
  });

  it("hashSeed é estável e createSeededRandom é reprodutível", () => {
    expect(hashSeed("neon")).toBe(hashSeed("neon"));
    expect(hashSeed("neon")).not.toBe(hashSeed("cafe"));

    const first = createSeededRandom(hashSeed("neon"));
    const second = createSeededRandom(hashSeed("neon"));
    const firstRun = [first(), first(), first()];
    const secondRun = [second(), second(), second()];
    expect(firstRun).toEqual(secondRun);
    for (const value of firstRun) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("centraliza o produto e apoia a base acima do piso", () => {
    const placement = computeProductPlacement(1000, 500, 900);
    expect(placement.width).toBeLessThanOrEqual(900 * 0.62);
    expect(placement.height).toBeLessThanOrEqual(900 * 0.62);
    expect(placement.x).toBeCloseTo((900 - placement.width) / 2, 5);
    expect(placement.y + placement.height).toBeCloseTo(placement.baseline, 5);
    expect(placement.baseline).toBeCloseTo(900 * 0.86, 5);
  });

  it("não amplia imagens pequenas nem aceita dimensões inválidas", () => {
    const small = computeProductPlacement(80, 40, 900);
    expect(small.width).toBe(80);
    expect(small.height).toBe(40);

    expect(() => computeProductPlacement(0, 100, 900)).toThrow(/inválidas/);
  });

  it("respeita o limite de altura quando a imagem é muito alta", () => {
    const tall = computeProductPlacement(100, 2000, 900);
    expect(tall.height).toBeCloseTo(900 * 0.62, 5);
    expect(tall.width).toBeCloseTo((100 * (900 * 0.62)) / 2000, 5);
  });
});
