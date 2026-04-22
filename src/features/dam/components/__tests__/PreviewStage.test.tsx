import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PreviewStage } from "../PreviewStage";
import type { Asset } from "../../hooks/use-assets";

// Keep getAssetSignedUrl pending so the component stays in "loading" state.
vi.mock("../../hooks/use-assets", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/use-assets")>(
    "../../hooks/use-assets",
  );
  return {
    ...actual,
    getAssetSignedUrl: vi.fn(() => new Promise<string>(() => {})),
  };
});

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