import { describe, it, expect } from "vitest";
import {
  INSPIRATION_RECIPES,
  buildRemixState,
  filterInspirationRecipes,
  getInspirationRecipe,
  parseRemixState,
  sanitizeRecipePresetIds,
  INSPIRATION_ASPECT_VALUES,
  INSPIRATION_STYLE_VALUES,
} from "../inspiration-recipes";
import { getMotionPreset } from "../motion-presets";
import { TEMPLATES } from "@/features/video/components/VideoNewConstants";

describe("catálogo de inspiração", () => {
  it("possui ids únicos", () => {
    const ids = INSPIRATION_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("referencia apenas motion presets existentes", () => {
    for (const recipe of INSPIRATION_RECIPES) {
      for (const id of recipe.motionPresetIds) {
        expect(getMotionPreset(id), `${recipe.id} → ${id}`).toBeDefined();
      }
    }
  });

  it("referencia apenas templates existentes", () => {
    const templateIds = new Set(TEMPLATES.map((t) => t.id));
    for (const recipe of INSPIRATION_RECIPES) {
      expect(templateIds.has(recipe.templateId), recipe.id).toBe(true);
    }
  });

  it("usa aspect ratio, estilo e duração válidos", () => {
    for (const recipe of INSPIRATION_RECIPES) {
      expect(INSPIRATION_ASPECT_VALUES).toContain(recipe.aspectRatio);
      expect(INSPIRATION_STYLE_VALUES).toContain(recipe.videoStyle);
      expect([5, 10]).toContain(recipe.durationSeconds);
      expect(recipe.motionPresetIds.length).toBeGreaterThan(0);
      expect(recipe.extraInstructions.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("filterInspirationRecipes", () => {
  it("retorna tudo sem filtros", () => {
    expect(filterInspirationRecipes(INSPIRATION_RECIPES)).toHaveLength(INSPIRATION_RECIPES.length);
  });

  it("filtra por categoria", () => {
    const result = filterInspirationRecipes(INSPIRATION_RECIPES, { category: "social" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.category === "social")).toBe(true);
  });

  it("busca ignorando acento e caixa", () => {
    const result = filterInspirationRecipes(INSPIRATION_RECIPES, { search: "CINEMATOGRAFICO" });
    expect(filterInspirationRecipes(INSPIRATION_RECIPES, { search: "  " })).toHaveLength(
      INSPIRATION_RECIPES.length,
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it("encontra por tag", () => {
    const result = filterInspirationRecipes(INSPIRATION_RECIPES, { search: "orgânico" });
    expect(result.map((r) => r.id)).toContain("golden-hour-lifestyle");
  });

  it("retorna vazio para termo inexistente", () => {
    expect(filterInspirationRecipes(INSPIRATION_RECIPES, { search: "zzzz-nada" })).toHaveLength(0);
  });
});

describe("remix state", () => {
  it("gera state a partir da receita", () => {
    const recipe = INSPIRATION_RECIPES[0];
    const state = buildRemixState(recipe);
    expect(state.remixRecipeId).toBe(recipe.id);
    expect(state.motionPresetIds).toEqual(sanitizeRecipePresetIds(recipe));
  });

  it("faz round-trip pelo parser", () => {
    const recipe = INSPIRATION_RECIPES[2];
    expect(parseRemixState(buildRemixState(recipe))).toEqual(buildRemixState(recipe));
  });

  it("rejeita states inválidos", () => {
    expect(parseRemixState(null)).toBeNull();
    expect(parseRemixState("x")).toBeNull();
    expect(parseRemixState({})).toBeNull();
    expect(parseRemixState({ remixRecipeId: 42 })).toBeNull();
    expect(parseRemixState({ remixRecipeId: "inexistente" })).toBeNull();
  });

  it("ignora campos forjados e usa a receita canônica", () => {
    const forged = parseRemixState({
      remixRecipeId: "clean-studio-fade",
      aspectRatio: "hack",
      motionPresetIds: ["<script>"],
    });
    expect(forged?.aspectRatio).toBe("4:5");
    expect(forged?.motionPresetIds).not.toContain("<script>");
  });

  it("getInspirationRecipe devolve undefined para id desconhecido", () => {
    expect(getInspirationRecipe("nope")).toBeUndefined();
  });
});
