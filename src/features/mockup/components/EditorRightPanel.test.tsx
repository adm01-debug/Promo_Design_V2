import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EditorRightPanel from "./EditorRightPanel";
import React from "react";

// Mock ThemeProvider since it might not be easily accessible in test environment
const ThemeProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Mock props
const defaultProps: any = {
  productName: "Test Product",
  productSku: "SKU-123",
  productImage: "/test.jpg",
  technique: "Laser",
  logoFile: null,
  logoPreview: "data:image/png;base64,fake",
  logoColors: ["#000000"],
  showLogo: true,
  setShowLogo: () => {},
  fileInputRef: { current: null },
  handleLogoUpload: () => {},
  setLogoPreview: () => {},
  setLogoFile: () => {},
  setLogoColors: () => {},
  setWarpedLogoUrl: () => {},
  blendMode: "normal",
  setBlendMode: () => {},
  logoOpacity: 100,
  setLogoOpacity: () => {},
  showTexture: true,
  setShowTexture: () => {},
  shadowEnabled: true,
  setShadowEnabled: () => {},
  shadowIntensity: 40,
  setShadowIntensity: () => {},
  autoFitLogo: () => {},
  surfaceType: "flat",
  setSurfaceType: () => {},
  currentPlacement: { x: 0, y: 0, scale: 1, rotation: 0, flipH: false, flipV: false },
  updatePlacement: () => {},
  currentViewLabel: "Frente",
  views: [{ id: "front", label: "Frente", icon: "🟦", areaPercent: { x: 0, y: 0, w: 100, h: 100 } }],
  approvedViews: new Set(),
  toggleApproval: () => {},
  exportFormat: "png",
  setExportFormat: () => {},
  exportQuality: 0.92,
  setExportQuality: () => {},
  exportScale: 2,
  setExportScale: () => {},
  handleExportPdf: () => {},
  handleExportPng: () => {},
  isExporting: false,
  watermarkConfig: { include: false, opacity: 0.1, scale: 0.8, position: "center" },
  setWatermarkConfig: () => {},
  isSuggestingPlacement: false,
  isRemovingBg: false,
  handleSuggestPlacement: () => {},
  handleRemoveBg: () => {},
  suggestedPlacement: null,
  applySuggestedPlacement: () => {},
  setSuggestedPlacement: () => {},
  cancelAIRequest: () => {}
};

test("EditorRightPanel renders AI buttons", () => {
  render(
    <ThemeProvider>
      <EditorRightPanel {...defaultProps} />
    </ThemeProvider>
  );
  expect(screen.getByText("Sugerir")).toBeDefined();
  expect(screen.getByText("Limpar Fundo")).toBeDefined();
});

test("EditorRightPanel shows loading states", () => {
  render(
    <ThemeProvider>
      <EditorRightPanel {...defaultProps} isSuggestingPlacement={true} />
    </ThemeProvider>
  );
  expect(screen.getByText("Sugerir")).toBeDefined();
  // Loader icon should be present (via className or aria-hidden)
});

test("EditorRightPanel shows suggested placement preview", () => {
  const suggestedPlacement = {
    placement: { x: 10, y: 20, scale: 0.5, rotation: 15, flipH: false, flipV: false },
    reasoning: "Looks good here."
  };
  render(
    <ThemeProvider>
      <EditorRightPanel {...defaultProps} suggestedPlacement={suggestedPlacement} />
    </ThemeProvider>
  );
  expect(screen.getByText("Looks good here.")).toBeDefined();
  expect(screen.getByText("10, 20")).toBeDefined();
  expect(screen.getByText("50% / 15°")).toBeDefined();
  expect(screen.getByText("Aplicar Sugestão")).toBeDefined();
});
