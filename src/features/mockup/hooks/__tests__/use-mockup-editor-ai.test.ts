import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMockupEditorAI } from "../use-mockup-editor-ai";

// Mock supabase client
const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

// crypto.randomUUID polyfill
if (!globalThis.crypto) {
  // @ts-expect-error test env
  globalThis.crypto = { randomUUID: () => "test-uuid" };
} else if (!globalThis.crypto.randomUUID) {
  // @ts-expect-error test env
  globalThis.crypto.randomUUID = () => "test-uuid";
}

const baseOptions = () => ({
  logoPreview: "data:image/png;base64,AAAA",
  productName: "Camiseta",
  productSku: "SKU-1",
  areaW: 300,
  areaH: 300,
  virtualCanvasSize: 1000,
  pushLogoToHistory: vi.fn(),
  pushAISuggestion: vi.fn(),
  setBlendMode: vi.fn(),
  setSurfaceType: vi.fn(),
  setLogoOpacity: vi.fn(),
});

describe("useMockupEditorAI", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("não chama IA quando logoPreview é null", async () => {
    const opts = { ...baseOptions(), logoPreview: null };
    const { result } = renderHook(() => useMockupEditorAI(opts));
    await act(async () => { await result.current.handleSuggestPlacement(); });
    expect(invokeMock).not.toHaveBeenCalled();
    expect(result.current.isSuggestingPlacement).toBe(false);
  });

  it("handleSuggestPlacement processa resposta e aplica sugestões", async () => {
    invokeMock.mockResolvedValue({
      data: {
        scale: 0.5,
        xPercent: 25,
        yPercent: 40,
        rotation: 10,
        reasoning: "Centralizado",
        blendMode: "multiply",
        surfaceType: "cylinder",
        opacity: 80,
      },
      error: null,
    });
    const opts = baseOptions();
    const { result } = renderHook(() => useMockupEditorAI(opts));
    await act(async () => { await result.current.handleSuggestPlacement(); });

    expect(invokeMock).toHaveBeenCalledOnce();
    expect(result.current.suggestedPlacement).toEqual({
      placement: { scale: 0.5, x: 250, y: 400, rotation: 10, flipH: false, flipV: false },
      reasoning: "Centralizado",
    });
    expect(opts.setBlendMode).toHaveBeenCalledWith("multiply");
    expect(opts.setSurfaceType).toHaveBeenCalledWith("cylinder");
    expect(opts.setLogoOpacity).toHaveBeenCalledWith(80);
    expect(opts.pushAISuggestion).toHaveBeenCalledWith(expect.objectContaining({ type: "placement" }));
  });

  it("handleSuggestPlacement trata erro sem lançar", async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error("boom") });
    const opts = baseOptions();
    const { result } = renderHook(() => useMockupEditorAI(opts));
    await act(async () => { await result.current.handleSuggestPlacement(); });
    expect(result.current.isSuggestingPlacement).toBe(false);
    expect(result.current.suggestedPlacement).toBeNull();
  });

  it("handleRemoveBg atualiza logo e histórico", async () => {
    invokeMock.mockResolvedValue({
      data: { imageBase64: "data:image/png;base64,BBBB" },
      error: null,
    });
    const opts = baseOptions();
    const { result } = renderHook(() => useMockupEditorAI(opts));
    await act(async () => { await result.current.handleRemoveBg(); });
    expect(opts.pushLogoToHistory).toHaveBeenCalledWith("data:image/png;base64,BBBB");
    expect(opts.pushAISuggestion).toHaveBeenCalledWith(expect.objectContaining({ type: "remove-bg" }));
    expect(result.current.isRemovingBg).toBe(false);
  });

  it("handleRemoveBg trata erro do backend", async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error("fail") });
    const opts = baseOptions();
    const { result } = renderHook(() => useMockupEditorAI(opts));
    await act(async () => { await result.current.handleRemoveBg(); });
    expect(opts.pushLogoToHistory).not.toHaveBeenCalled();
    expect(result.current.isRemovingBg).toBe(false);
  });

  it("cancelAIRequest abre confirmação e confirmCancelAIRequest reseta estados", async () => {
    let resolveFn: (v: unknown) => void = () => {};
    invokeMock.mockImplementation(() => new Promise((res) => { resolveFn = res; }));

    const opts = baseOptions();
    const { result } = renderHook(() => useMockupEditorAI(opts));

    act(() => { void result.current.handleSuggestPlacement(); });
    await waitFor(() => expect(result.current.isSuggestingPlacement).toBe(true));

    act(() => { result.current.cancelAIRequest(); });
    expect(result.current.isCancelConfirmOpen).toBe(true);

    act(() => { result.current.confirmCancelAIRequest(); });
    expect(result.current.isCancelConfirmOpen).toBe(false);
    expect(result.current.isSuggestingPlacement).toBe(false);

    // encerra promise pendente para não vazar
    resolveFn({ data: null, error: null });
  });

  it("setSuggestedPlacement permite limpar a sugestão", async () => {
    invokeMock.mockResolvedValue({
      data: { scale: 1, xPercent: 0, yPercent: 0, rotation: 0, reasoning: "x" },
      error: null,
    });
    const { result } = renderHook(() => useMockupEditorAI(baseOptions()));
    await act(async () => { await result.current.handleSuggestPlacement(); });
    expect(result.current.suggestedPlacement).not.toBeNull();
    act(() => { result.current.setSuggestedPlacement(null); });
    expect(result.current.suggestedPlacement).toBeNull();
  });
});
