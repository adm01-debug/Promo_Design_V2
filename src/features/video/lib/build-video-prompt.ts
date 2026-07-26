import type { CinemaPreferences } from "@/hooks/use-cinema-preferences";
import type { MoodboardPreferences } from "@/hooks/use-moodboard-preferences";
import { resolveMotionPresets } from "./motion-presets";

/**
 * Vocabulário em inglês por tom/paleta do moodboard. O prompt final é sempre
 * em inglês porque os modelos de vídeo têm aderência muito maior a termos
 * cinematográficos nesse idioma — a UI permanece em PT-BR.
 */
const TONE_FRAGMENT: Record<string, string> = {
  energetico: "energetic and punchy mood",
  sofisticado: "sophisticated and refined mood",
  minimalista: "minimal, restrained mood",
  divertido: "playful and lighthearted mood",
  luxuoso: "luxurious, high-end mood",
  natural: "natural, organic mood",
};

const PALETTE_FRAGMENT: Record<string, string> = {
  quente: "warm colour palette",
  frio: "cool colour palette",
  neutro: "neutral colour palette",
  vibrante: "vibrant saturated colour palette",
  pastel: "soft pastel colour palette",
  escuro: "dark moody colour palette",
};

const STYLE_FRAGMENT: Record<string, string> = {
  premium: "premium advertising film look",
  dinamico: "fast paced dynamic commercial look",
  minimalista: "clean minimal product film look",
  impactante: "bold high impact commercial look",
  elegante: "elegant editorial film look",
  jovem: "youthful social-first look",
};

export interface BuildVideoPromptInput {
  productName: string;
  productSku?: string | null;
  /** Ids de motion presets selecionados (ordem de clique é irrelevante). */
  motionPresetIds?: readonly string[];
  aspectRatio: string;
  durationSeconds: number;
  videoStyle?: string;
  moodboard?: MoodboardPreferences | null;
  cinema?: CinemaPreferences | null;
  /** Descrição do personagem/embaixador vindo do Character Studio. */
  characterDescription?: string | null;
  /** Texto livre adicional escrito pelo usuário. */
  extraInstructions?: string | null;
}

/** Remove vazios, normaliza espaços e deduplica preservando a primeira ocorrência. */
function normalizeFragments(fragments: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of fragments) {
    if (!raw) continue;
    const value = raw.replace(/\s+/g, " ").trim().replace(/[.,;]+$/, "");
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/**
 * Monta o prompt final de geração de vídeo a partir do produto e das
 * preferências acumuladas nos módulos Moodboard, Cinema e Character Studio.
 *
 * É uma função **pura e determinística**: as mesmas entradas produzem sempre
 * exatamente a mesma string, independentemente da ordem de seleção dos presets.
 */
export function buildVideoPrompt(input: BuildVideoPromptInput): string {
  const {
    productName,
    productSku,
    motionPresetIds = [],
    aspectRatio,
    durationSeconds,
    videoStyle,
    moodboard,
    cinema,
    characterDescription,
    extraInstructions,
  } = input;

  const subject = productSku
    ? `${productName.trim()} (SKU ${productSku.trim()})`
    : productName.trim();

  const presets = resolveMotionPresets(motionPresetIds);

  const fragments = normalizeFragments([
    `${durationSeconds}s product film of ${subject}`,
    videoStyle ? STYLE_FRAGMENT[videoStyle] : null,
    characterDescription ? `featuring ${characterDescription}` : null,
    ...presets.map((p) => p.promptFragment),
    moodboard?.tone ? TONE_FRAGMENT[moodboard.tone] : null,
    moodboard?.palette ? PALETTE_FRAGMENT[moodboard.palette] : null,
    moodboard?.scenes?.length ? `set in ${moodboard.scenes.join(", ")}` : null,
    moodboard?.keywords?.length ? moodboard.keywords.join(", ") : null,
    cinema?.presetLabel ? `${cinema.presetLabel} colour grade` : null,
    cinema?.lightingLabel ? `${cinema.lightingLabel} lighting` : null,
    cinema?.letterbox ? "cinematic letterbox bars" : null,
    cinema?.grain ? "subtle film grain" : null,
    extraInstructions,
    `${aspectRatio} aspect ratio`,
    "product stays sharp, consistent and true to its real shape and colours",
  ]);

  return `${fragments.join(", ")}.`;
}
