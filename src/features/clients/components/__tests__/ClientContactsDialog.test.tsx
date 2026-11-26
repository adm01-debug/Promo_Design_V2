import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClientContactsDialog from "../ClientContactsDialog";
import type { Client } from "../../hooks/use-clients";

// A tabela client_contacts existe no banco desde o inicio, mas nunca teve tela.
// Estes testes cobrem os estados da tela nova: vazio, lista, criacao e erro.
const mocks = vi.hoisted(() => ({
  addMutate: vi.fn(() => Promise.resolve({})),
  updateMutate: vi.fn(() => Promise.resolve(undefined)),
  deleteMutate: vi.fn(() => Promise.resolve(undefined)),
  setPrimaryMutate: vi.fn(() => Promise.resolve(undefined)),
  toast: vi.fn(),
  state: {
    contacts: [] as Array<Record<string, unknown>>,
    isLoading: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

vi.mock("../../hooks/use-client-contacts", () => ({
  useClientContacts: () => ({
    contacts: mocks.state.contacts,
    isLoading: mocks.state.isLoading,
    isError: mocks.state.isError,
    error: mocks.state.error,
    addContact: { mutateAsync: mocks.addMutate, isPending: false },
    updateContact: { mutateAsync: mocks.updateMutate, isPending: false },
    setPrimary: { mutateAsync: mocks.setPrimaryMutate, isPending: false },
    deleteContact: { mutateAsync: mocks.deleteMutate, isPending: false },
  }),
}));

const client = { id: "c1", name: "ACME" } as unknown as Client;

// O Checkbox (Radix) mede o elemento e exige ResizeObserver, que o jsdom nao implementa.
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const renderDialog = (canEdit = true) =>
  render(
    <ClientContactsDialog
      client={client}
      organizationId="org-1"
      canEdit={canEdit}
      onOpenChange={vi.fn()}
    />,
  );

describe("ClientContactsDialog", () => {
  beforeEach(() => {
    mocks.state.contacts = [];
    mocks.state.isLoading = false;
    mocks.state.isError = false;
    mocks.state.error = null;
    mocks.addMutate.mockClear();
    mocks.setPrimaryMutate.mockClear();
    mocks.toast.mockClear();
  });

  it("mostra o estado vazio quando o cliente nao tem contatos", () => {
    renderDialog();
    expect(screen.getByText("Nenhum contato cadastrado neste cliente.")).toBeInTheDocument();
  });

  it("lista os contatos e destaca o principal", () => {
    mocks.state.contacts = [
      {
        id: "k1",
        name: "Maria",
        role: "Compras",
        email: "maria@acme.com",
        phone: "11 90000-0000",
        is_primary: true,
      },
      {
        id: "k2",
        name: "Joao",
        role: null,
        email: null,
        phone: null,
        is_primary: false,
      },
    ];
    renderDialog();

    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText("Compras")).toBeInTheDocument();
    expect(screen.getByText("Principal")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Marcar Joao como principal"));
    expect(mocks.setPrimaryMutate).toHaveBeenCalledWith("k2");
  });

  it("cria um contato novo a partir do formulario", async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText("Nome *"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Cargo"), { target: { value: "Marketing" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar contato/i }));

    await waitFor(() =>
      expect(mocks.addMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Ana", role: "Marketing" }),
      ),
    );
  });

  it("nao mostra o formulario para quem so pode visualizar", () => {
    renderDialog(false);
    expect(screen.queryByLabelText("Nome *")).not.toBeInTheDocument();
  });

  it("mostra o erro em vez do estado vazio quando a consulta falha", () => {
    mocks.state.isError = true;
    mocks.state.error = new Error("permission denied for table client_contacts");
    renderDialog();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Não foi possível carregar os contatos")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum contato cadastrado neste cliente.")).not.toBeInTheDocument();
  });
});
