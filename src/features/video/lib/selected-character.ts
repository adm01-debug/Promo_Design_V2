import type { CharacterProfile } from "@/features/video/hooks/use-character-profiles";
import { findCharacterStyle } from "@/features/video/lib/character-styles";

/**
 * Seleção de personagem transferida do Character Studio para o Video Studio.
 * Antes o handoff levava apenas o emoji: personagens cujo avatar não estava no
 * mapa fixo do Video Studio (ex.: o estilo "sporty" usa 🏋️) caíam no prompt
 * genérico e perdiam a consistência visual.
 */
export interface StudioCharacter {
  id: string | null;
  name: string;
  avatar: string;
  description: string;
}

export const STORAGE_KEY_PROFILES = "character-studio-characters";
export const STORAGE_KEY_AVATAR = "selected_character_avatar";
export const STORAGE_KEY_ID = "selected_character_id";

/** Tetos do `CharacterRefSchema` em `supabase/functions/video-generate` (label 120, description 600). */
export const LABEL_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 600;

function readProfiles(): CharacterProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CharacterProfile =>
        !!entry &&
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.avatar === "string" &&
        Array.isArray(entry.traits) &&
        Array.isArray(entry.outfits) &&
        Array.isArray(entry.poses),
    );
  } catch {
    return [];
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

/** Descrição rica e determinística do personagem, respeitando o limite do backend. */
export function buildCharacterDescription(profile: Partial<CharacterProfile>): string {
  const traits = stringList(profile.traits).map((trait) => trait.toLowerCase());
  const outfits = stringList(profile.outfits);
  const poses = stringList(profile.poses);
  const styleDesc = findCharacterStyle(profile.style)?.desc ?? "professional";

  const fragments: string[] = [];
  const subject = traits.length ? `a ${traits.join(", ")} person` : "a person";
  fragments.push(
    outfits.length
      ? `${subject} wearing ${outfits.join(" or ")}`
      : `${subject} wearing brand-appropriate clothing`,
  );
  fragments.push(`in a ${styleDesc} style`);
  fragments.push(poses.length ? poses[0].toLowerCase() : "holding a product");
  fragments.push("photorealistic");
  fragments.push("studio lighting");
  fragments.push("high quality product photography");

  return fragments.join(", ").slice(0, DESCRIPTION_MAX_LENGTH);
}

export function toStudioCharacter(profile: CharacterProfile): StudioCharacter {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    description: buildCharacterDescription(profile),
  };
}

/**
 * Lê a seleção transferida pelo Character Studio.
 * Sem `selected_character_id` não há como garantir consistência entre gerações,
 * então a seleção é descartada e o Video Studio usa o emoji padrão.
 */
export function readSelectedCharacter(): StudioCharacter | null {
  let id: string | null = null;
  try {
    id = localStorage.getItem(STORAGE_KEY_ID);
  } catch {
    return null;
  }
  if (!id) return null;

  const profile = readProfiles().find((candidate) => candidate.id === id);
  return profile ? toStudioCharacter(profile) : null;
}

export function clearSelectedCharacter(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_AVATAR);
    localStorage.removeItem(STORAGE_KEY_ID);
  } catch {
    // Storage indisponível: nada a limpar.
  }
}
