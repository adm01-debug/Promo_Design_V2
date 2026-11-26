import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IntegrationQueueTab } from "../IntegrationQueueTab";
import {
  summarizeIntegrationQueue,
  useIntegrationQueue,
  type IntegrationQueueEvent,
} from "../../hooks/use-integration-queue";
import { useRequeueIntegrationEvent } from "../../hooks/use-requeue-integration-event";
import {
  useDeleteTechniqueMapEntry,
  useSaveTechniqueMapEntry,
  useTechniqueMap,
} from "../../hooks/use-technique-map";

const { canMock, saveMutate, deleteMutate } = vi.hoisted(() => ({
  canMock: vi.fn(),
  saveMutate: vi.fn(),
  deleteMutate: vi.fn(),
}));

vi.mock("@/hooks/use-organization", () => ({
  useOrganizations: () => ({ currentOrgId: "org-1", can: canMock }),
}));

vi.mock("../../hooks/use-integration-queue", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/use-integration-queue")>(
    "../../hooks/use-integration-queue",
  );
  return { ...actual, useIntegrationQueue: vi.fn() };
});

vi.mock("../../hooks/use-requeue-integration-event", () => ({
  useRequeueIntegrationEvent: vi.fn(),
}));

vi.mock("../../hooks/use-technique-map", () => ({
  useTechniqueMap: vi.fn(),
  useSaveTechniqueMapEntry: vi.fn(),
  useDeleteTechniqueMapEntry: vi.fn(),
}));

const mutate = vi.fn();

function buildEvent(overrides: Partial<IntegrationQueueEvent> = {}): IntegrationQueueEvent {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return {
    event_id: "11111111-1111-1111-1111-111111111111",
    entity: "service_order",
    entity_id: "22222222-2222-2222-2222-222222222222",
    event: "os.closed",
    destination: "supply",
    status: "pending",
    attempts: 0,
    created_at: oneHourAgo,
    next_attempt_at: oneHourAgo,
    last_error: null,
    delivered_at: null,
    reference: "OS 2026-0042",
    detail: "Cliente Teste",
    fg_technique_id: "thermal-press",
    technique: "Sublimacao - Caneca",
    ...overrides,
  };
}

function mockQueue(events: IntegrationQueueEvent[], isLoading = false) {
  (useIntegrationQueue as Mock).mockReturnValue({
    data: summarizeIntegrationQueue(events),
    isLoading,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  });
}

function mockTechniqueMap(
  entries: { promo_technique: string; fg_technique_id: string; updated_at: string }[] = [],
) {
  (useTechniqueMap as Mock).mockReturnValue({
    data: entries,
    isLoading: false,
    isError: false,
    error: null,
  });
}

function renderTab() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <IntegrationQueueTab />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

function fieldValue(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

describe("IntegrationQueueTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canMock.mockReturnValue(true);
    (useRequeueIntegrationEvent as Mock).mockReturnValue({
      mutate,
      isPending: false,
      variables: null,
    });
    (useSaveTechniqueMapEntry as Mock).mockReturnValue({
      mutate: saveMutate,
      isPending: false,
      variables: null,
    });
    (useDeleteTechniqueMapEntry as Mock).mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
      variables: null,
    });
    mockQueue([]);
    mockTechniqueMap();
  });

  it("avisa quando a fila nao esta sendo enviada", () => {
    mockQueue([buildEvent({ last_error: "destino supply sem configuracao", attempts: 2 })]);
    renderTab();

    expect(screen.getByText("A fila nao esta sendo enviada")).toBeTruthy();
    expect(screen.getByText("destino supply sem configuracao")).toBeTruthy();
    expect(screen.getByText("Promo Supply")).toBeTruthy();
  });

  it("avisa quando a tecnica nao esta mapeada para o Fast Gravacoes", () => {
    mockQueue([buildEvent({ destination: "fast_gravacoes", fg_technique_id: null })]);
    renderTab();

    expect(screen.getByText("Tecnica sem mapeamento para o Fast Gravacoes")).toBeTruthy();
    expect(screen.getByText("Tecnica nao mapeada")).toBeTruthy();
  });

  it("reprocessa o evento pelo event_id ao clicar", () => {
    const event = buildEvent();
    mockQueue([event]);
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: /Reprocessar evento/i }));

    expect(mutate).toHaveBeenCalledWith(event.event_id);
  });

  it("mostra o mapa de tecnicas e o link do design no editor", () => {
    mockQueue([
      buildEvent({
        entity: "design",
        entity_id: "44444444-4444-4444-4444-444444444444",
        event: "design.created",
        destination: "champions",
        status: "delivered",
        reference: "Caneca Verde",
        detail: "SKU-1",
      }),
    ]);
    mockTechniqueMap([
      {
        promo_technique: "sublimacao caneca",
        fg_technique_id: "sublimation-mug",
        updated_at: new Date().toISOString(),
      },
    ]);
    renderTab();

    const link = screen.getByRole("link", { name: "Caneca Verde" });
    expect(link.getAttribute("href")).toBe(
      "/mockup/editor?id=44444444-4444-4444-4444-444444444444",
    );
    expect(screen.getByText("Design criado")).toBeTruthy();
    expect(screen.getByText("Promo Champions")).toBeTruthy();
    expect(screen.getByText("sublimacao caneca")).toBeTruthy();
    expect(screen.getByText("sublimation-mug")).toBeTruthy();
  });

  it("mostra o vazio quando nao ha evento", () => {
    renderTab();

    expect(screen.getByText("Nenhum evento na fila")).toBeTruthy();
    expect(screen.getByText("Nenhuma tecnica mapeada")).toBeTruthy();
  });

  it("mapeia a tecnica que falta direto da fila, ja com a tecnica da OS", () => {
    mockQueue([
      buildEvent({
        destination: "fast_gravacoes",
        fg_technique_id: null,
        technique: "Tecnica Nova",
      }),
    ]);
    renderTab();

    expect(screen.getByText('"Tecnica Nova"')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mapear a tecnica Tecnica Nova/i }));

    expect(fieldValue("Tecnica na ordem de servico")).toBe("Tecnica Nova");
    fireEvent.change(screen.getByLabelText("Tecnica no Fast Gravacoes"), {
      target: { value: "laser" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar mapeamento" }));

    expect(saveMutate).toHaveBeenCalledWith(
      {
        values: { promoTechnique: "Tecnica Nova", fgTechniqueId: "laser" },
        originalTechnique: null,
      },
      expect.any(Object),
    );
  });

  it("edita um mapeamento existente mantendo a chave atual", () => {
    mockTechniqueMap([
      {
        promo_technique: "laser co2",
        fg_technique_id: "laser",
        updated_at: new Date().toISOString(),
      },
    ]);
    renderTab();

    expect(screen.getByRole("button", { name: "Novo mapeamento" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar mapeamento da tecnica laser co2" }));

    expect(fieldValue("Tecnica no Fast Gravacoes")).toBe("laser");
    fireEvent.change(screen.getByLabelText("Tecnica no Fast Gravacoes"), {
      target: { value: "uv" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar mapeamento" }));

    expect(saveMutate).toHaveBeenCalledWith(
      {
        values: { promoTechnique: "laser co2", fgTechniqueId: "uv" },
        originalTechnique: "laser co2",
      },
      expect.any(Object),
    );
  });

  it("exclui o mapeamento somente depois de confirmar", () => {
    mockTechniqueMap([
      {
        promo_technique: "laser co2",
        fg_technique_id: "laser",
        updated_at: new Date().toISOString(),
      },
    ]);
    renderTab();

    fireEvent.click(
      screen.getByRole("button", { name: "Excluir mapeamento da tecnica laser co2" }),
    );

    expect(deleteMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Excluir mapeamento" }));

    expect(deleteMutate).toHaveBeenCalledWith("laser co2", expect.any(Object));
  });

  it("nao mostra a manutencao do mapa para quem nao e owner nem admin", () => {
    canMock.mockReturnValue(false);
    mockTechniqueMap([
      {
        promo_technique: "laser co2",
        fg_technique_id: "laser",
        updated_at: new Date().toISOString(),
      },
    ]);
    mockQueue([
      buildEvent({
        destination: "fast_gravacoes",
        fg_technique_id: null,
        technique: "Tecnica Nova",
      }),
    ]);
    renderTab();

    expect(screen.queryByRole("button", { name: "Novo mapeamento" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Editar mapeamento/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Mapear a tecnica/ })).toBeNull();
    expect(screen.getByText("laser co2")).toBeTruthy();
  });
});
