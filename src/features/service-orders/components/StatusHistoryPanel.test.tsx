import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusHistoryPanel from "./StatusHistoryPanel";

// A tabela status_audit_log existe desde a primeira migration e a trigger
// log_status_change grava cada mudanca de status, mas nunca houve tela.
const mocks = vi.hoisted(() => ({
  state: {
    data: [] as Array<Record<string, unknown>>,
    isLoading: false,
    isError: false,
  },
  userId: "user-1",
}));

vi.mock("../hooks/use-status-history", () => ({
  useStatusHistory: () => mocks.state,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: mocks.userId } }),
}));

const entry = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  service_order_id: "os-1",
  user_id: "user-1",
  old_status: "aberta",
  new_status: "aprovada",
  changed_at: "2026-11-26T10:00:00.000Z",
  ...over,
});

describe("StatusHistoryPanel", () => {
  beforeEach(() => {
    mocks.state.data = [];
    mocks.state.isLoading = false;
    mocks.state.isError = false;
    mocks.userId = "user-1";
  });

  it("mostra estado vazio quando nao ha registros", () => {
    render(<StatusHistoryPanel serviceOrderId="os-1" />);
    expect(screen.getByText(/Nenhuma mudança de status/)).toBeInTheDocument();
  });

  it("mostra loading", () => {
    mocks.state.isLoading = true;
    render(<StatusHistoryPanel serviceOrderId="os-1" />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando histórico");
  });

  it("mostra erro", () => {
    mocks.state.isError = true;
    render(<StatusHistoryPanel serviceOrderId="os-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
  });

  it("traduz os status e marca a autoria", () => {
    mocks.state.data = [
      entry(),
      entry({ id: "a2", old_status: null, new_status: "em_producao", user_id: "user-2" }),
    ];
    render(<StatusHistoryPanel serviceOrderId="os-1" />);

    expect(screen.getByText("Aberta")).toBeInTheDocument();
    expect(screen.getByText("Aprovada")).toBeInTheDocument();
    expect(screen.getByText("Em Produção")).toBeInTheDocument();
    expect(screen.getByText("Criação")).toBeInTheDocument();
    expect(screen.getByText("Você")).toBeInTheDocument();
    expect(screen.getByText("Outro usuário")).toBeInTheDocument();
  });

  it("cai no codigo cru quando o status e desconhecido", () => {
    mocks.state.data = [entry({ old_status: "status_legado" })];
    render(<StatusHistoryPanel serviceOrderId="os-1" />);
    expect(screen.getByText("status_legado")).toBeInTheDocument();
  });
});
