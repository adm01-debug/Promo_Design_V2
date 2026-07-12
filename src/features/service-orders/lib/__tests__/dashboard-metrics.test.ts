import { describe, it, expect } from "vitest";
import { computeDashboardMetrics } from "@/features/service-orders/lib/dashboard-metrics";
import type { OsStatus, StoredServiceOrder } from "@/features/service-orders";

/**
 * Fixture builder — every field of `StoredServiceOrder` is required by the
 * type, so we default the noise and let each test override the fields that
 * actually matter for its scenario.
 */
function makeOrder(overrides: Partial<StoredServiceOrder> = {}): StoredServiceOrder {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    osNumber: "OS-0001",
    status: "aberta" as OsStatus,
    date: "2025-01-01",
    deliveryDate: "",
    clientName: "Cliente A",
    clientCompany: "",
    clientPhone: "",
    clientEmail: "",
    productName: "Caneca 350ml",
    productSku: "CAN-350",
    productMaterial: "",
    productColors: "",
    technique: "Serigrafia",
    areaName: "",
    areaWidth: "",
    areaHeight: "",
    areaShape: "",
    artColors: "",
    artDpi: "",
    artFile: "",
    artFileDataUrl: "",
    quantity: "10",
    observations: "",
    mockupImageUrl: "",
    identificacaoCaixa: "",
    materialEvento: false,
    aprovarPrimeiraPeca: false,
    qtdCompra: "",
    qtdLiberada: "",
    fazParteKit: false,
    gravacaoDetalhe: "",
    artAssetId: null,
    lockVersion: 1,
    deletedAt: null,
    createdAt: "2025-06-15T12:00:00.000Z",
    updatedAt: "2025-06-15T12:00:00.000Z",
    ...overrides,
  };
}

const REF = new Date(2025, 5, 15, 12, 0, 0); // June 15, 2025 (month index = 5)

describe("computeDashboardMetrics — status aggregation", () => {
  it("returns zeros for every status when there are no orders", () => {
    const m = computeDashboardMetrics([], REF);
    expect(m.byStatus).toEqual({ aberta: 0, em_producao: 0, concluida: 0, cancelada: 0 });
    expect(m.totalQty).toBe(0);
    expect(m.statusPieData).toEqual([]);
    expect(m.techniqueBarData).toEqual([]);
    expect(m.deliveriesThisMonth).toEqual([]);
    expect(m.overdue).toEqual([]);
  });

  it("counts every status independently", () => {
    const orders = [
      makeOrder({ status: "aberta" }),
      makeOrder({ status: "aberta" }),
      makeOrder({ status: "em_producao" }),
      makeOrder({ status: "concluida" }),
      makeOrder({ status: "concluida" }),
      makeOrder({ status: "concluida" }),
      makeOrder({ status: "cancelada" }),
    ];
    const m = computeDashboardMetrics(orders, REF);
    expect(m.byStatus).toEqual({ aberta: 2, em_producao: 1, concluida: 3, cancelada: 1 });
  });

  it("omits zero-value status slices from the pie chart", () => {
    const orders = [makeOrder({ status: "aberta" }), makeOrder({ status: "concluida" })];
    const m = computeDashboardMetrics(orders, REF);
    const slices = m.statusPieData.map((s) => s.status).sort();
    expect(slices).toEqual(["aberta", "concluida"]);
  });
});

describe("computeDashboardMetrics — totalQty", () => {
  it("parses `quantity` with parseInt, treating garbage as zero", () => {
    const orders = [
      makeOrder({ quantity: "10" }),
      makeOrder({ quantity: "5" }),
      makeOrder({ quantity: "not-a-number" }),
      makeOrder({ quantity: "" }),
      makeOrder({ quantity: "3.7" }), // parseInt → 3
    ];
    expect(computeDashboardMetrics(orders, REF).totalQty).toBe(18);
  });
});

describe("computeDashboardMetrics — technique bar", () => {
  it("sorts techniques by count desc and caps at 8", () => {
    const orders: StoredServiceOrder[] = [];
    for (let i = 0; i < 10; i++) orders.push(makeOrder({ technique: "Serigrafia" }));
    for (let i = 0; i < 5; i++) orders.push(makeOrder({ technique: "Sublimação" }));
    for (let i = 0; i < 2; i++) orders.push(makeOrder({ technique: "Laser" }));
    // 6 extra unique techniques with 1 count each — total 9 unique techniques.
    for (let i = 0; i < 6; i++) orders.push(makeOrder({ technique: `T-${i}` }));
    const m = computeDashboardMetrics(orders, REF);
    expect(m.techniqueBarData).toHaveLength(8);
    expect(m.techniqueBarData[0]).toMatchObject({ fullName: "Serigrafia", count: 10 });
    expect(m.techniqueBarData[1]).toMatchObject({ fullName: "Sublimação", count: 5 });
    expect(m.techniqueBarData[2]).toMatchObject({ fullName: "Laser", count: 2 });
  });

  it("skips empty technique strings", () => {
    const orders = [makeOrder({ technique: "" }), makeOrder({ technique: "Serigrafia" })];
    const m = computeDashboardMetrics(orders, REF);
    expect(m.techniqueBarData).toHaveLength(1);
    expect(m.techniqueBarData[0].fullName).toBe("Serigrafia");
  });

  it("truncates long technique names to 16 chars + ellipsis for the axis label", () => {
    const long = "Nome Muito Grande Da Técnica X";
    const m = computeDashboardMetrics([makeOrder({ technique: long })], REF);
    expect(m.techniqueBarData[0].fullName).toBe(long);
    expect(m.techniqueBarData[0].name.length).toBeLessThanOrEqual(17); // 16 + "…"
    expect(m.techniqueBarData[0].name.endsWith("…")).toBe(true);
  });
});

describe("computeDashboardMetrics — deliveries this month", () => {
  it("includes orders whose deliveryDate falls inside the reference month", () => {
    const orders = [
      makeOrder({ id: "in", deliveryDate: "2025-06-20" }),
      makeOrder({ id: "next-month", deliveryDate: "2025-07-01" }),
      makeOrder({ id: "prev-month", deliveryDate: "2025-05-30" }),
      makeOrder({ id: "empty", deliveryDate: "" }),
    ];
    const m = computeDashboardMetrics(orders, REF);
    expect(m.deliveriesThisMonth.map((o) => o.id)).toEqual(["in"]);
  });
});

describe("computeDashboardMetrics — overdue", () => {
  it("flags orders past deliveryDate that are not concluida/cancelada", () => {
    const orders = [
      makeOrder({ id: "overdue-open", status: "aberta", deliveryDate: "2025-06-01" }),
      makeOrder({ id: "overdue-prod", status: "em_producao", deliveryDate: "2025-05-01" }),
      makeOrder({ id: "overdue-but-done", status: "concluida", deliveryDate: "2025-01-01" }),
      makeOrder({ id: "overdue-but-cancel", status: "cancelada", deliveryDate: "2025-01-01" }),
      makeOrder({ id: "future", status: "aberta", deliveryDate: "2025-12-31" }),
      makeOrder({ id: "no-date", status: "aberta", deliveryDate: "" }),
    ];
    const m = computeDashboardMetrics(orders, REF);
    expect(m.overdue.map((o) => o.id).sort()).toEqual(["overdue-open", "overdue-prod"]);
  });
});

describe("computeDashboardMetrics — monthly trend", () => {
  it("always emits exactly 6 buckets ending at the reference month", () => {
    const m = computeDashboardMetrics([], REF);
    expect(m.monthlyTrend).toHaveLength(6);
  });

  it("aggregates orders into the correct month bucket and counts concluidas", () => {
    // Reference = June 2025. Buckets = Jan..June 2025.
    const orders = [
      makeOrder({ createdAt: "2025-01-10T00:00:00Z", status: "concluida" }),
      makeOrder({ createdAt: "2025-01-25T00:00:00Z", status: "aberta" }),
      makeOrder({ createdAt: "2025-06-01T00:00:00Z", status: "concluida" }),
      makeOrder({ createdAt: "2024-12-31T00:00:00Z", status: "aberta" }), // out of window
    ];
    const m = computeDashboardMetrics(orders, REF);
    const jan = m.monthlyTrend[0];
    const jun = m.monthlyTrend[5];
    expect(jan.total).toBe(2);
    expect(jan.concluidas).toBe(1);
    expect(jun.total).toBe(1);
    expect(jun.concluidas).toBe(1);
    // Feb..May all empty
    for (const bucket of m.monthlyTrend.slice(1, 5)) {
      expect(bucket.total).toBe(0);
      expect(bucket.concluidas).toBe(0);
    }
  });
});
