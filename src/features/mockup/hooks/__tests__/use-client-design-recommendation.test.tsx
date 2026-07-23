import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useClientDesignRecommendation } from "../use-client-design-recommendation";

// Chainable query mock
type MockRow = {
  logo_x_percent_p50: number | null;
  logo_y_percent_p50: number | null;
  logo_scale_p50: number | null;
  opacity_p50: number | null;
  preferred_blend_modes: Record<string, number>;
  preferred_surface_types: Record<string, number>;
  sample_size: number;
  confidence: number;
} | null;

let clientRow: MockRow = null;
let orgRow: MockRow = null;

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: () => {
        const filters: { client_id?: string | null; org_id?: string } = {};
        const chain = {
          select: () => chain,
          eq: (col: string, val: string) => {
            if (col === "client_id") filters.client_id = val;
            if (col === "organization_id") filters.org_id = val;
            return chain;
          },
          is: (col: string, val: null) => {
            if (col === "client_id") filters.client_id = val;
            return chain;
          },
          maybeSingle: async () => {
            const isClient = typeof filters.client_id === "string";
            return { data: isClient ? clientRow : orgRow, error: null };
          },
        };
        return chain;
      },
    },
  };
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  clientRow = null;
  orgRow = null;
});

describe("useClientDesignRecommendation", () => {
  it("returns source='none' when nothing available", async () => {
    const { result } = renderHook(
      () => useClientDesignRecommendation("org-1", "client-1"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.source).toBe("none");
    expect(result.current.data?.confidence).toBe(0);
  });

  it("prefers client-level pattern when present", async () => {
    clientRow = {
      logo_x_percent_p50: 50,
      logo_y_percent_p50: 30,
      logo_scale_p50: 0.35,
      opacity_p50: 90,
      preferred_blend_modes: { multiply: 0.7, normal: 0.3 },
      preferred_surface_types: { tshirt: 0.9 },
      sample_size: 12,
      confidence: 0.85,
    };
    orgRow = null;
    const { result } = renderHook(
      () => useClientDesignRecommendation("org-1", "client-1"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.source).toBe("client");
    expect(result.current.data?.placement).toEqual({ x: 0.5, y: 0.3, scale: 0.35 });
    expect(result.current.data?.opacity).toBeCloseTo(0.9);
    expect(result.current.data?.suggestedBlendMode).toBe("multiply");
    expect(result.current.data?.suggestedSurfaceType).toBe("tshirt");
    expect(result.current.data?.confidence).toBe(0.85);
    expect(result.current.data?.sampleSize).toBe(12);
  });

  it("falls back to organization pattern when no client pattern", async () => {
    clientRow = null;
    orgRow = {
      logo_x_percent_p50: 60,
      logo_y_percent_p50: 40,
      logo_scale_p50: 0.4,
      opacity_p50: null,
      preferred_blend_modes: { normal: 1 },
      preferred_surface_types: {},
      sample_size: 200,
      confidence: 0.5,
    };
    const { result } = renderHook(
      () => useClientDesignRecommendation("org-1", "client-1"),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.source).toBe("organization");
    expect(result.current.data?.placement?.x).toBeCloseTo(0.6);
    expect(result.current.data?.suggestedBlendMode).toBe("normal");
    expect(result.current.data?.suggestedSurfaceType).toBeUndefined();
  });

  it("does not run when organizationId is null", () => {
    const { result } = renderHook(
      () => useClientDesignRecommendation(null, "client-1"),
      { wrapper },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("skips client lookup when clientId is null", async () => {
    clientRow = { // would incorrectly match if code queried client
      logo_x_percent_p50: 10, logo_y_percent_p50: 10, logo_scale_p50: 0.1,
      opacity_p50: null, preferred_blend_modes: {}, preferred_surface_types: {},
      sample_size: 0, confidence: 0,
    };
    orgRow = {
      logo_x_percent_p50: 60, logo_y_percent_p50: 40, logo_scale_p50: 0.4,
      opacity_p50: null, preferred_blend_modes: {}, preferred_surface_types: {},
      sample_size: 5, confidence: 0.3,
    };
    const { result } = renderHook(
      () => useClientDesignRecommendation("org-1", null),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.source).toBe("organization");
    expect(result.current.data?.placement?.scale).toBeCloseTo(0.4);
  });
});
