import { useCallback, useEffect, useState } from "react";

export interface CharacterProfile {
  id: string;
  name: string;
  avatar: string;
  style: string;
  traits: string[];
  outfits: string[];
  poses: string[];
  createdAt: string;
  favorite: boolean;
}

const STORAGE_KEY = "character-studio-characters";

function readStored(): CharacterProfile[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (c): c is CharacterProfile =>
        !!c &&
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        typeof c.avatar === "string" &&
        Array.isArray(c.traits) &&
        Array.isArray(c.outfits) &&
        Array.isArray(c.poses),
    );
  } catch {
    return null;
  }
}

/**
 * Personagens do Character Studio persistidos no localStorage.
 * `seed` é usado apenas quando não há nada salvo (primeira visita).
 */
export function useCharacterProfiles(seed: CharacterProfile[]) {
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => readStored() ?? seed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch {
      // Quota cheia ou storage indisponível: estado em memória segue válido.
    }
  }, [characters]);

  const add = useCallback((character: CharacterProfile) => {
    setCharacters((prev) => [character, ...prev]);
  }, []);

  const remove = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)));
  }, []);

  return { characters, add, remove, toggleFavorite };
}
