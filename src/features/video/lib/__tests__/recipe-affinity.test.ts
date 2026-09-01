import { describe, it, expect } from "vitest";
import {
  rankRecipesForClient,
  indexAffinityById,
} from "@/features/video/lib/recipe-affinity";
import { INSPIRATION_RECIPES } from "@/features/video/lib/inspiration-recipes";
import type { DesignRecommendation } from "@/features/mockup/hooks/use-client-design-recommendation";

const base: DesignRecommendation = {
  confidence: 1,
  sampleSize: 40,
  source: "client",
};

describe("rankRecipesForClient", () => {
  it("retorna todas as receitas mesmo sem recomendação", () => {
    const ranked = rankRecipesForClient(null);
    expect(ranked).toHaveLength(INSPIRATION_RECIPES.length);
    expect(ranked.every((r) => r.score === 0)).toBe(true);
  });

  it("preserva a ordem curada quando não há sinal", () => {
    const ranked = rankRecipesForClient({ ...base, confidence: 0 });
    expect(ranked.map((r) => r.recipe.id)).toEqual(INSPIRATION_RECIPES.map((r) => r.id));
  });

  it("prioriza órbita para superfícies cilíndricas", () => {
    const ranked = rankRecipesForClient({ ...base, suggestedSurfaceType: "cylindrical" });
    expect(ranked[0].recipe.motionPresetIds).toContain("orbit");
    expect(ranked[0].score).toBeGreaterThan(0);
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
  });

  it("prioriza estilos impactantes com logo grande", () => {
    const ranked = rankRecipesForClient({
      ...base,
      placement: { x: 0.5, y: 0.5, scale: 0.5 },
    });
    expect(["impactante", "dinamico"]).toContain(ranked[0].recipe.videoStyle);
  });

  it("prioriza estilos contidos com opacidade baixa", () => {
    const ranked = rankRecipesForClient({ ...base, opacity: 0.4 });
    expect(["minimalista", "elegante"]).toContain(ranked[0].recipe.videoStyle);
  });

  it("pondera o score pela confiança", () => {
    const full = rankRecipesForClient({ ...base, suggestedSurfaceType: "cylindrical" })[0];
    const half = rankRecipesForClient({
      ...base,
      confidence: 0.5,
      suggestedSurfaceType: "cylindrical",
    })[0];
    expect(half.score).toBeCloseTo(full.score / 2, 3);
  });

  it("ignora valores inválidos sem quebrar", () => {
    const ranked = rankRecipesForClient({
      ...base,
      confidence: Number.NaN,
      opacity: -5,
      suggestedSurfaceType: "desconhecida",
    });
    expect(ranked).toHaveLength(INSPIRATION_RECIPES.length);
    expect(ranked.every((r) => r.score === 0)).toBe(true);
  });

  it("é determinístico", () => {
    const rec = { ...base, suggestedSurfaceType: "angled", suggestedBlendMode: "screen" };
    expect(rankRecipesForClient(rec).map((r) => r.recipe.id)).toEqual(
      rankRecipesForClient(rec).map((r) => r.recipe.id),
    );
  });

  it("indexa por id", () => {
    const idx = indexAffinityById(rankRecipesForClient({ ...base, opacity: 0.4 }));
    expect(Object.keys(idx)).toHaveLength(INSPIRATION_RECIPES.length);
    expect(idx["clean-studio-fade"].recipe.id).toBe("clean-studio-fade");
  });
});
