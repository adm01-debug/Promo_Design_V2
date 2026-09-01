import { getMotionPreset } from "@/features/video/lib/motion-presets";
import type { AspectRatio, VideoStyle } from "@/features/video/components/VideoNewConstants";

/**
 * Categorias do feed de inspiração. São de apresentação apenas — a receita
 * em si é totalmente descrita pelos campos remixáveis.
 */
export type InspirationCategory =
  | "produto"
  | "lifestyle"
  | "promocional"
  | "cinematografico"
  | "social";

export const INSPIRATION_CATEGORY_LABELS: Record<InspirationCategory, string> = {
  produto: "Produto",
  lifestyle: "Lifestyle",
  promocional: "Promocional",
  cinematografico: "Cinematográfico",
  social: "Social",
};

/**
 * Receita remixável: tudo o que o Video Studio precisa para reproduzir
 * um resultado. Nunca contém dados de usuário — é um catálogo estático,
 * versionado junto com o código e seguro para pré-carregar no cliente.
 */
export interface InspirationRecipe {
  /** Identificador estável — usado em telemetria e deep links. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: InspirationCategory;
  /** Ids de MOTION_PRESETS. Ids inválidos são descartados na resolução. */
  readonly motionPresetIds: readonly string[];
  readonly aspectRatio: AspectRatio;
  readonly videoStyle: VideoStyle;
  readonly durationSeconds: 5 | 10;
  /** Id de TEMPLATES do Video Studio. */
  readonly templateId: string;
  /** Instrução extra em inglês anexada ao prompt (aderência dos modelos). */
  readonly extraInstructions: string;
  readonly tags: readonly string[];
}

export const INSPIRATION_RECIPES: readonly InspirationRecipe[] = [
  {
    id: "hero-crash-reveal",
    title: "Hero Crash Reveal",
    description: "Zoom agressivo até o produto com congelamento e brilho final.",
    category: "produto",
    motionPresetIds: ["crash-zoom", "freeze-reveal", "studio-softbox"],
    aspectRatio: "9:16",
    videoStyle: "impactante",
    durationSeconds: 5,
    templateId: "reveal",
    extraInstructions: "punchy hero reveal, product locked in center frame, crisp specular highlights",
    tags: ["reels", "hero", "impacto"],
  },
  {
    id: "orbit-premium-360",
    title: "Órbita Premium 360°",
    description: "Rotação contínua em fundo escuro com profundidade rasa.",
    category: "produto",
    motionPresetIds: ["orbit", "shallow-dof", "studio-softbox"],
    aspectRatio: "1:1",
    videoStyle: "premium",
    durationSeconds: 10,
    templateId: "showcase",
    extraInstructions: "seamless loop orbit on a matte dark backdrop, luxury product photography feel",
    tags: ["360", "loop", "premium"],
  },
  {
    id: "macro-texture-study",
    title: "Estudo de Textura Macro",
    description: "Detalhe extremo com rack focus revelando o conjunto.",
    category: "produto",
    motionPresetIds: ["macro", "rack-focus", "slow-motion"],
    aspectRatio: "16:9",
    videoStyle: "elegante",
    durationSeconds: 10,
    templateId: "minimal",
    extraInstructions: "extreme macro detail of material and stitching, then pull focus to full product",
    tags: ["macro", "detalhe", "textura"],
  },
  {
    id: "golden-hour-lifestyle",
    title: "Lifestyle Golden Hour",
    description: "Cena real ao entardecer com câmera na mão.",
    category: "lifestyle",
    motionPresetIds: ["handheld", "golden-hour", "shallow-dof"],
    aspectRatio: "4:5",
    videoStyle: "premium",
    durationSeconds: 10,
    templateId: "lifestyle",
    extraInstructions: "authentic lifestyle scene at sunset, warm rim light, subtle lens flare",
    tags: ["lifestyle", "sunset", "orgânico"],
  },
  {
    id: "urban-fpv-run",
    title: "Corrida FPV Urbana",
    description: "Drone FPV atravessando o ambiente até o produto.",
    category: "cinematografico",
    motionPresetIds: ["fpv-drone", "speed-ramp", "anamorphic"],
    aspectRatio: "16:9",
    videoStyle: "dinamico",
    durationSeconds: 10,
    templateId: "cinematic",
    extraInstructions: "continuous FPV flight through an urban space ending on the product",
    tags: ["drone", "urbano", "cinema"],
  },
  {
    id: "flash-promo-cuts",
    title: "Flash Promo",
    description: "Cortes rápidos com whip pan e ênfase em oferta.",
    category: "promocional",
    motionPresetIds: ["whip-pan", "speed-ramp", "neon-night"],
    aspectRatio: "9:16",
    videoStyle: "impactante",
    durationSeconds: 5,
    templateId: "promo",
    extraInstructions: "fast promotional cuts with bold on-screen space reserved for price callout",
    tags: ["promo", "oferta", "rápido"],
  },
  {
    id: "neon-night-drop",
    title: "Neon Night Drop",
    description: "Lançamento noturno com neon e névoa volumétrica.",
    category: "social",
    motionPresetIds: ["dolly-in", "neon-night", "volumetric-fog"],
    aspectRatio: "9:16",
    videoStyle: "jovem",
    durationSeconds: 5,
    templateId: "neonglow",
    extraInstructions: "night product drop with cyan and magenta neon reflections on wet surfaces",
    tags: ["neon", "drop", "noturno"],
  },
  {
    id: "splash-freeze",
    title: "Splash Congelado",
    description: "Respingos suspensos em bullet time ao redor do produto.",
    category: "produto",
    motionPresetIds: ["bullet-time", "water-splash", "studio-softbox"],
    aspectRatio: "1:1",
    videoStyle: "impactante",
    durationSeconds: 5,
    templateId: "zoompulse",
    extraInstructions: "high-speed water splash frozen mid-air, droplets sharp and backlit",
    tags: ["splash", "bullet-time", "alta velocidade"],
  },
  {
    id: "clean-studio-fade",
    title: "Studio Limpo",
    description: "Dolly suave em fundo infinito branco, sem ruído visual.",
    category: "produto",
    motionPresetIds: ["dolly-in", "studio-softbox"],
    aspectRatio: "4:5",
    videoStyle: "minimalista",
    durationSeconds: 5,
    templateId: "minimal",
    extraInstructions: "clean seamless white cyclorama, soft even lighting, no props",
    tags: ["clean", "estúdio", "catálogo"],
  },
  {
    id: "crane-brand-open",
    title: "Abertura de Marca",
    description: "Crane ascendente revelando o produto em névoa.",
    category: "cinematografico",
    motionPresetIds: ["crane-up", "volumetric-fog", "anamorphic"],
    aspectRatio: "16:9",
    videoStyle: "premium",
    durationSeconds: 10,
    templateId: "cinematic",
    extraInstructions: "cinematic brand opener, slow crane reveal through light haze, letterbox framing",
    tags: ["abertura", "marca", "épico"],
  },
  {
    id: "story-swipe-carousel",
    title: "Carrossel de Stories",
    description: "Transições verticais rápidas encadeando cenas.",
    category: "social",
    motionPresetIds: ["whip-pan", "hyperlapse"],
    aspectRatio: "9:16",
    videoStyle: "dinamico",
    durationSeconds: 10,
    templateId: "story",
    extraInstructions: "vertical swipe transitions between three short product beats",
    tags: ["stories", "carrossel", "vertical"],
  },
  {
    id: "frost-luxury",
    title: "Luxo Gelado",
    description: "Vapor frio e reflexos suaves em ritmo lento.",
    category: "cinematografico",
    motionPresetIds: ["slow-motion", "frost", "macro"],
    aspectRatio: "1:1",
    videoStyle: "elegante",
    durationSeconds: 10,
    templateId: "floating",
    extraInstructions: "cold vapour rolling over a polished surface, deep blacks, restrained motion",
    tags: ["gelo", "luxo", "slow"],
  },
] as const;

const RECIPES_BY_ID = new Map(INSPIRATION_RECIPES.map((r) => [r.id, r]));

/** Busca uma receita pelo id; `undefined` quando o id não existe. */
export function getInspirationRecipe(id: string): InspirationRecipe | undefined {
  return RECIPES_BY_ID.get(id);
}

/**
 * Descarta ids de preset que não existem mais no catálogo de motion.
 * Protege contra receitas defasadas após remoção de um preset.
 */
export function sanitizeRecipePresetIds(recipe: InspirationRecipe): string[] {
  return recipe.motionPresetIds.filter((id) => getMotionPreset(id) !== undefined);
}

/**
 * Filtro determinístico do feed. A busca é case/acento-insensível e
 * cobre título, descrição e tags.
 */
export function filterInspirationRecipes(
  recipes: readonly InspirationRecipe[],
  options: { search?: string; category?: InspirationCategory | "all" } = {},
): InspirationRecipe[] {
  const term = normalize(options.search ?? "");
  const category = options.category ?? "all";
  return recipes.filter((recipe) => {
    if (category !== "all" && recipe.category !== category) return false;
    if (!term) return true;
    const haystack = normalize(
      [recipe.title, recipe.description, ...recipe.tags].join(" "),
    );
    return haystack.includes(term);
  });
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Payload entregue ao Video Studio via `navigate(state)` ao remixar. */
export interface RemixState {
  readonly remixRecipeId: string;
  readonly motionPresetIds: string[];
  readonly aspectRatio: AspectRatio;
  readonly videoStyle: VideoStyle;
  readonly durationSeconds: 5 | 10;
  readonly templateId: string;
  readonly extraInstructions: string;
}

export function buildRemixState(recipe: InspirationRecipe): RemixState {
  return {
    remixRecipeId: recipe.id,
    motionPresetIds: sanitizeRecipePresetIds(recipe),
    aspectRatio: recipe.aspectRatio,
    videoStyle: recipe.videoStyle,
    durationSeconds: recipe.durationSeconds,
    templateId: recipe.templateId,
    extraInstructions: recipe.extraInstructions,
  };
}

const ASPECT_VALUES: readonly AspectRatio[] = ["9:16", "1:1", "16:9", "4:5"];
const STYLE_VALUES: readonly VideoStyle[] = [
  "premium",
  "dinamico",
  "minimalista",
  "impactante",
  "elegante",
  "jovem",
];

/**
 * Valida um `location.state` desconhecido vindo da navegação.
 * `history.state` é controlável pelo usuário, então nada é confiado.
 */
export function parseRemixState(value: unknown): RemixState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.remixRecipeId !== "string") return null;
  const recipe = getInspirationRecipe(raw.remixRecipeId);
  if (!recipe) return null;
  // A receita canônica é a fonte da verdade — o state só identifica qual é.
  return buildRemixState(recipe);
}

/** Nome do parâmetro de query usado nos deep links de receita. */
export const REMIX_QUERY_PARAM = "recipe";

/**
 * Caminho relativo compartilhável que abre o Studio já remixado.
 * Relativo de propósito: evita depender de `window` (SSR/testes).
 */
export function buildRecipeDeepLink(recipe: InspirationRecipe): string {
  return `/video/new?${REMIX_QUERY_PARAM}=${encodeURIComponent(recipe.id)}`;
}

/**
 * Recupera o remix a partir da query string. Usado como fallback quando
 * `location.state` não existe (link compartilhado, reload, nova aba).
 */
export function parseRemixFromSearch(search: string | URLSearchParams): RemixState | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const id = params.get(REMIX_QUERY_PARAM);
  if (!id) return null;
  const recipe = getInspirationRecipe(id);
  return recipe ? buildRemixState(recipe) : null;
}

export { ASPECT_VALUES as INSPIRATION_ASPECT_VALUES, STYLE_VALUES as INSPIRATION_STYLE_VALUES };
