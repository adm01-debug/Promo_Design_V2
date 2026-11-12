import { describe, it, expect } from "vitest";
import {
  buildServiceOrderListParams,
  parseServiceOrderListParams,
  hasActiveFilters,
  toDateRangeIso,
  type ServiceOrderListState,
} from "@/features/service-orders/lib/list-url-state";

const DEFAULT_STATE: ServiceOrderListState = {
  search: "",
  statusFilter: "all",
  sortDesc: true,
  page: 1,
  productQuery: "",
  dateFrom: undefined,
  dateTo: undefined,
};

describe("buildServiceOrderListParams", () => {
  it("emits empty search string for default state", () => {
    expect(buildServiceOrderListParams(DEFAULT_STATE).toString()).toBe("");
  });

  it("omits page when page = 1", () => {
    const p = buildServiceOrderListParams({ ...DEFAULT_STATE, page: 1 });
    expect(p.has("page")).toBe(false);
  });

  it("includes page when > 1", () => {
    expect(buildServiceOrderListParams({ ...DEFAULT_STATE, page: 3 }).get("page")).toBe("3");
  });

  it("trims whitespace-only search into no `q`", () => {
    expect(buildServiceOrderListParams({ ...DEFAULT_STATE, search: "   " }).has("q")).toBe(false);
  });

  it("trims a real search term before storing", () => {
    expect(buildServiceOrderListParams({ ...DEFAULT_STATE, search: "  acme  " }).get("q")).toBe(
      "acme",
    );
  });

  it("omits `sort` when descending (the default)", () => {
    expect(buildServiceOrderListParams({ ...DEFAULT_STATE, sortDesc: true }).has("sort")).toBe(
      false,
    );
  });

  it("adds `sort=asc` when ascending", () => {
    expect(buildServiceOrderListParams({ ...DEFAULT_STATE, sortDesc: false }).get("sort")).toBe(
      "asc",
    );
  });

  it("omits `status` when 'all'", () => {
    expect(
      buildServiceOrderListParams({ ...DEFAULT_STATE, statusFilter: "all" }).has("status"),
    ).toBe(false);
  });

  it("includes the concrete status", () => {
    expect(
      buildServiceOrderListParams({ ...DEFAULT_STATE, statusFilter: "em_producao" }).get("status"),
    ).toBe("em_producao");
  });

  it("formats dates as yyyy-MM-dd", () => {
    const p = buildServiceOrderListParams({
      ...DEFAULT_STATE,
      dateFrom: new Date(2025, 0, 5, 12, 0, 0),
      dateTo: new Date(2025, 11, 31, 23, 59, 59),
    });
    expect(p.get("from")).toBe("2025-01-05");
    expect(p.get("to")).toBe("2025-12-31");
  });
});

describe("parseServiceOrderListParams", () => {
  it("returns defaults when params are empty", () => {
    const s = parseServiceOrderListParams(new URLSearchParams());
    expect(s).toMatchObject({
      search: "",
      statusFilter: "all",
      sortDesc: true,
      page: 1,
      productQuery: "",
    });
    expect(s.dateFrom).toBeUndefined();
    expect(s.dateTo).toBeUndefined();
  });

  it("round-trips a fully populated state", () => {
    const original: ServiceOrderListState = {
      search: "acme",
      statusFilter: "concluida",
      sortDesc: false,
      page: 5,
      productQuery: "CAN-350",
      dateFrom: new Date("2025-06-01T12:00:00Z"),
      dateTo: new Date("2025-06-30T12:00:00Z"),
    };
    const params = buildServiceOrderListParams(original);
    const round = parseServiceOrderListParams(params);
    expect(round.search).toBe(original.search);
    expect(round.statusFilter).toBe(original.statusFilter);
    expect(round.sortDesc).toBe(original.sortDesc);
    expect(round.page).toBe(original.page);
    expect(round.productQuery).toBe(original.productQuery);
    expect(round.dateFrom?.toISOString().slice(0, 10)).toBe("2025-06-01");
    expect(round.dateTo?.toISOString().slice(0, 10)).toBe("2025-06-30");
  });

  it("falls back to 'all' for unknown status values", () => {
    const s = parseServiceOrderListParams(new URLSearchParams("status=hacked"));
    expect(s.statusFilter).toBe("all");
  });

  it("clamps invalid page to 1", () => {
    expect(parseServiceOrderListParams(new URLSearchParams("page=-3")).page).toBe(1);
    expect(parseServiceOrderListParams(new URLSearchParams("page=abc")).page).toBe(1);
    expect(parseServiceOrderListParams(new URLSearchParams("page=0")).page).toBe(1);
  });

  it("ignores invalid date strings", () => {
    const s = parseServiceOrderListParams(new URLSearchParams("from=not-a-date&to=also-bad"));
    expect(s.dateFrom).toBeUndefined();
    expect(s.dateTo).toBeUndefined();
  });
});

describe("hasActiveFilters", () => {
  it("is false for the default state", () => {
    expect(hasActiveFilters(DEFAULT_STATE)).toBe(false);
  });

  it("is true when search is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, search: "x" })).toBe(true);
  });

  it("is true when sort is ascending", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, sortDesc: false })).toBe(true);
  });

  it("is true when status !== 'all'", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, statusFilter: "aberta" })).toBe(true);
  });

  it("is true when page > 1", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, page: 2 })).toBe(true);
  });

  it("is true when product query is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, productQuery: "SKU" })).toBe(true);
  });

  it("is true when either date bound is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, dateFrom: new Date() })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_STATE, dateTo: new Date() })).toBe(true);
  });
});

describe("toDateRangeIso", () => {
  it("returns nothing when both bounds are undefined", () => {
    expect(toDateRangeIso(undefined, undefined)).toEqual({});
  });

  it("floors `from` to start-of-day", () => {
    const { dateFromIso } = toDateRangeIso(new Date(2025, 5, 10, 13, 45), undefined);
    // Local start of day → hours/minutes/seconds/ms all zero.
    const d = new Date(dateFromIso!);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it("ceilings `to` to end-of-day", () => {
    const { dateToIso } = toDateRangeIso(undefined, new Date(2025, 5, 10, 8, 0));
    const d = new Date(dateToIso!);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });

  it("does not mutate the input Date instances", () => {
    const from = new Date(2025, 5, 10, 13, 45);
    const to = new Date(2025, 5, 20, 13, 45);
    const fromCopy = new Date(from);
    const toCopy = new Date(to);
    toDateRangeIso(from, to);
    expect(from.getTime()).toBe(fromCopy.getTime());
    expect(to.getTime()).toBe(toCopy.getTime());
  });
});
