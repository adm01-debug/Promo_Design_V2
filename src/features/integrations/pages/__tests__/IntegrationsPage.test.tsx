import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import IntegrationsPage from "../IntegrationsPage";
import {
  summarizeOsWebhookQueue,
  useOsWebhookQueue,
  type OsWebhookEvent,
} from "../../hooks/use-os-webhook-queue";
import { useRequeueOsWebhook } from "../../hooks/use-requeue-os-webhook";

vi.mock("../../hooks/use-os-webhook-queue", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/use-os-webhook-queue")>(
    "../../hooks/use-os-webhook-queue",
  );
  return { ...actual, useOsWebhookQueue: vi.fn() };
});

vi.mock("../../hooks/use-requeue-os-webhook", () => ({
  useRequeueOsWebhook: vi.fn(),
}));

const mutate = vi.fn();

function buildEvent(overrides: Partial<OsWebhookEvent> = {}): OsWebhookEvent {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return {
    event_id: "11111111-1111-1111-1111-111111111111",
    os_id: "22222222-2222-2222-2222-222222222222",
    event: "os.updated",
    status: "pending",
    attempts: 0,
    created_at: oneHourAgo,
    next_attempt_at: oneHourAgo,
    last_error: null,
    delivered_at: null,
    os_number: "2026-0042",
    client_name: "Cliente Teste",
    ...overrides,
  };
}

function mockQueue(events: OsWebhookEvent[], isLoading = false) {
  (useOsWebhookQueue as Mock).mockReturnValue({
    data: summarizeOsWebhookQueue(events),
    isLoading,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <IntegrationsPage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("IntegrationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRequeueOsWebhook as Mock).mockReturnValue({
      mutate,
      isPending: false,
      variables: null,
    });
    mockQueue([]);
  });

  it("avisa quando a fila nao esta sendo enviada", () => {
    mockQueue([buildEvent({ last_error: "non-2xx response", attempts: 3 })]);
    renderPage();

    expect(screen.getByText("A fila nao esta sendo enviada")).toBeTruthy();
    expect(screen.getByText(/mais de 15 minutos/)).toBeTruthy();
    expect(screen.getByText("non-2xx response")).toBeTruthy();
    expect(screen.getByText("Pendente")).toBeTruthy();
  });

  it("nao avisa quando nao ha evento preso", () => {
    mockQueue([]);
    renderPage();

    expect(screen.queryByText("A fila nao esta sendo enviada")).toBeNull();
    expect(screen.getByText("Nenhum evento na fila")).toBeTruthy();
  });

  it("reprocessa o evento pelo event_id ao clicar", () => {
    const event = buildEvent();
    mockQueue([event]);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Reprocessar evento/i }));

    expect(mutate).toHaveBeenCalledWith(event.event_id);
  });

  it("mostra o numero da OS com link para a edicao", () => {
    mockQueue([buildEvent({ status: "delivered", delivered_at: new Date().toISOString() })]);
    renderPage();

    const link = screen.getByRole("link", { name: "OS 2026-0042" });
    expect(link.getAttribute("href")).toBe(
      "/mockup/service-order?edit=22222222-2222-2222-2222-222222222222",
    );
    expect(screen.getByText("Entregue")).toBeTruthy();
  });
});
