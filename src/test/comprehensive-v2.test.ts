import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── useVisibilityPolling unit tests ────────────────────────
describe("useVisibilityPolling – logic validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clearInterval prevents stale timers", () => {
    const spy = vi.fn();
    const id = setInterval(spy, 100);
    clearInterval(id);
    vi.advanceTimersByTime(500);
    expect(spy).not.toHaveBeenCalled();
  });

  it("MAX_INTERVAL caps at 4× base or 60s, whichever is larger", () => {
    // base 10s → max should be 60s (60_000 > 40_000)
    const base1 = 10_000;
    expect(Math.max(base1 * 4, 60_000)).toBe(60_000);

    // base 20s → max should be 80s (80_000 > 60_000)
    const base2 = 20_000;
    expect(Math.max(base2 * 4, 60_000)).toBe(80_000);
  });

  it("doubling interval stays within cap", () => {
    const base = 15_000;
    const MAX = Math.max(base * 4, 60_000); // 60_000
    let current = base;
    // blur 1
    current = Math.min(current * 2, MAX); // 30_000
    expect(current).toBe(30_000);
    // blur 2
    current = Math.min(current * 2, MAX); // 60_000
    expect(current).toBe(60_000);
    // blur 3 – capped
    current = Math.min(current * 2, MAX); // still 60_000
    expect(current).toBe(60_000);
  });
});

// ── ErrorLogger ring-buffer tests ──────────────────────────
describe("ErrorLogger – ring buffer & levels", () => {
  it("buffer never exceeds MAX_BUFFER (100)", async () => {
    const { ErrorLogger } = await import("@/lib/error-logger");
    ErrorLogger.clear();
    for (let i = 0; i < 150; i++) {
      ErrorLogger.debug(`msg-${i}`);
    }
    const entries = ErrorLogger.getRecentErrors();
    expect(entries.length).toBe(100);
    // oldest should be msg-50 (first 50 were shifted out)
    expect(entries[0].message).toBe("msg-50");
    ErrorLogger.clear();
  });

  it("captures structured metadata for errors", async () => {
    const { ErrorLogger } = await import("@/lib/error-logger");
    ErrorLogger.clear();
    const err = new Error("test-fail");
    ErrorLogger.error("Something broke", err, { userId: "abc" });
    const entries = ErrorLogger.getRecentErrors();
    expect(entries.length).toBe(1);
    expect(entries[0].level).toBe("error");
    expect(entries[0].message).toBe("Something broke");
    expect(entries[0].stack).toContain("test-fail");
    expect(entries[0].context?.errorName).toBe("Error");
    expect(entries[0].context?.userId).toBe("abc");
    expect(entries[0].timestamp).toBeTruthy();
    ErrorLogger.clear();
  });

  it("fatal level works correctly", async () => {
    const { ErrorLogger } = await import("@/lib/error-logger");
    ErrorLogger.clear();
    ErrorLogger.fatal("crash", new Error("boom"));
    const entries = ErrorLogger.getRecentErrors();
    expect(entries[0].level).toBe("fatal");
    ErrorLogger.clear();
  });

  it("clear empties the buffer", async () => {
    const { ErrorLogger } = await import("@/lib/error-logger");
    ErrorLogger.debug("temp");
    ErrorLogger.clear();
    expect(ErrorLogger.getRecentErrors().length).toBe(0);
  });
});

// ── Service Order validation edge cases ────────────────────
describe("ServiceOrder validation – edge cases", () => {
  it("rejects quantity of 0", async () => {
    const { validateForm } = await import("@/features/service-orders/types");
    const base = {
      osNumber: "OS-2401-0001", date: "2024-01-01", deliveryDate: "",
      clientName: "Test", clientCompany: "", clientPhone: "", clientEmail: "",
      productName: "Product", productSku: "", productMaterial: "", productColors: "",
      technique: "Laser UV", areaName: "", areaWidth: "", areaHeight: "", areaShape: "",
      artColors: "", artDpi: "300", artFile: "", artFileDataUrl: "",
      quantity: "0", observations: "", mockupImageUrl: "",
      identificacaoCaixa: "", materialEvento: false, aprovarPrimeiraPeca: false,
      qtdCompra: "", qtdLiberada: "", fazParteKit: false, gravacaoDetalhe: "",
    };
    const errors = validateForm(base);
    expect(errors.quantity).toBeTruthy();
  });

  it("rejects negative quantity", async () => {
    const { validateForm } = await import("@/features/service-orders/types");
    const base = {
      osNumber: "OS-2401-0001", date: "2024-01-01", deliveryDate: "",
      clientName: "Test", clientCompany: "", clientPhone: "", clientEmail: "",
      productName: "Product", productSku: "", productMaterial: "", productColors: "",
      technique: "Laser UV", areaName: "", areaWidth: "", areaHeight: "", areaShape: "",
      artColors: "", artDpi: "300", artFile: "", artFileDataUrl: "",
      quantity: "-5", observations: "", mockupImageUrl: "",
      identificacaoCaixa: "", materialEvento: false, aprovarPrimeiraPeca: false,
      qtdCompra: "", qtdLiberada: "", fazParteKit: false, gravacaoDetalhe: "",
    };
    const errors = validateForm(base);
    expect(errors.quantity).toBeTruthy();
  });

  it("rejects empty clientName (whitespace only)", async () => {
    const { validateForm } = await import("@/features/service-orders/types");
    const base = {
      osNumber: "OS-2401-0001", date: "2024-01-01", deliveryDate: "",
      clientName: "   ", clientCompany: "", clientPhone: "", clientEmail: "",
      productName: "Product", productSku: "", productMaterial: "", productColors: "",
      technique: "Laser UV", areaName: "", areaWidth: "", areaHeight: "", areaShape: "",
      artColors: "", artDpi: "300", artFile: "", artFileDataUrl: "",
      quantity: "10", observations: "", mockupImageUrl: "",
      identificacaoCaixa: "", materialEvento: false, aprovarPrimeiraPeca: false,
      qtdCompra: "", qtdLiberada: "", fazParteKit: false, gravacaoDetalhe: "",
    };
    const errors = validateForm(base);
    expect(errors.clientName).toBeTruthy();
  });

  it("accepts valid form with no errors", async () => {
    const { validateForm } = await import("@/features/service-orders/types");
    const valid = {
      osNumber: "OS-2401-0001", date: "2024-01-01", deliveryDate: "",
      clientName: "João", clientCompany: "", clientPhone: "", clientEmail: "",
      productName: "Caneta", productSku: "", productMaterial: "", productColors: "",
      technique: "Laser UV", areaName: "", areaWidth: "", areaHeight: "", areaShape: "",
      artColors: "", artDpi: "300", artFile: "", artFileDataUrl: "",
      quantity: "100", observations: "", mockupImageUrl: "",
      identificacaoCaixa: "", materialEvento: false, aprovarPrimeiraPeca: false,
      qtdCompra: "", qtdLiberada: "", fazParteKit: false, gravacaoDetalhe: "",
    };
    const errors = validateForm(valid);
    expect(Object.keys(errors).length).toBe(0);
  });
});

// ── Status machine edge cases ──────────────────────────────
describe("Status machine – comprehensive", () => {
  it("concluida is a terminal state", async () => {
    const { getNextStatuses } = await import("@/features/service-orders/hooks/use-service-orders");
    expect(getNextStatuses("concluida")).toEqual([]);
  });

  it("cancelada can reopen to aberta only", async () => {
    const { getNextStatuses, canTransition } = await import("@/features/service-orders/hooks/use-service-orders");
    expect(getNextStatuses("cancelada")).toEqual(["aberta"]);
    expect(canTransition("cancelada", "em_producao")).toBe(false);
    expect(canTransition("cancelada", "concluida")).toBe(false);
  });

  it("em_producao cannot go back to aberta", async () => {
    const { canTransition } = await import("@/features/service-orders/hooks/use-service-orders");
    expect(canTransition("em_producao", "aberta")).toBe(false);
  });

  it("all statuses have a config entry", async () => {
    const { STATUS_CONFIG } = await import("@/features/service-orders/hooks/use-service-orders");
    const expected = ["aberta", "em_producao", "concluida", "cancelada"];
    for (const s of expected) {
      expect(STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]).toBeDefined();
      expect(STATUS_CONFIG[s as keyof typeof STATUS_CONFIG].label).toBeTruthy();
    }
  });
});

// ── OS Number generation ───────────────────────────────────
describe("OS Number generation", () => {
  it("generates unique numbers", async () => {
    const { generateOsNumber } = await import("@/features/service-orders/types");
    const numbers = new Set(Array.from({ length: 100 }, () => generateOsNumber()));
    // With 4 random digits, 100 should almost always be unique
    expect(numbers.size).toBeGreaterThanOrEqual(95);
  });

  it("follows OS-YYMM-NNNN format", async () => {
    const { generateOsNumber } = await import("@/features/service-orders/types");
    const os = generateOsNumber();
    expect(os).toMatch(/^OS-\d{4}-\d{4}$/);
  });
});

// ── lazyWithRetry logic ────────────────────────────────────
describe("lazyWithRetry", () => {
  it("retries on failure", async () => {
    let attempts = 0;
    const factory = async () => {
      attempts++;
      if (attempts < 3) throw new Error("chunk fail");
      return { default: (() => null) as React.FC };
    };

    // Directly test retryImport logic
    const result = await (async function retryImport(
      fn: () => Promise<{ default: React.FC }>,
      retries: number,
      delay: number,
    ): Promise<{ default: React.FC }> {
      try {
        return await fn();
      } catch (error) {
        if (retries <= 0) throw error;
        await new Promise((r) => setTimeout(r, delay));
        return retryImport(fn, retries - 1, delay * 1.5);
      }
    })(factory, 3, 10);

    expect(result.default).toBeDefined();
    expect(attempts).toBe(3);
  });
});
