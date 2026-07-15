import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMockupEditorExports, type UseMockupEditorExportsOptions } from "../use-mockup-editor-exports";

const exportMockupImageMock = vi.fn();
const exportMockupPdfMock = vi.fn();
const renderMultiViewCanvasMock = vi.fn();
const generateArtPdfMock = vi.fn();

vi.mock("../../lib/export-service", () => ({
  exportMockupImage: (...args: unknown[]) => exportMockupImageMock(...args),
  exportMockupPdf: (...args: unknown[]) => exportMockupPdfMock(...args),
  renderMultiViewCanvas: (...args: unknown[]) => renderMultiViewCanvasMock(...args),
}));

vi.mock("@/features/mockup", () => ({
  generateFinalArtPdf: (...args: unknown[]) => generateArtPdfMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/error-logger", () => ({
  ErrorLogger: { error: vi.fn() },
}));

const navigateMock = vi.fn();

const baseOpts = (): UseMockupEditorExportsOptions => ({
  productImage: "prod.png",
  productSku: "SKU-1",
  productName: "Camiseta",
  technique: "DTF",
  areaName: "Frente",
  areaW: 300,
  areaH: 300,
  logoPreview: "data:image/png;base64,AAA",
  logoFile: new File(["x"], "logo.png", { type: "image/png" }),
  logoColors: ["#fff", "#000"],
  showLogo: true,
  placements: { front: { x: 0, y: 0, scale: 1, rotation: 0, flipH: false, flipV: false } },
  logoOpacity: 100,
  blendMode: "normal",
  surfaceType: "flat",
  shadowEnabled: false,
  shadowIntensity: 0.5,
  viewAreaW: 400,
  viewAreaH: 400,
  exportScale: 1,
  exportQuality: 0.9,
  exportFormat: "png",
  approvedViews: new Set(["front"]),
  views: [{ id: "front", label: "Frente", icon: "F", areaPercent: { x: 0, y: 0, w: 1, h: 1 } }],
  watermarkConfig: { include: false, opacity: 0.5, scale: 1, position: "center" },
  navigate: navigateMock,
});

describe("useMockupEditorExports", () => {
  beforeEach(() => {
    exportMockupImageMock.mockReset().mockResolvedValue(undefined);
    exportMockupPdfMock.mockReset().mockResolvedValue(undefined);
    renderMultiViewCanvasMock.mockReset().mockResolvedValue({ toDataURL: () => "data:image/png;base64,MOCK" });
    generateArtPdfMock.mockReset().mockReturnValue({ save: vi.fn() });
    navigateMock.mockReset();
  });

  it("handleExportImage chama exportMockupImage e limpa isExporting", async () => {
    const { result } = renderHook(() => useMockupEditorExports(baseOpts()));
    await act(async () => { await result.current.handleExportImage("png"); });
    expect(exportMockupImageMock).toHaveBeenCalledOnce();
    expect(result.current.isExporting).toBe(false);
  });

  it("handleExportImage trata erro sem lançar", async () => {
    exportMockupImageMock.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useMockupEditorExports(baseOpts()));
    await act(async () => { await result.current.handleExportImage("jpeg"); });
    expect(result.current.isExporting).toBe(false);
  });

  it("handleExportPng usa o exportFormat configurado", async () => {
    const opts = { ...baseOpts(), exportFormat: "webp" as const };
    const { result } = renderHook(() => useMockupEditorExports(opts));
    await act(async () => { await result.current.handleExportPng(); });
    const call = exportMockupImageMock.mock.calls[0]?.[0];
    expect(call.exportFormat).toBe("webp");
  });

  it("handleExportPdf chama exportMockupPdf com colors e technique", async () => {
    const { result } = renderHook(() => useMockupEditorExports(baseOpts()));
    await act(async () => { await result.current.handleExportPdf(); });
    expect(exportMockupPdfMock).toHaveBeenCalledOnce();
    const call = exportMockupPdfMock.mock.calls[0]?.[0];
    expect(call.technique).toBe("DTF");
    expect(call.colors).toEqual(["#fff", "#000"]);
  });

  it("handleExportArt gera e salva PDF de arte final", async () => {
    const saveMock = vi.fn();
    generateArtPdfMock.mockReturnValue({ save: saveMock });
    const { result } = renderHook(() => useMockupEditorExports(baseOpts()));
    act(() => { result.current.handleExportArt(); });
    expect(generateArtPdfMock).toHaveBeenCalledOnce();
    expect(saveMock).toHaveBeenCalledWith("arte-final-SKU-1.pdf");
  });

  it("handleOpenServiceOrder navega com prefill contendo mockupImageUrl", async () => {
    const { result } = renderHook(() => useMockupEditorExports(baseOpts()));
    await act(async () => { await result.current.handleOpenServiceOrder(); });
    expect(renderMultiViewCanvasMock).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith(
      "/mockup/service-order",
      expect.objectContaining({
        state: expect.objectContaining({
          prefill: expect.objectContaining({ mockupImageUrl: "data:image/png;base64,MOCK" }),
        }),
      }),
    );
  });

  it("handleOpenServiceOrder faz fallback quando renderMultiViewCanvas falha", async () => {
    renderMultiViewCanvasMock.mockRejectedValue(new Error("render fail"));
    const { result } = renderHook(() => useMockupEditorExports(baseOpts()));
    await act(async () => { await result.current.handleOpenServiceOrder(); });
    expect(navigateMock).toHaveBeenCalledWith(
      "/mockup/service-order",
      expect.objectContaining({
        state: expect.objectContaining({
          prefill: expect.objectContaining({ mockupImageUrl: "" }),
        }),
      }),
    );
    expect(result.current.isExporting).toBe(false);
  });
});
