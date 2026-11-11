import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { SurfaceType } from "@/features/mockup";
import type { AISuggestion } from "../hooks/use-mockup-editor-state";

// -------- Shared editor domain types --------

export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface Placement {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export interface ViewDef {
  id: string;
  label: string;
  icon: string;
  areaPercent: { x: number; y: number; w: number; h: number };
  bgRotation?: number;
}

export interface WatermarkConfig {
  include: boolean;
  opacity: number;
  scale: number;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

// -------- Context value --------

export interface MockupEditorContextValue {
  // Product
  productName: string;
  productSku: string;
  productImage: string;
  technique: string;

  // Logo
  logoFile: File | null;
  logoPreview: string | null;
  logoColors: string[];
  showLogo: boolean;
  setShowLogo: (v: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  handleLogoUpload: (file: File) => void;
  setLogoPreview: (v: string | null) => void;
  setLogoFile: (v: File | null) => void;
  setLogoColors: (v: string[]) => void;
  setWarpedLogoUrl: (v: string | null) => void;

  // Render / blend
  blendMode: BlendMode;
  setBlendMode: (bm: BlendMode) => void;
  logoOpacity: number;
  setLogoOpacity: (v: number) => void;
  showTexture: boolean;
  setShowTexture: (v: boolean) => void;
  shadowEnabled: boolean;
  setShadowEnabled: (v: boolean) => void;
  shadowIntensity: number;
  setShadowIntensity: (v: number) => void;

  // Placement / surface
  autoFitLogo: (dataUrl: string) => void;
  surfaceType: SurfaceType;
  setSurfaceType: (s: SurfaceType) => void;
  currentPlacement: Placement;
  updatePlacement: (u: Partial<Placement>) => void;
  currentViewLabel: string;

  // Views
  views: ViewDef[];
  approvedViews: Set<string>;
  toggleApproval: (id: string) => void;

  // Export
  exportFormat: ExportFormat;
  setExportFormat: (f: ExportFormat) => void;
  exportQuality: number;
  setExportQuality: (q: number) => void;
  exportScale: number;
  setExportScale: (s: number) => void;
  handleExportPdf: () => void;
  handleExportPng: () => void;
  isExporting: boolean;
  watermarkConfig: WatermarkConfig;
  setWatermarkConfig: (v: WatermarkConfig) => void;

  // AI
  isSuggestingPlacement: boolean;
  isRemovingBg: boolean;
  handleSuggestPlacement: () => void;
  handleRemoveBg: () => void;
  suggestedPlacement: { placement: Placement; reasoning: string } | null;
  applySuggestedPlacement: () => void;
  setSuggestedPlacement: (v: { placement: Placement; reasoning: string } | null) => void;
  cancelAIRequest: () => void;
  aiSuggestions: AISuggestion[];
  clearAISuggestions: () => void;
  isPreviewingAI: boolean;

  // Client persistence (para inteligência de padrões por cliente)
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;

  setIsPreviewingAI: (v: boolean) => void;
}

const MockupEditorContext = createContext<MockupEditorContextValue | null>(null);

export function MockupEditorProvider({
  value,
  children,
}: {
  value: MockupEditorContextValue;
  children: ReactNode;
}) {
  return <MockupEditorContext.Provider value={value}>{children}</MockupEditorContext.Provider>;
}

export function useMockupEditorContext(): MockupEditorContextValue {
  const ctx = useContext(MockupEditorContext);
  if (!ctx) {
    throw new Error("useMockupEditorContext must be used within <MockupEditorProvider>");
  }
  return ctx;
}
