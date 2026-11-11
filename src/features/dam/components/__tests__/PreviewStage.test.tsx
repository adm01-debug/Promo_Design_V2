import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PreviewStage } from "../PreviewStage";
import type { Asset } from "../../hooks/use-assets";
import { getAssetSignedUrl } from "../../hooks/use-assets";

// jsdom does not implement Element.scrollTo — PreviewStage calls it in an effect.
if (!(Element.prototype as unknown as { scrollTo?: unknown }).scrollTo) {
  (Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
}

// Mock getAssetSignedUrl. Default = pending (loading). Tests can override per-call.
vi.mock("../../hooks/use-assets", async () => {
  const actual =
    await vi.importActual<typeof import("../../hooks/use-assets")>("../../hooks/use-assets");
  return {
    ...actual,
    getAssetSignedUrl: vi.fn(() => new Promise<string>(() => {})),
  };
});

const mockedGetSignedUrl = vi.mocked(getAssetSignedUrl);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const asset: Asset = {
  id: "a1",
  name: "img.png",
  asset_type: "photo",
  version: 1,
  width: 100,
  height: 100,
  file_size: 1234,
  mime_type: "image/png",
  file_path: "org/a1.png",
  // remaining fields are not used by PreviewStage; cast loosely.
} as unknown as Asset;

function setup() {
  const onOpenDetails = vi.fn();
  render(
    <TooltipProvider>
      <PreviewStage
        asset={asset}
        index={0}
        total={1}
        onPrev={() => {}}
        onNext={() => {}}
        onOpenDetails={onOpenDetails}
      />
    </TooltipProvider>,
  );
  return { onOpenDetails };
}

describe("PreviewStage — Detalhes durante loading da URL assinada", () => {
  it("permite acionar onOpenDetails pelo botão mesmo enquanto a URL está carregando", () => {
    const { onOpenDetails } = setup();
    // URL ainda não resolvida → estado "loading", botões Copiar/Baixar disabled.
    const copy = screen.getByRole("button", { name: /copiar url/i });
    const download = screen.getByRole("button", { name: /baixar arquivo/i });
    const details = screen.getByRole("button", { name: /abrir detalhes/i });
    expect(copy).toBeDisabled();
    expect(download).toBeDisabled();
    // Detalhes nunca depende da URL.
    expect(details).not.toBeDisabled();
    fireEvent.click(details);
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });
});

describe("PreviewStage — atalhos C/D respeitam contexto de digitação e modificadores", () => {
  function setupWithUrl() {
    const onOpenDetails = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    // Resolve URL imediatamente para habilitar atalhos C/D.
    mockedGetSignedUrl.mockImplementationOnce(() => Promise.resolve("https://signed/url"));
    render(
      <TooltipProvider>
        <PreviewStage
          asset={asset}
          index={0}
          total={1}
          onPrev={() => {}}
          onNext={() => {}}
          onOpenDetails={onOpenDetails}
        />
      </TooltipProvider>,
    );
    return { writeText };
  }

  it("não dispara C/D quando o foco está em um <input>", async () => {
    const { writeText } = setupWithUrl();
    // aguarda URL resolver (microtask) → useEffect roda
    await Promise.resolve();
    await Promise.resolve();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "c" });
    fireEvent.keyDown(input, { key: "d" });
    expect(writeText).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("não dispara C/D quando o foco está em <textarea>", async () => {
    const { writeText } = setupWithUrl();
    await Promise.resolve();
    await Promise.resolve();
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    ta.focus();
    fireEvent.keyDown(ta, { key: "c" });
    fireEvent.keyDown(ta, { key: "d" });
    expect(writeText).not.toHaveBeenCalled();
    document.body.removeChild(ta);
  });

  it("não dispara C/D quando o foco está em contentEditable", async () => {
    const { writeText } = setupWithUrl();
    await Promise.resolve();
    await Promise.resolve();
    // jsdom: forçamos isContentEditable=true diretamente já que o suporte nativo é limitado.
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    Object.defineProperty(div, "isContentEditable", { configurable: true, value: true });
    document.body.appendChild(div);
    div.focus();
    fireEvent.keyDown(div, { key: "c" });
    fireEvent.keyDown(div, { key: "d" });
    expect(writeText).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("ignora C/D combinados com modificadores (Ctrl/Meta/Alt/Shift)", async () => {
    const { writeText } = setupWithUrl();
    await Promise.resolve();
    await Promise.resolve();
    for (const mods of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
    ]) {
      fireEvent.keyDown(window, { key: "c", ...mods });
      fireEvent.keyDown(window, { key: "d", ...mods });
    }
    expect(writeText).not.toHaveBeenCalled();
  });

  it("dispara C (copiar) quando sem foco em input e sem modificadores", async () => {
    const { writeText } = setupWithUrl();
    // Espera o useEffect popular `url`
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.keyDown(window, { key: "c" });
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith("https://signed/url");
  });
});
