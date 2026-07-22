import { describe, it, expect } from "vitest";
import { parseOverviewPayload } from "../use-last-hour-overview";

describe("parseOverviewPayload", () => {
  it("returns safe defaults for empty input", () => {
    const p = parseOverviewPayload(null);
    expect(p.totals.maintenance_errors).toBe(0);
    expect(p.totals.alerts).toBe(0);
    expect(p.totals.ai_requests).toBe(0);
    expect(p.maintenance_errors).toEqual([]);
    expect(p.alerts).toEqual([]);
    expect(p.top_ai_features).toEqual([]);
    expect(p.ai_usage.total_cost).toBe(0);
  });

  it("coerces string numeric fields from JSONB", () => {
    const p = parseOverviewPayload({
      window_minutes: "60",
      since: "2026-07-22T00:00:00Z",
      captured_at: "2026-07-22T01:00:00Z",
      totals: { maintenance_errors: "2", alerts: "5", ai_requests: "100" },
      maintenance_errors: [],
      maintenance_errors_by_source: { snapshot_cron: 2 },
      alerts: [],
      alerts_by_type: { slo_regression: 5 },
      ai_usage: {
        requests: "100",
        total_cost: "0.4200",
        tokens_in: "1000",
        tokens_out: "2000",
      },
      top_ai_features: [{ feature_name: "mockup-ai:remove-bg", requests: 10, cost: 0.1 }],
    });
    expect(p.window_minutes).toBe(60);
    expect(p.totals.maintenance_errors).toBe(2);
    expect(p.totals.alerts).toBe(5);
    expect(p.ai_usage.total_cost).toBeCloseTo(0.42);
    expect(p.ai_usage.tokens_in).toBe(1000);
    expect(p.maintenance_errors_by_source.snapshot_cron).toBe(2);
    expect(p.top_ai_features[0].feature_name).toBe("mockup-ai:remove-bg");
  });

  it("guards against arrays being null", () => {
    const p = parseOverviewPayload({
      maintenance_errors: null,
      alerts: null,
      top_ai_features: null,
    });
    expect(p.maintenance_errors).toEqual([]);
    expect(p.alerts).toEqual([]);
    expect(p.top_ai_features).toEqual([]);
  });
});
