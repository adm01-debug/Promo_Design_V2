import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  countStuckOsWebhooks,
  useOsWebhookQueue,
  type OsWebhookEvent,
} from "../use-os-webhook-queue";

const state = vi.hoisted(() => ({
  queue: { data: [] as unknown, error: null as unknown },
  orders: { data: [] as unknown, error: null as unknown },
  tables: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      state.tables.push(table);
      const result = table === "os_webhook_queue" ? state.queue : state.orders;
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

const pendingRow = {
  event_id: "11111111-1111-1111-1111-111111111111",
  os_id: "22222222-2222-2222-2222-222222222222",
  event: "os.updated",
  status: "pending",
  attempts: 0,
  created_at: "2026-11-23T23:31:47.000Z",
  next_attempt_at: "2026-11-23T23:31:47.000Z",
  last_error: null,
  delivered_at: null,
} as const;

describe("useOsWebhookQueue", () => {
  beforeEach(() => {
    state.queue = { data: [], error: null };
    state.orders = { data: [], error: null };
    state.tables = [];
  });

  it("junta o numero da OS e o cliente em uma segunda consulta", async () => {
    state.queue = { data: [pendingRow], error: null };
    state.orders = {
      data: [
        {
          id: pendingRow.os_id,
          os_number: "2026-0042",
          client_name: "Cliente Teste",
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useOsWebhookQueue(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(state.tables).toEqual(["os_webhook_queue", "service_orders"]);
    expect(result.current.data?.events).toHaveLength(1);
    expect(result.current.data?.events?.[0].os_number).toBe("2026-0042");
    expect(result.current.data?.events?.[0].client_name).toBe("Cliente Teste");
  });

  it("nao consulta service_orders quando a fila esta vazia", async () => {
    const { result } = renderHook(() => useOsWebhookQueue(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events).toEqual([]);
    expect(result.current.data?.pending).toBe(0);
    expect(result.current.data?.stuck).toBe(0);
    expect(state.tables).toEqual(["os_webhook_queue"]);
  });

  it("propaga o erro da consulta da fila", async () => {
    state.queue = { data: null, error: new Error("sem permissao") };

    const { result } = renderHook(() => useOsWebhookQueue(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("sem permissao");
  });
});

describe("countStuckOsWebhooks", () => {
  const base: OsWebhookEvent = {
    ...pendingRow,
    os_number: null,
    client_name: null,
  };
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

  it("conta pendente antigo cuja proxima tentativa ja passou", () => {
    const events: OsWebhookEvent[] = [
      { ...base, created_at: oneHourAgo, next_attempt_at: oneHourAgo },
    ];
    expect(countStuckOsWebhooks(events, now)).toBe(1);
  });

  it("ignora evento recente, entregue ou com retry agendado", () => {
    const events: OsWebhookEvent[] = [
      {
        ...base,
        created_at: new Date(now - 60 * 1000).toISOString(),
        next_attempt_at: new Date(now - 60 * 1000).toISOString(),
      },
      { ...base, status: "delivered", created_at: oneHourAgo, next_attempt_at: oneHourAgo },
      {
        ...base,
        created_at: oneHourAgo,
        next_attempt_at: new Date(now + 60 * 60 * 1000).toISOString(),
      },
    ];
    expect(countStuckOsWebhooks(events, now)).toBe(0);
  });
});
