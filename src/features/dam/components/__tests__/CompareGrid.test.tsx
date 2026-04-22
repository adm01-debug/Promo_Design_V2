import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CompareGrid } from "../CompareGrid";
import type { Asset } from "../../hooks/use-assets";

vi.mock("../../hooks/use-assets", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/use-assets")>(
    "../../hooks/use-assets",
  );
  return {
    ...actual,
    getAssetSignedUrl: vi.fn(() => Promise.resolve("https://signed/url.png")),
  };
});

function makeAsset(id: string): Asset {
  return {
    id,
    name: `${id}.png`,
    file_path: `org/${id}.png`,
    asset_type: "photo",
    version: 1,
    width: 100,
    height: 100,
    file_size: 1000,
    mime_type: "image/png",
  } as unknown as Asset;
}

function imgTransform(): string {
  // Test the FIRST visible compare image (all share the synced transform).
  const img = document.querySelector("img") as HTMLImageElement | null;
  return img?.style.transform ?? "";
}

describe("CompareGrid — transform válido em mudanças 2↔3↔4 e ações de zoom", () => {
  it("começa em fit (translate(0,0) scale(1))", async () => {
    render(<CompareGrid assets={[makeAsset("a"), makeAsset("b")]} onRemove={() => {}} />);
    await act(async () => { await Promise.resolve(); });
    expect(imgTransform()).toBe("translate(0px, 0px) scale(1)");
  });

  it("zoom via roda + mudança de 2→3→4 assets reseta para INITIAL", async () => {
    const { rerender } = render(
      <CompareGrid assets={[makeAsset("a"), makeAsset("b")]} onRemove={() => {}} />,
    );
    await act(async () => { await Promise.resolve(); });

    // Zoom in via wheel (negative deltaY = zoom in)
    const stage = document.querySelectorAll('[role="application"]')[0] as HTMLElement;
    fireEvent.wheel(stage, { deltaY: -500 });
    expect(imgTransform()).not.toBe("translate(0px, 0px) scale(1)");

    // 2 → 3 assets
    rerender(
      <CompareGrid
        assets={[makeAsset("a"), makeAsset("b"), makeAsset("c")]}
        onRemove={() => {}}
      />,
    );
    await act(async () => { await Promise.resolve(); });
    expect(imgTransform()).toBe("translate(0px, 0px) scale(1)");

    // pan via teclado
    const stage2 = document.querySelectorAll('[role="application"]')[0] as HTMLElement;
    stage2.focus();
    fireEvent.keyDown(stage2, { key: "ArrowLeft" });
    expect(imgTransform()).not.toBe("translate(0px, 0px) scale(1)");

    // 3 → 4 assets
    rerender(
      <CompareGrid
        assets={[makeAsset("a"), makeAsset("b"), makeAsset("c"), makeAsset("d")]}
        onRemove={() => {}}
      />,
    );
    await act(async () => { await Promise.resolve(); });
    expect(imgTransform()).toBe("translate(0px, 0px) scale(1)");

    // 4 → 2 assets
    rerender(<CompareGrid assets={[makeAsset("a"), makeAsset("b")]} onRemove={() => {}} />);
    await act(async () => { await Promise.resolve(); });
    expect(imgTransform()).toBe("translate(0px, 0px) scale(1)");
  });

  it("Reset, Ajustar e 100% sempre produzem um transform válido", async () => {
    render(<CompareGrid assets={[makeAsset("a"), makeAsset("b")]} onRemove={() => {}} />);
    await act(async () => { await Promise.resolve(); });

    // Mexe no transform
    const stage = document.querySelectorAll('[role="application"]')[0] as HTMLElement;
    fireEvent.wheel(stage, { deltaY: -800 });
    stage.focus();
    fireEvent.keyDown(stage, { key: "ArrowDown" });
    fireEvent.keyDown(stage, { key: "ArrowDown" });
    expect(imgTransform()).not.toBe("translate(0px, 0px) scale(1)");

    // 100%
    fireEvent.click(screen.getByRole("button", { name: /100%/i }));
    expect(imgTransform()).toBe("translate(0px, 0px) scale(1)");

    // Mexe de novo
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(imgTransform()).not.toBe("translate(0px, 0px) scale(1)");

    // Ajustar
    fireEvent.click(screen.getByRole("button", { name: /^ajustar$/i }));
    expect(imgTransform()).toBe("translate(0px, 0px) scale(1)");

    // Mexe de novo
    fireEvent.wheel(stage, { deltaY: -200 });
    expect(imgTransform()).not.toBe("translate(0px, 0px) scale(1)");

    // Reset
    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(imgTransform()).toBe("translate(0px, 0px) scale(1)");
  });
});