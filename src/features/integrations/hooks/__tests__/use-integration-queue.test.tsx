import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  countStuckIntegrationEvents,
  summarizeIntegrationQueue,
  useIntegrationQueue,
  type IntegrationQueueEvent,
} from "../use-integration-queue";

const state = vi.hoisted(() => ({
  queue: { data: [] as unknown, error: null as unknown },
  orders: { data: [] as unknown, error: null as unknown },
  designs: { data: [] as unknown, error: null as unknown },
  tables: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      state.tables.push(table);
      const result =
        table === "integration_queue"
          ? state.queue
          : table === "service_orders"
            ? state.orders
            : state.designs;
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      for (const method of ["select", "order", "limit", "eq", "in"]) {
        builder[method] = () => chain();
      }
      builder.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve);
      return builder;
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const osRow = {
  event_id: "11111111-1111-1111-1111-111111111111",
  entity: "service_order",
  entity_id: "22222222-2222-2222-2222-222222222222",
  event: "os.closed",
  destination: "fast_gravacoes",
  status: "pending",
  attempts: 0,
  created_at: "2026-11-24T10:06:11.000Z",
  next_attempt_at: "2026-11-24T10:06:11.000Z",
  last_error: null,
  delivered_at: null,
  fg_technique_id: "thermal-press",
} as const;

const designRow = {
  ...osRow,
  event_id: "33333333-3333-3333-3333-333333333333",
  entity: "design",
  entity_id: "44444444-4444-4444-4444-444444444444",
  event: "design.created",
  destination: "champions",
} as const;

describe("useIntegrationQueue", () => {
  beforeEach(() => {
    state.queue = { data: [], error: null };
    state.orders = { data: [], error: null };
    state.designs = { data: [], error: null };
    state.tables = [];
  });

  it("resolve a origem de OS e de design em consultas separadas", async () => {
    state.queue = { data: [osRow, designRow], error: null };
    state.orders = {
      data: [{ id: osRow.entity_id, os_number: "2026-0042", client_name: "Cliente Teste" }],
      error: null,
    };
    state.designs = {
      data: [{ id: designRow.entity_id, name: "Caneca Verde", product_sku: "SKU-1" }],
      error: null,
    };

    const { result } = renderHook(() => useIntegrationQueue(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(state.tables).toEqual(["integration_queue", "service_orders", "mockup_drafts"]);

    const events = result.current.data?.events ?? [];
    expect(events[0].reference).toBe("OS 2026-0042");
    expect(events[0].detail).toBe("Cliente Teste");
    expect(events[1].reference).toBe("Caneca Verde");
    expect(events[1].detail).toBe("SKU-1");
  });

  it("nao consulta as origens quando a fila esta vazia", async () => {
    const { result } = renderHook(() => useIntegrationQueue(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(state.tables).toEqual(["integration_queue"]);
    expect(result.current.data?.pending).toBe(0);
    expect(result.current.data?.unmappedTechnique).toBe(0);
  });

  it("propaga o erro da consulta da fila", async () => {
    state.queue = { data: null, error: new Error("sem permissao") };

    const { result } = renderHook(() => useIntegrationQueue(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("sem permissao");
  });
});

describe("contadores da fila multi-destino", () => {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

  function build(overrides: Partial<IntegrationQueueEvent> = {}): IntegrationQueueEvent {
    return {
      ...osRow,
      reference: null,
      detail: null,
      created_at: oneHourAgo,
      next_attempt_at: oneHourAgo,
      ...overrides,
    } as IntegrationQueueEvent;
  }

  it("conta preso, ignorado e tecnica sem mapeamento", () => {
    const summary = summarizeIntegrationQueue(
      [
        build(),
        build({ event_id: "a", status: "skipped" }),
        build({ event_id: "b", destination: "supply", fg_technique_id: null }),
        build({ event_id: "c", destination: "fast_gravacoes", fg_technique_id: null }),
        build({ event_id: "d", status: "delivered", fg_technique_id: null }),
      ],
      now,
    );

    // Tres seguem pendentes com a proxima tentativa ja vencida (o skipped nao
    // conta: nao esta mais na fila) e so um deles e do Fast Gravacoes sem mapa.
    expect(summary.stuck).toBe(3);
    expect(summary.skipped).toBe(1);
    expect(summary.delivered).toBe(1);
    // Só o evento do Fast Gravacoes não entregue conta como tecnica sem mapa.
    expect(summary.unmappedTechnique).toBe(1);
  });

  it("ignora evento recente com retry agendado no futuro", () => {
    const events = [
      build({
        created_at: new Date(now - 60 * 1000).toISOString(),
        next_attempt_at: new Date(now - 60 * 1000).toISOString(),
      }),
      build({ next_attempt_at: new Date(now + 60 * 60 * 1000).toISOString() }),
    ];
    expect(countStuckIntegrationEvents(events, now)).toBe(0);
  });
});
