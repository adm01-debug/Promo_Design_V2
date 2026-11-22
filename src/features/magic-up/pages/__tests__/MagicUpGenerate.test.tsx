import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MagicUpGenerate from "../MagicUpGenerate";

// ---- Mocks ----------------------------------------------------------------

const mutate = vi.fn();

vi.mock("@/features/magic-up", async () => {
  const actual = await vi.importActual<typeof import("@/features/magic-up")>("@/features/magic-up");
  return {
    ...actual,
    useMagicUpJobs: () => ({
      jobs: [],
      isLoading: false,
      isError: false,
      error: null,
      styleLabels: {},
      enqueueBatch: { mutate, isPending: false },
      cancelJob: { mutate: vi.fn() },
    }),
    useMagicUpStyles: () => ({ styles: [], isLoading: false }),
  };
});

vi.mock("@/features/mockup", async () => {
  const actual = await vi.importActual<typeof import("@/features/mockup")>("@/features/mockup");
  return {
    ...actual,
    useProducts: () => ({ data: { products: [], total: 0 }, isLoading: false }),
    useCategories: () => ({ data: [] }),
    useProductVariants: () => ({ data: [] }),
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <MagicUpGenerate />
    </MemoryRouter>,
  );

// ---- Tests ----------------------------------------------------------------

describe("MagicUpGenerate — geração real", () => {
  beforeEach(() => {
    mutate.mockClear();
  });

  it("o botão Gerar enfileira no backend em vez de simular", () => {
    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText("Descreva a imagem publicitária que você deseja gerar..."),
      { target: { value: "caneca premium em fundo escuro" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /^Gerar$/ }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const [input] = mutate.mock.calls[0];
    expect(input.prompt).toBe("caneca premium em fundo escuro");
    // Geração individual usa exatamente o estilo selecionado.
    expect(input.styles).toEqual(["premium"]);
  });

  it("o botão Gerar lote enfileira as 4 variações", () => {
    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText("Descreva a imagem publicitária que você deseja gerar..."),
      { target: { value: "kit corporativo" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Gerar lote/ }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const [input] = mutate.mock.calls[0];
    expect(input.styles).toEqual(["premium", "lifestyle", "flatlay", "minimal"]);
  });

  it("nunca grava imagem placeholder no histórico", async () => {
    renderPage();

    fireEvent.change(
      screen.getByPlaceholderText("Descreva a imagem publicitária que você deseja gerar..."),
      { target: { value: "caneca" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /^Gerar$/ }));

    await waitFor(() => expect(mutate).toHaveBeenCalled());
    const payload = JSON.stringify(mutate.mock.calls[0]);
    expect(payload).not.toContain("placeholder.svg");
  });
});
