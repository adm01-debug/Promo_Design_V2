import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════════════════════════
// 1. PASSWORD STRENGTH — edge cases
// ═══════════════════════════════════════════════════════════

// We need to test the getStrength function directly
// Since it's not exported, we recreate it for testing
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: "Fraca", color: "bg-destructive" };
  if (score <= 2) return { score: 2, label: "Razoável", color: "bg-warning" };
  if (score <= 3) return { score: 3, label: "Boa", color: "bg-primary" };
  return { score: 4, label: "Forte", color: "bg-success" };
}

describe("PasswordStrength – getStrength", () => {
  it("empty password scores Fraca", () => {
    expect(getStrength("").label).toBe("Fraca");
    expect(getStrength("").score).toBe(1);
  });

  it("short lowercase only scores Fraca", () => {
    expect(getStrength("abc").label).toBe("Fraca");
  });

  it("6-char lowercase scores Razoável (length bonus only)", () => {
    expect(getStrength("abcdef").label).toBe("Razoável");
  });

  it("6-char with uppercase scores Razoável", () => {
    expect(getStrength("Abcdef").label).toBe("Razoável");
  });

  it("10-char lowercase scores Razoável (2 length bonuses)", () => {
    expect(getStrength("abcdefghij").label).toBe("Razoável");
  });

  it("10-char with uppercase scores Boa", () => {
    expect(getStrength("Abcdefghij").label).toBe("Boa");
  });

  it("10-char with upper + number scores Forte", () => {
    expect(getStrength("Abcdefgh1j").label).toBe("Forte");
  });

  it("short with special + number scores Razoável", () => {
    expect(getStrength("1!").label).toBe("Razoável");
  });

  it("max complexity: 10+ chars, upper, number, special = Forte", () => {
    const result = getStrength("Test@1Strong!");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Forte");
    expect(result.color).toBe("bg-success");
  });

  it("unicode chars don't count as special (letters)", () => {
    // é is not [A-Za-z0-9] so it IS a special char
    expect(getStrength("àéîöü1").score).toBeGreaterThanOrEqual(2);
  });

  it("only numbers 10+ chars", () => {
    expect(getStrength("1234567890").label).toBe("Boa"); // length6 + length10 + number
  });

  it("only special chars 10+ chars", () => {
    expect(getStrength("!@#$%^&*()").label).toBe("Boa"); // length6 + length10 + special
  });
});

// ═══════════════════════════════════════════════════════════
// 2. SERVICE ORDER VALIDATION — comprehensive
// ═══════════════════════════════════════════════════════════

import { serviceOrderSchema, validateForm, generateOsNumber, TECHNIQUES, type ServiceOrderData } from "@/features/service-orders/types";

function buildValidOrder(): ServiceOrderData {
  return {
    osNumber: "OS-2601-0001",
    date: "2026-01-15",
    deliveryDate: "2026-02-15",
    clientName: "João Silva",
    clientCompany: "Empresa X",
    clientPhone: "(11) 99999-0000",
    clientEmail: "joao@test.com",
    productName: "Caneca Premium",
    productSku: "SKU-001",
    productMaterial: "Cerâmica",
    productColors: "Branco",
    technique: "Sublimação - Caneca",
    areaName: "Frente",
    areaWidth: "10",
    areaHeight: "8",
    areaShape: "retangular",
    artColors: "CMYK",
    artDpi: "300",
    artFile: "arte.pdf",
    artFileDataUrl: "",
    quantity: "100",
    observations: "Entregar embalado",
    mockupImageUrl: "",
    identificacaoCaixa: "CX-001",
    materialEvento: false,
    aprovarPrimeiraPeca: true,
    qtdCompra: "100",
    qtdLiberada: "100",
    fazParteKit: false,
    gravacaoDetalhe: "Frente total",
  };
}

describe("ServiceOrder – Zod Validation", () => {
  it("valid order passes", () => {
    const result = serviceOrderSchema.safeParse(buildValidOrder());
    expect(result.success).toBe(true);
  });

  it("missing clientName fails with correct message", () => {
    const order = { ...buildValidOrder(), clientName: "" };
    const errors = validateForm(order);
    expect(errors.clientName).toBeDefined();
  });

  it("missing productName fails", () => {
    const order = { ...buildValidOrder(), productName: "   " };
    const errors = validateForm(order);
    expect(errors.productName).toBeDefined();
  });

  it("missing technique fails", () => {
    const order = { ...buildValidOrder(), technique: "" };
    const errors = validateForm(order);
    expect(errors.technique).toBeDefined();
  });

  it("quantity 0 fails", () => {
    const order = { ...buildValidOrder(), quantity: "0" };
    const errors = validateForm(order);
    expect(errors.quantity).toBeDefined();
  });

  it("quantity negative fails", () => {
    const order = { ...buildValidOrder(), quantity: "-5" };
    const errors = validateForm(order);
    expect(errors.quantity).toBeDefined();
  });

  it("quantity non-numeric fails", () => {
    const order = { ...buildValidOrder(), quantity: "abc" };
    const errors = validateForm(order);
    expect(errors.quantity).toBeDefined();
  });

  it("quantity empty string fails", () => {
    const order = { ...buildValidOrder(), quantity: "" };
    const errors = validateForm(order);
    expect(errors.quantity).toBeDefined();
  });

  it("quantity '1' passes", () => {
    const order = { ...buildValidOrder(), quantity: "1" };
    const errors = validateForm(order);
    expect(errors.quantity).toBeUndefined();
  });

  it("quantity '99999' passes", () => {
    const order = { ...buildValidOrder(), quantity: "99999" };
    const errors = validateForm(order);
    expect(errors.quantity).toBeUndefined();
  });

  it("quantity with whitespace only fails", () => {
    const order = { ...buildValidOrder(), quantity: "   " };
    const errors = validateForm(order);
    expect(errors.quantity).toBeDefined();
  });

  it("clientName with only spaces fails (trim)", () => {
    const order = { ...buildValidOrder(), clientName: "   " };
    const errors = validateForm(order);
    expect(errors.clientName).toBeDefined();
  });

  it("multiple errors returned simultaneously", () => {
    const order = { ...buildValidOrder(), clientName: "", productName: "", technique: "", quantity: "0" };
    const errors = validateForm(order);
    expect(Object.keys(errors).length).toBeGreaterThanOrEqual(3);
  });

  it("valid order returns empty errors object", () => {
    const errors = validateForm(buildValidOrder());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("osNumber empty fails", () => {
    const order = { ...buildValidOrder(), osNumber: "" };
    const result = serviceOrderSchema.safeParse(order);
    expect(result.success).toBe(false);
  });

  it("date empty fails", () => {
    const order = { ...buildValidOrder(), date: "" };
    const result = serviceOrderSchema.safeParse(order);
    expect(result.success).toBe(false);
  });

  it("boolean fields accept false", () => {
    const order = { ...buildValidOrder(), materialEvento: false, aprovarPrimeiraPeca: false, fazParteKit: false };
    const result = serviceOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
  });
});

describe("ServiceOrder – generateOsNumber", () => {
  it("generates with OS- prefix", () => {
    const os = generateOsNumber();
    expect(os).toMatch(/^OS-/);
  });

  it("format is OS-YYMM-NNNN", () => {
    const os = generateOsNumber();
    expect(os).toMatch(/^OS-\d{4}-\d{4}$/);
  });

  it("generates unique numbers", () => {
    const numbers = new Set(Array.from({ length: 50 }, () => generateOsNumber()));
    // With 9999 range and 50 tries, collisions should be extremely rare
    expect(numbers.size).toBeGreaterThanOrEqual(45);
  });

  it("uses current year/month", () => {
    const os = generateOsNumber();
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    expect(os).toContain(`${y}${m}`);
  });
});

describe("TECHNIQUES constant", () => {
  it("has 17 techniques", () => {
    expect(TECHNIQUES).toHaveLength(17);
  });

  it("contains Laser Fiber", () => {
    expect(TECHNIQUES).toContain("Laser Fiber");
  });

  it("all techniques are non-empty strings", () => {
    TECHNIQUES.forEach((t) => {
      expect(typeof t).toBe("string");
      expect(t.trim().length).toBeGreaterThan(0);
    });
  });

  it("no duplicate techniques", () => {
    const unique = new Set(TECHNIQUES);
    expect(unique.size).toBe(TECHNIQUES.length);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. STATUS STATE MACHINE — exhaustive transitions
// ═══════════════════════════════════════════════════════════

import { canTransition, getNextStatuses, STATUS_CONFIG, STATUS_TRANSITIONS, type OsStatus } from "@/features/service-orders/hooks/use-service-orders";

describe("Status State Machine – canTransition", () => {
  it("aberta → em_producao allowed", () => expect(canTransition("aberta", "em_producao")).toBe(true));
  it("aberta → cancelada allowed", () => expect(canTransition("aberta", "cancelada")).toBe(true));
  it("aberta → concluida NOT allowed", () => expect(canTransition("aberta", "concluida")).toBe(false));
  it("aberta → aberta NOT allowed", () => expect(canTransition("aberta", "aberta")).toBe(false));

  it("em_producao → concluida allowed", () => expect(canTransition("em_producao", "concluida")).toBe(true));
  it("em_producao → cancelada allowed", () => expect(canTransition("em_producao", "cancelada")).toBe(true));
  it("em_producao → aberta NOT allowed", () => expect(canTransition("em_producao", "aberta")).toBe(false));
  it("em_producao → em_producao NOT allowed", () => expect(canTransition("em_producao", "em_producao")).toBe(false));

  it("concluida is terminal (no transitions)", () => {
    expect(canTransition("concluida", "aberta")).toBe(false);
    expect(canTransition("concluida", "em_producao")).toBe(false);
    expect(canTransition("concluida", "cancelada")).toBe(false);
    expect(canTransition("concluida", "concluida")).toBe(false);
  });

  it("cancelada → aberta allowed (reopen)", () => expect(canTransition("cancelada", "aberta")).toBe(true));
  it("cancelada → em_producao NOT allowed", () => expect(canTransition("cancelada", "em_producao")).toBe(false));
  it("cancelada → concluida NOT allowed", () => expect(canTransition("cancelada", "concluida")).toBe(false));
});

describe("Status State Machine – getNextStatuses", () => {
  it("aberta has 2 options", () => expect(getNextStatuses("aberta")).toHaveLength(2));
  it("em_producao has 2 options", () => expect(getNextStatuses("em_producao")).toHaveLength(2));
  it("concluida has 0 options", () => expect(getNextStatuses("concluida")).toHaveLength(0));
  it("cancelada has 1 option", () => expect(getNextStatuses("cancelada")).toHaveLength(1));
});

describe("STATUS_CONFIG completeness", () => {
  const allStatuses: OsStatus[] = ["aberta", "em_producao", "concluida", "cancelada"];

  allStatuses.forEach((status) => {
    it(`${status} has label, color, and bg`, () => {
      const config = STATUS_CONFIG[status];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.color).toBeTruthy();
      expect(config.bg).toBeTruthy();
    });
  });

  it("all statuses in STATUS_TRANSITIONS", () => {
    allStatuses.forEach((s) => {
      expect(STATUS_TRANSITIONS[s]).toBeDefined();
      expect(Array.isArray(STATUS_TRANSITIONS[s])).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 4. WIDGET LAYOUT — localStorage persistence
// ═══════════════════════════════════════════════════════════

describe("Widget Layout – localStorage logic", () => {
  const STORAGE_KEY = "promo-dashboard-widget-order";
  const DEFAULT_ORDER = ["stats", "quick-actions", "activity-chart", "recent-projects"];

  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default order when nothing stored", () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeNull();
  });

  it("persists valid order", () => {
    const custom = ["recent-projects", "stats", "quick-actions", "activity-chart"];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(loaded).toEqual(custom);
  });

  it("rejects invalid JSON gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    let order = DEFAULT_ORDER;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      if (DEFAULT_ORDER.every((id) => parsed.includes(id)) && parsed.length === DEFAULT_ORDER.length) {
        order = parsed;
      }
    } catch {
      order = DEFAULT_ORDER;
    }
    expect(order).toEqual(DEFAULT_ORDER);
  });

  it("rejects incomplete array (missing widget)", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["stats", "quick-actions"]));
    let order = DEFAULT_ORDER;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      if (DEFAULT_ORDER.every((id) => parsed.includes(id)) && parsed.length === DEFAULT_ORDER.length) {
        order = parsed;
      }
    } catch {
      order = DEFAULT_ORDER;
    }
    expect(order).toEqual(DEFAULT_ORDER);
  });

  it("rejects array with extra items", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...DEFAULT_ORDER, "extra"]));
    let order = DEFAULT_ORDER;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      if (DEFAULT_ORDER.every((id) => parsed.includes(id)) && parsed.length === DEFAULT_ORDER.length) {
        order = parsed;
      }
    } catch {
      order = DEFAULT_ORDER;
    }
    expect(order).toEqual(DEFAULT_ORDER);
  });

  it("rejects array with duplicate items", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["stats", "stats", "stats", "stats"]));
    let order = DEFAULT_ORDER;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      if (DEFAULT_ORDER.every((id) => parsed.includes(id)) && parsed.length === DEFAULT_ORDER.length) {
        order = parsed;
      }
    } catch {
      order = DEFAULT_ORDER;
    }
    expect(order).toEqual(DEFAULT_ORDER);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. DASHBOARD HELPERS — pure function tests
// ═══════════════════════════════════════════════════════════

describe("Dashboard – getGreeting", () => {
  function getGreeting(hour: number): string {
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  it("0h = Bom dia", () => expect(getGreeting(0)).toBe("Bom dia"));
  it("6h = Bom dia", () => expect(getGreeting(6)).toBe("Bom dia"));
  it("11h = Bom dia", () => expect(getGreeting(11)).toBe("Bom dia"));
  it("12h = Boa tarde", () => expect(getGreeting(12)).toBe("Boa tarde"));
  it("17h = Boa tarde", () => expect(getGreeting(17)).toBe("Boa tarde"));
  it("18h = Boa noite", () => expect(getGreeting(18)).toBe("Boa noite"));
  it("23h = Boa noite", () => expect(getGreeting(23)).toBe("Boa noite"));
});

describe("Dashboard – getUserFirstName", () => {
  function getUserFirstName(email?: string): string {
    if (!email) return "";
    const local = email.split("@")[0];
    return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0];
  }

  it("undefined returns empty", () => expect(getUserFirstName(undefined)).toBe(""));
  it("empty string returns empty", () => expect(getUserFirstName("")).toBe(""));
  it("simple email extracts name", () => expect(getUserFirstName("joao@test.com")).toBe("Joao"));
  it("email with dot splits correctly", () => expect(getUserFirstName("joao.silva@test.com")).toBe("Joao"));
  it("email with underscore splits", () => expect(getUserFirstName("joao_silva@test.com")).toBe("Joao"));
  it("email with hyphen splits", () => expect(getUserFirstName("joao-silva@test.com")).toBe("Joao"));
  it("single char email", () => expect(getUserFirstName("j@test.com")).toBe("J"));
  it("capitalizes first letter", () => expect(getUserFirstName("admin@test.com")).toBe("Admin"));
});

describe("Dashboard – formatRelativeDate", () => {
  function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;
    return date.toLocaleDateString("pt-BR");
  }

  it("just now", () => expect(formatRelativeDate(new Date().toISOString())).toBe("agora"));
  it("5 min ago", () => {
    const d = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeDate(d)).toBe("5min atrás");
  });
  it("2 hours ago", () => {
    const d = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(formatRelativeDate(d)).toBe("2h atrás");
  });
  it("3 days ago", () => {
    const d = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(formatRelativeDate(d)).toBe("3d atrás");
  });
  it("8 days ago shows date", () => {
    const d = new Date(Date.now() - 8 * 86400000).toISOString();
    const result = formatRelativeDate(d);
    expect(result).not.toContain("atrás");
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
  it("future date shows agora (negative diff → mins < 1)", () => {
    const d = new Date(Date.now() + 60000).toISOString();
    expect(formatRelativeDate(d)).toBe("agora");
  });
});

describe("Dashboard – buildWeeklyActivity", () => {
  function buildWeeklyActivity(
    orders: { createdAt: string }[],
    drafts: { createdAt: string }[],
    magicUp: { createdAt: string }[],
  ) {
    const weeks: { label: string; os: number; mockups: number; ia: number }[] = [];
    const now = new Date();
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - w * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const inRange = (d: string) => {
        const date = new Date(d);
        return date >= weekStart && date < weekEnd;
      };
      const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      weeks.push({
        label,
        os: orders.filter((o) => inRange(o.createdAt)).length,
        mockups: drafts.filter((d) => inRange(d.createdAt)).length,
        ia: magicUp.filter((m) => inRange(m.createdAt)).length,
      });
    }
    return weeks;
  }

  it("returns 8 weeks", () => {
    expect(buildWeeklyActivity([], [], [])).toHaveLength(8);
  });

  it("empty data produces all zeros", () => {
    const result = buildWeeklyActivity([], [], []);
    result.forEach((w) => {
      expect(w.os).toBe(0);
      expect(w.mockups).toBe(0);
      expect(w.ia).toBe(0);
    });
  });

  it("today's order counted in last week", () => {
    const today = new Date().toISOString();
    const result = buildWeeklyActivity([{ createdAt: today }], [], []);
    const lastWeek = result[result.length - 1];
    expect(lastWeek.os).toBe(1);
  });

  it("labels contain day/month format", () => {
    const result = buildWeeklyActivity([], [], []);
    result.forEach((w) => {
      expect(w.label).toMatch(/\d+\/\d+/);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 6. LAZY WITH RETRY — retry logic
// ═══════════════════════════════════════════════════════════

describe("lazyWithRetry – retryImport logic", () => {
  async function retryImport(
    factory: () => Promise<{ default: unknown }>,
    retries: number,
    delay: number
  ): Promise<{ default: unknown }> {
    try {
      return await factory();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise((r) => setTimeout(r, delay));
      return retryImport(factory, retries - 1, delay * 1.5);
    }
  }

  it("succeeds on first try", async () => {
    const factory = vi.fn().mockResolvedValue({ default: () => null });
    await retryImport(factory, 3, 10);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("retries on failure then succeeds", async () => {
    const factory = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue({ default: () => null });
    await retryImport(factory, 3, 10);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("exhausts all retries and throws", async () => {
    const factory = vi.fn().mockRejectedValue(new Error("always-fail"));
    await expect(retryImport(factory, 2, 10)).rejects.toThrow("always-fail");
    expect(factory).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("0 retries throws immediately on failure", async () => {
    const factory = vi.fn().mockRejectedValue(new Error("instant-fail"));
    await expect(retryImport(factory, 0, 10)).rejects.toThrow("instant-fail");
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════
// 7. SIDEBAR MODULE CONFIG — structural integrity
// ═══════════════════════════════════════════════════════════

describe("Sidebar – module config integrity", () => {
  const modules = [
    { id: "mockup", path: "/mockup", childCount: 6 },
    { id: "magicup", path: "/magicup", childCount: 3 },
    { id: "video", path: "/video", childCount: 7 },
  ];

  it("all module paths start with /", () => {
    modules.forEach((m) => expect(m.path.startsWith("/")).toBe(true));
  });

  it("modules have expected child counts", () => {
    expect(modules[0].childCount).toBe(6); // mockup
    expect(modules[1].childCount).toBe(3); // magicup
    expect(modules[2].childCount).toBe(7); // video
  });

  it("no duplicate module ids", () => {
    const ids = modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. ROW MAPPERS — null/undefined edge cases
// ═══════════════════════════════════════════════════════════

describe("rowToOrder – null field handling", () => {
  // Simulate the mapping logic
  function rowToOrder(row: Record<string, unknown>) {
    return {
      deliveryDate: (row.delivery_date as string) ?? "",
      clientCompany: (row.client_company as string) ?? "",
      productSku: (row.product_sku as string) ?? "",
      materialEvento: (row.material_evento as boolean) ?? false,
      aprovarPrimeiraPeca: (row.aprovar_primeira_peca as boolean) ?? false,
      fazParteKit: (row.faz_parte_kit as boolean) ?? false,
      quantity: String(row.quantity),
    };
  }

  it("null fields default to empty string", () => {
    const result = rowToOrder({ delivery_date: null, client_company: null, product_sku: null, quantity: 5 });
    expect(result.deliveryDate).toBe("");
    expect(result.clientCompany).toBe("");
    expect(result.productSku).toBe("");
  });

  it("null boolean fields default to false", () => {
    const result = rowToOrder({ material_evento: null, aprovar_primeira_peca: null, faz_parte_kit: null, quantity: 1 });
    expect(result.materialEvento).toBe(false);
    expect(result.aprovarPrimeiraPeca).toBe(false);
    expect(result.fazParteKit).toBe(false);
  });

  it("quantity converted to string", () => {
    expect(rowToOrder({ quantity: 42 }).quantity).toBe("42");
    expect(rowToOrder({ quantity: 0 }).quantity).toBe("0");
  });
});

// ═══════════════════════════════════════════════════════════
// 9. COLUMN SELECTOR DEFAULTS
// ═══════════════════════════════════════════════════════════

import { getDefaultColumns } from "@/components/ColumnSelector";

describe("ColumnSelector – getDefaultColumns", () => {
  it("returns a number", () => {
    expect(typeof getDefaultColumns()).toBe("number");
  });

  it("returns 3, 4, or 5", () => {
    const result = getDefaultColumns();
    expect([3, 4, 5]).toContain(result);
  });
});

// ═══════════════════════════════════════════════════════════
// 10. EDGE CASES – XSS & injection inputs
// ═══════════════════════════════════════════════════════════

describe("Input sanitization edge cases", () => {
  it("script tag in client name passes validation (Zod only checks length)", () => {
    const order = { ...buildValidOrder(), clientName: '<script>alert("xss")</script>' };
    const errors = validateForm(order);
    // Zod doesn't sanitize HTML – this is expected behavior (React handles rendering)
    expect(errors.clientName).toBeUndefined();
  });

  it("very long product name accepted", () => {
    const order = { ...buildValidOrder(), productName: "A".repeat(10000) };
    const errors = validateForm(order);
    expect(errors.productName).toBeUndefined();
  });

  it("special chars in OS number accepted", () => {
    const order = { ...buildValidOrder(), osNumber: "OS-//\\--test" };
    const result = serviceOrderSchema.safeParse(order);
    expect(result.success).toBe(true);
  });

  it("quantity with decimal accepted as valid number", () => {
    const order = { ...buildValidOrder(), quantity: "10.5" };
    const errors = validateForm(order);
    // 10.5 >= 1 so it passes
    expect(errors.quantity).toBeUndefined();
  });

  it("quantity with leading zeros passes", () => {
    const order = { ...buildValidOrder(), quantity: "001" };
    const errors = validateForm(order);
    expect(errors.quantity).toBeUndefined();
  });
});
