import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useCharacterProfiles,
  type CharacterProfile,
} from "@/features/video/hooks/use-character-profiles";

const seed = (): CharacterProfile[] => [
  {
    id: "char-seed",
    name: "Seed",
    avatar: "A",
    style: "professional",
    traits: ["jovem"],
    outfits: ["terno"],
    poses: ["em pe"],
    createdAt: "2026-01-01T00:00:00.000Z",
    favorite: false,
  },
];

const makeChar = (id: string, name = "Novo"): CharacterProfile => ({
  id,
  name,
  avatar: "B",
  style: "casual",
  traits: [],
  outfits: [],
  poses: [],
  createdAt: "2026-01-02T00:00:00.000Z",
  favorite: false,
});

describe("useCharacterProfiles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("usa o seed quando nao ha nada salvo", () => {
    const { result } = renderHook(() => useCharacterProfiles(seed()));
    expect(result.current.characters).toHaveLength(1);
    expect(result.current.characters[0].id).toBe("char-seed");
  });

  it("persiste personagem criado no localStorage", () => {
    const { result } = renderHook(() => useCharacterProfiles(seed()));
    act(() => result.current.add(makeChar("char-novo")));

    const stored = JSON.parse(localStorage.getItem("character-studio-characters") ?? "[]");
    expect(stored.map((c: CharacterProfile) => c.id)).toEqual(["char-novo", "char-seed"]);

    const { result: remount } = renderHook(() => useCharacterProfiles(seed()));
    expect(remount.current.characters[0].id).toBe("char-novo");
  });

  it("persiste remocao e favorito", () => {
    const { result } = renderHook(() => useCharacterProfiles(seed()));
    act(() => result.current.add(makeChar("char-x")));
    act(() => result.current.toggleFavorite("char-x"));
    expect(result.current.characters.find((c) => c.id === "char-x")?.favorite).toBe(true);

    act(() => result.current.remove("char-x"));
    expect(result.current.characters.map((c) => c.id)).toEqual(["char-seed"]);

    const { result: remount } = renderHook(() => useCharacterProfiles(seed()));
    expect(remount.current.characters.map((c) => c.id)).toEqual(["char-seed"]);
  });

  it("descarta payload corrompido e cai no seed", () => {
    localStorage.setItem("character-studio-characters", "{nao-e-json");
    const { result } = renderHook(() => useCharacterProfiles(seed()));
    expect(result.current.characters.map((c) => c.id)).toEqual(["char-seed"]);
  });
});
