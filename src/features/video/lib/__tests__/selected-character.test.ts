import { beforeEach, describe, expect, it } from "vitest";
import type { CharacterProfile } from "@/features/video/hooks/use-character-profiles";
import {
  DESCRIPTION_MAX_LENGTH,
  STORAGE_KEY_AVATAR,
  STORAGE_KEY_ID,
  STORAGE_KEY_PROFILES,
  buildCharacterDescription,
  clearSelectedCharacter,
  readSelectedCharacter,
  toStudioCharacter,
} from "../selected-character";

const profile: CharacterProfile = {
  id: "char-3",
  name: "Equipe Fit",
  avatar: "🏋️",
  style: "sporty",
  traits: ["Atlético", "Jovem"],
  outfits: ["Regata", "Moletom cinza"],
  poses: ["Usando produto"],
  createdAt: "2026-01-01T00:00:00.000Z",
  favorite: false,
};

function seed(profiles: CharacterProfile[]) {
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
}

describe("selected-character", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("não inventa personagem quando o storage está vazio", () => {
    expect(readSelectedCharacter()).toBeNull();
  });

  it("ignora avatar sem id — sem id não há consistência entre gerações", () => {
    seed([profile]);
    localStorage.setItem(STORAGE_KEY_AVATAR, profile.avatar);
    expect(readSelectedCharacter()).toBeNull();
  });

  it("ignora id que não existe mais na lista de personagens", () => {
    seed([]);
    localStorage.setItem(STORAGE_KEY_ID, "char-removido");
    expect(readSelectedCharacter()).toBeNull();
  });

  it("devolve o perfil completo, inclusive avatar fora dos mapas fixos do video", () => {
    seed([profile]);
    localStorage.setItem(STORAGE_KEY_ID, profile.id);
    localStorage.setItem(STORAGE_KEY_AVATAR, profile.avatar);

    const selected = readSelectedCharacter();
    expect(selected).not.toBeNull();
    expect(selected?.id).toBe("char-3");
    expect(selected?.name).toBe("Equipe Fit");
    expect(selected?.avatar).toBe("🏋️");
    expect(selected?.description).toContain("Regata");
  });

  it("descrição carrega traits, figurinos, estilo e pose", () => {
    const description = buildCharacterDescription(profile);
    expect(description).toContain("atlético, jovem");
    expect(description).toContain("Regata or Moletom cinza");
    expect(description).toContain("Roupas fitness, ativas");
    expect(description).toContain("usando produto");
  });

  it("respeita o limite de 600 caracteres do CharacterRefSchema", () => {
    const huge = buildCharacterDescription({
      ...profile,
      traits: Array.from({ length: 200 }, (_, index) => `trait-${index}`),
      outfits: Array.from({ length: 200 }, (_, index) => `outfit-${index}`),
    });
    expect(huge.length).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
  });

  it("cai em defaults legíveis quando o perfil está incompleto", () => {
    const description = buildCharacterDescription({ style: "inexistente", poses: [] });
    expect(description).toContain("a person wearing brand-appropriate clothing");
    expect(description).toContain("professional");
    expect(description).toContain("holding a product");
  });

  it("toStudioCharacter preserva id, nome e avatar", () => {
    expect(toStudioCharacter(profile)).toEqual({
      id: "char-3",
      name: "Equipe Fit",
      avatar: "🏋️",
      description: buildCharacterDescription(profile),
    });
  });

  it("clearSelectedCharacter remove as duas chaves do handoff", () => {
    localStorage.setItem(STORAGE_KEY_ID, "char-3");
    localStorage.setItem(STORAGE_KEY_AVATAR, "🏋️");
    clearSelectedCharacter();
    expect(localStorage.getItem(STORAGE_KEY_ID)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_AVATAR)).toBeNull();
  });
});
