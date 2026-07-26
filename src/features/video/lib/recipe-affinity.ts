import type { DesignRecommendation } from "@/features/mockup/hooks/use-client-design-recommendation";
import {
  INSPIRATION_RECIPES,
  type InspirationCategory,
  type InspirationRecipe,
} from "@/features/video/lib/inspiration-recipes";
import type { VideoStyle } from "@/features/video/components/VideoNewConstants";

/**
 * Cruza o padrão histórico de design do cliente (`client_design_patterns`)
 * com o catálogo estático de receitas do Feed de Inspiração.
 *
 * Contrato:
 * - Função **pura e determinística**: mesma entrada ⇒ mesma saída e mesma ordem.
 * - Nenhuma entrada é confiada: valores fora de faixa/ausentes são ignorados.
 * - Score final normalizado em 0..1 e ponderado pela confiança do padrão,
 *   de modo que amostras pequenas nunca dominem a curadoria.
 */

interface Preference {
  readonly presets?: readonly string[];
  readonly styles?: readonly VideoStyle[];
  readonly categories?: readonly InspirationCategory[];
  readonly reason: string;
}

/** Superfície predominante nas artes do cliente ⇒ linguagem de câmera. */
const SURFACE_PREFERENCES: Record<string, Preference> = {
  flat: {
    presets: ["dolly-in", "studio-softbox"],
    styles: ["minimalista", "elegante"],
    categories: ["produto"],
    reason: "artes majoritariamente em superfícies planas",
  },
  curved: {
    presets: ["orbit", "shallow-dof"],
    styles: ["premium"],
    categories: ["produto"],
    reason: "artes em superfícies curvas",
  },
  cylindrical: {
    presets: ["orbit", "macro"],
    styles: ["premium", "elegante"],
    categories: ["produto"],
    reason: "artes em superfícies cilíndricas",
  },
  spherical: {
    presets: ["orbit", "bullet-time"],
    styles: ["impactante"],
    categories: ["produto"],
    reason: "artes em superfícies esféricas",
  },
  angled: {
    presets: ["whip-pan", "speed-ramp"],
    styles: ["dinamico"],
    categories: ["promocional", "social"],
    reason: "artes em superfícies anguladas",
  },
};

/** Blend mode predominante ⇒ temperatura visual do filme. */
const BLEND_PREFERENCES: Record<string, Preference> = {
  normal: { styles: ["premium"], reason: "aplicação sólida do logo" },
  multiply: { styles: ["elegante", "minimalista"], reason: "aplicações em multiply" },
  screen: { styles: ["impactante", "jovem"], reason: "aplicações em screen" },
  overlay: { styles: ["impactante"], reason: "aplicações em overlay" },
  "soft-light": { styles: ["elegante"], reason: "aplicações em soft light" },
};

const WEIGHTS = { preset: 0.5, style: 0.3, category: 0.2 } as const;

export interface RecipeAffinity {
  readonly recipe: InspirationRecipe;
  /** 0..1 — já ponderado pela confiança do padrão do cliente. */
  readonly score: number;
  /** Motivos legíveis (PT-BR) que explicam a sugestão. */
  readonly reasons: readonly string[];
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/** Deriva as preferências ativas a partir da recomendação do cliente. */
function collectPreferences(rec: DesignRecommendation): Preference[] {
  const prefs: Preference[] = [];

  const surface = rec.suggestedSurfaceType;
  if (surface && SURFACE_PREFERENCES[surface]) prefs.push(SURFACE_PREFERENCES[surface]);

  const blend = rec.suggestedBlendMode;
  if (blend && BLEND_PREFERENCES[blend]) prefs.push(BLEND_PREFERENCES[blend]);

  if (isFiniteInRange(rec.opacity, 0, 1) && rec.opacity < 0.7) {
    prefs.push({
      styles: ["minimalista", "elegante"],
      reason: "logo aplicado com baixa opacidade",
    });
  }

  const scale = rec.placement?.scale;
  if (isFiniteInRange(scale, 0, 10)) {
    if (scale >= 0.35) {
      prefs.push({
        styles: ["impactante", "dinamico"],
        categories: ["promocional"],
        reason: "logo historicamente grande na peça",
      });
    } else if (scale <= 0.15) {
      prefs.push({
        styles: ["minimalista", "elegante"],
        reason: "logo historicamente discreto",
      });
    }
  }

  return prefs;
}

/**
 * Ranqueia as receitas para um cliente. Retorna **todas** as receitas
 * (score 0 inclusive) na ordem: score desc, depois ordem curada original.
 */
export function rankRecipesForClient(
  rec: DesignRecommendation | null | undefined,
  recipes: readonly InspirationRecipe[] = INSPIRATION_RECIPES,
): RecipeAffinity[] {
  const confidence = isFiniteInRange(rec?.confidence, 0, 1) ? rec!.confidence : 0;
  const prefs = rec && confidence > 0 ? collectPreferences(rec) : [];

  const ranked = recipes.map((recipe, index) => {
    if (prefs.length === 0) {
      return { recipe, index, score: 0, reasons: [] as string[] };
    }

    let raw = 0;
    let max = 0;
    const reasons = new Set<string>();

    for (const pref of prefs) {
      let matched = false;
      if (pref.presets?.length) {
        max += WEIGHTS.preset;
        const hits = pref.presets.filter((id) => recipe.motionPresetIds.includes(id)).length;
        if (hits > 0) {
          raw += WEIGHTS.preset * Math.min(1, hits / pref.presets.length);
          matched = true;
        }
      }
      if (pref.styles?.length) {
        max += WEIGHTS.style;
        if (pref.styles.includes(recipe.videoStyle)) {
          raw += WEIGHTS.style;
          matched = true;
        }
      }
      if (pref.categories?.length) {
        max += WEIGHTS.category;
        if (pref.categories.includes(recipe.category)) {
          raw += WEIGHTS.category;
          matched = true;
        }
      }
      if (matched) reasons.add(pref.reason);
    }

    const normalized = max > 0 ? raw / max : 0;
    return {
      recipe,
      index,
      score: Number((normalized * confidence).toFixed(4)),
      reasons: [...reasons],
    };
  });

  return ranked
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ recipe, score, reasons }) => ({ recipe, score, reasons }));
}

/** Índice por id para consulta O(1) na UI. */
export function indexAffinityById(
  affinities: readonly RecipeAffinity[],
): Record<string, RecipeAffinity> {
  const out: Record<string, RecipeAffinity> = {};
  for (const item of affinities) out[item.recipe.id] = item;
  return out;
}
