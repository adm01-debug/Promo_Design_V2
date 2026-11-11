import { create } from "zustand";

export type MoodboardTone =
  "energetico" | "sofisticado" | "minimalista" | "divertido" | "luxuoso" | "natural";
export type MoodboardPalette = "quente" | "frio" | "neutro" | "vibrante" | "pastel" | "escuro";

export interface MoodboardPreferences {
  tone: MoodboardTone | null;
  palette: MoodboardPalette | null;
  scenes: string[];
  customColors: string[];
  keywords: string[];
}

interface MoodboardStore {
  preferences: MoodboardPreferences | null;
  setPreferences: (prefs: MoodboardPreferences) => void;
  clearPreferences: () => void;
}

export const useMoodboardStore = create<MoodboardStore>((set) => ({
  preferences: null,
  setPreferences: (prefs) => set({ preferences: prefs }),
  clearPreferences: () => set({ preferences: null }),
}));

// Maps for display labels
export const TONE_LABELS: Record<MoodboardTone, string> = {
  energetico: "Energético",
  sofisticado: "Sofisticado",
  minimalista: "Minimalista",
  divertido: "Divertido",
  luxuoso: "Luxuoso",
  natural: "Natural",
};

export const PALETTE_LABELS: Record<MoodboardPalette, string> = {
  quente: "Quente",
  frio: "Frio",
  neutro: "Neutro",
  vibrante: "Vibrante",
  pastel: "Pastel",
  escuro: "Escuro",
};

// Suggest video style based on moodboard tone
export const TONE_TO_STYLE: Record<MoodboardTone, string> = {
  energetico: "dinamico",
  sofisticado: "elegante",
  minimalista: "minimalista",
  divertido: "jovem",
  luxuoso: "premium",
  natural: "elegante",
};
