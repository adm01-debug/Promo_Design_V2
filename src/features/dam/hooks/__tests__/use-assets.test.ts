import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

type TerminalResult = { data: unknown; error: unknown; count?: number };

let terminalResult: TerminalResult = { data: [], error: null, count: 0 };
let rpcResult: TerminalResult = { data: [], error: null };

const selectSpy = vi.fn();
const eqSpy = vi.fn();
const inSpy = vi.fn();
const containsSpy = vi.fn();
const overlapsSpy = vi.fn();
const orSpy = vi.fn();
const orderSpy = vi.fn();
const rangeSpy = vi.fn();
const fromSpy = vi.fn();
const rpcSpy = vi.fn();

function makeBuilder() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = (...args: unknown[]) => {
    selectSpy(...args);
    return chain();
  };
  builder.eq = (...args: unknown[]) => {
    eqSpy(...args);
    return chain();
  };
  builder.in = (...args: unknown[]) => {
    inSpy(...args);
    return chain();
  };
  builder.contains = (...args: unknown[]) => {
    containsSpy(...args);
    return chain();
  };
  builder.overlaps = (...args: unknown[]) => {
    overlapsSpy(...args);
    return chain();
  };
  builder.or = (...args: unknown[]) => {
    orSpy(...args);
    return chain();
  };
  builder.range = (...args: unknown[]) => {
    rangeSpy(...args);
    return chain();
  };
  // order is the terminal awaited point in our hook (sortBy is always set, then chain continues).
  // Make the builder thenable so awaiting it resolves with terminalResult.
  builder.order = (...args: unknown[]) => {
    orderSpy(...args);
    return chain();
  };
  // Make the whole builder awaitable
  (builder as { then?: unknown }).then = (resolve: (v: TerminalResult) => void) => {
    resolve(terminalResult);
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => {
      fromSpy(...args);
      return makeBuilder();
    },
    rpc: (...args: unknown[]) => {
      rpcSpy(...args);
      return Promise.resolve(rpcResult);
    },
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

import { useAssets } from "../use-assets";

function renderUseAssets(filters: Parameters<typeof useAssets>[1]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return renderHook(() => useAssets("org1", filters), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  terminalResult = { data: [], error: null, count: 0 };
  rpcResult = { data: [], error: null };
});

describe("useAssets — tagsMode", () => {
  it("uses .contains when tagsMode is 'all'", async () => {
    terminalResult = { data: [{ id: "a1" }, { id: "a2" }], error: null, count: 2 };
    const { result } = renderUseAssets({ tags: ["promo", "verao"], tagsMode: "all" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(containsSpy).toHaveBeenCalledWith("tags", ["promo", "verao"]);
    expect(overlapsSpy).not.toHaveBeenCalled();
    expect(result.current.total).toBe(2);
  });

  it("uses .overlaps when tagsMode is 'any'", async () => {
    terminalResult = {
      data: [{ id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }, { id: "a5" }],
      error: null,
      count: 5,
    };
    const { result } = renderUseAssets({ tags: ["promo", "verao"], tagsMode: "any" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(overlapsSpy).toHaveBeenCalledWith("tags", ["promo", "verao"]);
    expect(containsSpy).not.toHaveBeenCalled();
    expect(result.current.total).toBe(5);
  });
});

describe("useAssets — relevance sorting", () => {
  it("calls search_assets_ranked RPC when sortBy='relevance' and search >= 3 chars", async () => {
    rpcResult = {
      data: [
        {
          id: "a1",
          organization_id: "org1",
          name: "logo azul",
          total_count: 3,
          rank: 0.9,
        },
      ],
      error: null,
    };
    const { result } = renderUseAssets({
      search: "logo azul",
      sortBy: "relevance",
      clientId: "c1",
      tags: ["promo"],
      tagsMode: "any",
      assetTypes: ["logo"],
      page: 1,
      pageSize: 24,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    const [fnName, args] = rpcSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(fnName).toBe("search_assets_ranked");
    expect(args).toMatchObject({
      _org_id: "org1",
      _query: "logo azul",
      _client_id: "c1",
      _tags: ["promo"],
      _tags_mode: "any",
      _asset_types: ["logo"],
      _limit: 24,
      _offset: 0,
      _include_archived: false,
    });
    expect(fromSpy).not.toHaveBeenCalled();
    expect(result.current.total).toBe(3);
  });

  it("falls back to builder (no RPC) when search has < 3 chars", async () => {
    terminalResult = { data: [], error: null, count: 0 };
    const { result } = renderUseAssets({ search: "ab", sortBy: "relevance" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(rpcSpy).not.toHaveBeenCalled();
    expect(fromSpy).toHaveBeenCalledWith("assets");
    expect(orderSpy).toHaveBeenCalled();
    const [col] = orderSpy.mock.calls[0] as [string, unknown];
    expect(col).toBe("created_at");
  });

  it("falls back to builder (no RPC) when sortBy='relevance' but search is empty", async () => {
    terminalResult = { data: [], error: null, count: 0 };
    const { result } = renderUseAssets({ sortBy: "relevance" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(rpcSpy).not.toHaveBeenCalled();
    expect(fromSpy).toHaveBeenCalledWith("assets");
    const [col] = (orderSpy.mock.calls[0] ?? []) as [string, unknown];
    expect(col).toBe("created_at");
  });
});

// Silence "unused" warning for the Mock type alias if linter is strict.
export type _M = Mock;
