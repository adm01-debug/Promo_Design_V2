import { test, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EditorRightPanel from "./EditorRightPanel";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Test-only partial props; typed as Record to avoid coupling to the full component API.
const defaultProps: Record<string, unknown> = {
  productName: "Test Product",
  productSku: "SKU-123",
  productImage: "/test.jpg",
  technique: "Laser",
  logoFile: null,
  logoPreview: "data:image/png;base64,fake",
  logoColors: ["#000000"],
  showLogo: true,
  setShowLogo: vi.fn(),
  fileInputRef: { current: null },
  handleLogoUpload: vi.fn(),
  setLogoPreview: vi.fn(),
  setLogoFile: vi.fn(),
  setLogoColors: vi.fn(),
  setWarpedLogoUrl: vi.fn(),
  blendMode: "normal",
  setBlendMode: vi.fn(),
  logoOpacity: 100,
  setLogoOpacity: vi.fn(),
  showTexture: true,
  setShowTexture: vi.fn(),
  shadowEnabled: true,
  setShadowEnabled: vi.fn(),
  shadowIntensity: 40,
  setShadowIntensity: vi.fn(),
  autoFitLogo: vi.fn(),
  surfaceType: "flat",
  setSurfaceType: vi.fn(),
  currentPlacement: { x: 10, y: 10, scale: 0.8, rotation: 0, flipH: false, flipV: false },
  updatePlacement: vi.fn(),
  currentViewLabel: "Frente",
  views: [{ id: "front", label: "Frente", icon: "🟦", areaPercent: { x: 0, y: 0, w: 100, h: 100 } }],
  approvedViews: new Set(),
  toggleApproval: vi.fn(),
  exportFormat: "png",
  setExportFormat: vi.fn(),
  exportQuality: 0.92,
  setExportQuality: vi.fn(),
  exportScale: 2,
  setExportScale: vi.fn(),
  handleExportPdf: vi.fn(),
  handleExportPng: vi.fn(),
  isExporting: false,
  watermarkConfig: { include: false, opacity: 0.1, scale: 0.8, position: "center" },
  setWatermarkConfig: vi.fn(),
  isSuggestingPlacement: false,
  isRemovingBg: false,
  handleSuggestPlacement: vi.fn(),
  handleRemoveBg: vi.fn(),
  suggestedPlacement: null,
  applySuggestedPlacement: vi.fn(),
  setSuggestedPlacement: vi.fn(),
  cancelAIRequest: vi.fn(),
  aiSuggestions: [],
  clearAISuggestions: vi.fn(),
  isPreviewingAI: false,
  setIsPreviewingAI: vi.fn(),
};

test("EditorRightPanel renders AI buttons", () => {
  render(
    <Wrapper>
      <EditorRightPanel {...defaultProps} />
    </Wrapper>
  );
  expect(screen.getByText("Sugerir")).toBeDefined();
  expect(screen.getByText("Limpar Fundo")).toBeDefined();
});

test("Cancel AI button behavior during loading", () => {
  const cancelAIRequest = vi.fn();
  const { rerender } = render(
    <Wrapper>
      <EditorRightPanel {...defaultProps} isSuggestingPlacement={true} cancelAIRequest={cancelAIRequest} />
    </Wrapper>
  );

  const suggestBtn = screen.getByText("Sugerir").closest('button');
  expect(suggestBtn).toBeDisabled();

  const cancelBtn = screen.getByText("Cancelar IA");
  fireEvent.click(cancelBtn);
  expect(cancelAIRequest).toHaveBeenCalled();

  rerender(
    <Wrapper>
      <EditorRightPanel {...defaultProps} isSuggestingPlacement={false} cancelAIRequest={cancelAIRequest} />
    </Wrapper>
  );
  expect(screen.queryByText("Cancelar IA")).toBeNull();
  expect(screen.getByText("Sugerir").closest('button')).not.toBeDisabled();
});

test("AI Suggestion summary and preview toggle", () => {
  const setIsPreviewingAI = vi.fn();
  const suggestedPlacement = {
    placement: { x: 50, y: 50, scale: 1.2, rotation: 45, flipH: false, flipV: false },
    reasoning: "Centered and scaled for better visibility."
  };

  render(
    <Wrapper>
      <EditorRightPanel 
        {...defaultProps} 
        suggestedPlacement={suggestedPlacement} 
        setIsPreviewingAI={setIsPreviewingAI}
      />
    </Wrapper>
  );

  // Check reasoning
  expect(screen.getByText("Centered and scaled for better visibility.")).toBeDefined();

  // Check summary (before/after values)
  // Current x: 10 -> Suggested x: 50
  expect(screen.getByText("10, 10")).toBeDefined();
  expect(screen.getByText("50, 50")).toBeDefined();
  
  // Current scale: 80% -> Suggested scale: 120%
  expect(screen.getByText("80% / 0°")).toBeDefined();
  expect(screen.getByText("120% / 45°")).toBeDefined();

  // Toggle preview
  const toggleBtn = screen.getByText("Ver Sugestão");
  fireEvent.click(toggleBtn);
  expect(setIsPreviewingAI).toHaveBeenCalledWith(true);
});
