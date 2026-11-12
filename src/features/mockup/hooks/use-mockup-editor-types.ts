/**
 * Tipos compartilhados entre o hook principal `useMockupEditor`
 * e seus hooks satélite (`useMockupAIActions`, etc).
 */
export type Placement = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
};

export type HistoryEntry = { placement: Placement; logoPreview: string | null };

export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";

export type ExportFormat = "png" | "jpeg" | "webp";

export const INITIAL_PLACEMENT: Placement = {
  x: 10,
  y: 10,
  scale: 0.8,
  rotation: 0,
  flipH: false,
  flipV: false,
};

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "darken", label: "Darken" },
  { id: "color-burn", label: "Color Burn" },
];
