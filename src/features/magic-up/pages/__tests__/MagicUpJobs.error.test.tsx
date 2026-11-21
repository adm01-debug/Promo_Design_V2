import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MagicUpJobs from "../MagicUpJobs";

// Estado de erro da fila: antes da correcao a pagina mostrava "Nenhum job
// ainda" quando a query falhava (ex.: migration nao aplicada), escondendo a
// falha de infraestrutura.
const mockState = { isError: true, error: new Error("relation does not exist") as Error | null };

vi.mock("@/features/magic-up", async () => {
  const actual = await vi.importActual<typeof import("@/features/magic-up")>("@/features/magic-up");
  return {
    ...actual,
    useMagicUpJobs: () => ({
      jobs: [],
      isLoading: false,
      isError: mockState.isError,
      error: mockState.error,
      styleLabels: {},
      enqueueBatch: { mutate: vi.fn(), isPending: false },
      cancelJob: { mutate: vi.fn(), isPending: false },
    }),
    useMagicUpStyles: () => ({ styles: [], isLoading: false, isError: false, error: null }),
  };
});

describe("MagicUpJobs - estado de erro", () => {
  it("mostra o erro em vez de 'Nenhum job ainda' quando a query falha", () => {
    render(
      <MemoryRouter>
        <MagicUpJobs />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Não foi possível carregar a fila")).toBeInTheDocument();
    expect(screen.getByText("relation does not exist")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum job ainda")).not.toBeInTheDocument();
  });
});
