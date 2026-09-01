import { create } from "zustand";

export interface CinemaPreferences {
  presetId: string;
  presetLabel: string;
  lighting: string;
  lightingLabel: string;
  letterbox: boolean;
  grain: boolean;
  filters: {
    temperature: number;
    contrast: number;
    saturation: number;
    brightness: number;
    vignette: number;
  };
}

interface CinemaStore {
  preferences: CinemaPreferences | null;
  setPreferences: (prefs: CinemaPreferences) => void;
  clearPreferences: () => void;
}

export const useCinemaStore = create<CinemaStore>((set) => ({
  preferences: null,
  setPreferences: (prefs) => set({ preferences: prefs }),
  clearPreferences: () => set({ preferences: null }),
}));
