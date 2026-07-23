import { test, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks — EditorRightPanel imports AssetPicker which requires them.
vi.mock("@/hooks/use-organization", () => ({
  useOrganizations: () => ({ currentOrgId: "org-1", can: () => true }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "test@test.com" }, session: null, loading: false }),
}));

import EditorRightPanel from "./EditorRightPanel";
import {
  MockupEditorProvider,
  type MockupEditorContextValue,
} from "../context/mockup-editor-context";

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
    queries: { retry: false },
  },
});

function makeDefaults(overrides: Partial<MockupEditorContextValue> = {}): MockupEditorContextValue {
  return ({
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
    selectedClientId: null,
    setSelectedClientId: vi.fn(),

    ...overrides,
  }) as MockupEditorContextValue;
}

function renderPanel(value: MockupEditorContextValue) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MockupEditorProvider value={value}>
        <EditorRightPanel />
      </MockupEditorProvider>
    </QueryClientProvider>,
  );
}

test("EditorRightPanel renders AI buttons", () => {
  renderPanel(makeDefaults());
  expect(screen.getByText("Sugerir")).toBeDefined();
  expect(screen.getByText("Limpar Fundo")).toBeDefined();
});

test("Cancel AI button behavior during loading", () => {
  const cancelAIRequest = vi.fn();
  const { rerender } = renderPanel(makeDefaults({ isSuggestingPlacement: true, cancelAIRequest }));

  const suggestBtn = screen.getByText("Sugerir").closest("button");
  expect(suggestBtn).toBeDisabled();

  const cancelBtn = screen.getByText("Cancelar IA");
  fireEvent.click(cancelBtn);
  expect(cancelAIRequest).toHaveBeenCalled();

  rerender(
    <QueryClientProvider client={queryClient}>
      <MockupEditorProvider value={makeDefaults({ isSuggestingPlacement: false, cancelAIRequest })}>
        <EditorRightPanel />
      </MockupEditorProvider>
    </QueryClientProvider>,
  );
  expect(screen.queryByText("Cancelar IA")).toBeNull();
  expect(screen.getByText("Sugerir").closest("button")).not.toBeDisabled();
});

test("AI Suggestion summary and preview toggle", () => {
  const setIsPreviewingAI = vi.fn();
  const suggestedPlacement = {
    placement: { x: 50, y: 50, scale: 1.2, rotation: 45, flipH: false, flipV: false },
    reasoning: "Centered and scaled for better visibility.",
  };

  renderPanel(makeDefaults({ suggestedPlacement, setIsPreviewingAI }));

  expect(screen.getByText("Centered and scaled for better visibility.")).toBeDefined();
  expect(screen.getByText("10, 10")).toBeDefined();
  expect(screen.getByText("50, 50")).toBeDefined();
  expect(screen.getByText("80% / 0°")).toBeDefined();
  expect(screen.getByText("120% / 45°")).toBeDefined();

  const toggleBtn = screen.getByText("Ver Sugestão");
  fireEvent.click(toggleBtn);
  expect(setIsPreviewingAI).toHaveBeenCalledWith(true);
});
