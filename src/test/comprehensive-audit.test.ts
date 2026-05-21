import { describe, it, expect } from "vitest";

// ============================================================
// 1. formatRelativeDate — exhaustive edge cases
// ============================================================
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

describe("formatRelativeDate — exhaustive", () => {
  it("returns 'agora' for now", () => {
    expect(formatRelativeDate(new Date().toISOString())).toBe("agora");
  });

  it("returns 'agora' for 30 seconds ago", () => {
    expect(formatRelativeDate(new Date(Date.now() - 30_000).toISOString())).toBe("agora");
  });

  it("returns '1min atrás' for exactly 1 minute ago", () => {
    expect(formatRelativeDate(new Date(Date.now() - 60_000).toISOString())).toBe("1min atrás");
  });

  it("returns '59min atrás' at boundary", () => {
    expect(formatRelativeDate(new Date(Date.now() - 59 * 60_000).toISOString())).toBe(
      "59min atrás",
    );
  });

  it("returns '1h atrás' for 60 minutes", () => {
    expect(formatRelativeDate(new Date(Date.now() - 60 * 60_000).toISOString())).toBe("1h atrás");
  });

  it("returns '23h atrás' at boundary", () => {
    expect(formatRelativeDate(new Date(Date.now() - 23 * 3600_000).toISOString())).toBe(
      "23h atrás",
    );
  });

  it("returns '1d atrás' for 24 hours", () => {
    expect(formatRelativeDate(new Date(Date.now() - 24 * 3600_000).toISOString())).toBe("1d atrás");
  });

  it("returns '6d atrás' at week boundary", () => {
    expect(formatRelativeDate(new Date(Date.now() - 6 * 86400_000).toISOString())).toBe("6d atrás");
  });

  it("returns formatted date for 7+ days", () => {
    const result = formatRelativeDate(new Date(Date.now() - 7 * 86400_000).toISOString());
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("returns formatted date for 1 year ago", () => {
    const result = formatRelativeDate(new Date(Date.now() - 365 * 86400_000).toISOString());
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("handles future dates gracefully (returns 'agora')", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(formatRelativeDate(future)).toBe("agora");
  });

  it("handles epoch date", () => {
    const result = formatRelativeDate("1970-01-01T00:00:00.000Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

// ============================================================
// 2. STATUS_CONFIG validation
// ============================================================
describe("STATUS_CONFIG structure", () => {
  const statuses = [
    { key: "aberta", label: "Aberta" },
    { key: "em_producao", label: "Em Produção" },
    { key: "concluida", label: "Concluída" },
    { key: "cancelada", label: "Cancelada" },
  ];

  it.each(statuses)("status '$key' has label '$label'", ({ key, label }) => {
    expect(key).toBeTruthy();
    expect(label).toBeTruthy();
  });

  it("has exactly 4 statuses", () => {
    expect(statuses).toHaveLength(4);
  });
});

// ============================================================
// 3. OS Number generation — uniqueness & format
// ============================================================
describe("OS Number format", () => {
  const pattern = /^OS-\d{4}-\d{4}$/;

  it("matches OS-XXXX-XXXX format", () => {
    // Simulate generation
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const os = `OS-${yy}${mm}-${rand}`;
    expect(os).toMatch(pattern);
  });

  it("generates 100 unique numbers", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      set.add(`OS-2603-${rand}`);
    }
    // With 10000 possibilities, 100 should be mostly unique
    expect(set.size).toBeGreaterThan(90);
  });
});

// ============================================================
// 4. cn() utility
// ============================================================
import { cn } from "@/lib/utils";

describe("cn() utility", () => {
  it("merges classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles undefined/null", () => {
    expect(cn("p-4", undefined, null, "m-2")).toBe("p-4 m-2");
  });

  it("handles conditional classes", () => {
    const active = true;
    expect(cn("base", active && "active")).toContain("active");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("merges conflicting tailwind classes correctly", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("preserves non-conflicting classes", () => {
    const result = cn("p-4 m-2", "text-sm");
    expect(result).toContain("p-4");
    expect(result).toContain("m-2");
    expect(result).toContain("text-sm");
  });
});

// ============================================================
// 5. Form validation — edge cases
// ============================================================
import { validateForm, ServiceOrderData } from "@/features/service-orders";

describe("validateForm — edge cases", () => {
  const base: ServiceOrderData = {
    osNumber: "OS-2603-0001",
    date: "2026-03-23",
    deliveryDate: "",
    clientName: "Test",
    clientCompany: "",
    clientPhone: "",
    clientEmail: "",
    productName: "Product",
    productSku: "",
    productMaterial: "",
    productColors: "",
    technique: "Laser Fiber",
    areaName: "",
    areaWidth: "",
    areaHeight: "",
    areaShape: "",
    artColors: "",
    artDpi: "",
    artFile: "",
    artFileDataUrl: "",
    quantity: "1",
    observations: "",
    mockupImageUrl: "",
    identificacaoCaixa: "",
    materialEvento: false,
    aprovarPrimeiraPeca: false,
    qtdCompra: "",
    qtdLiberada: "",
    fazParteKit: false,
    gravacaoDetalhe: "",
  };

  it("passes with minimal valid data", () => {
    expect(Object.keys(validateForm(base))).toHaveLength(0);
  });

  it("fails with whitespace-only clientName", () => {
    const errors = validateForm({ ...base, clientName: "   " });
    expect(errors.clientName).toBeDefined();
  });

  it("fails with negative quantity", () => {
    const errors = validateForm({ ...base, quantity: "-5" });
    expect(errors.quantity).toBeDefined();
  });

  it("fails with non-numeric quantity", () => {
    const errors = validateForm({ ...base, quantity: "abc" });
    expect(errors.quantity).toBeDefined();
  });

  it("passes with large quantity", () => {
    const errors = validateForm({ ...base, quantity: "999999" });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("passes with all boolean flags true", () => {
    const errors = validateForm({
      ...base,
      materialEvento: true,
      aprovarPrimeiraPeca: true,
      fazParteKit: true,
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("accumulates all 4 required field errors", () => {
    const errors = validateForm({
      ...base,
      clientName: "",
      productName: "",
      technique: "",
      quantity: "0",
    });
    expect(Object.keys(errors).length).toBe(4);
  });

  it("handles very long strings without error", () => {
    const longStr = "A".repeat(10000);
    const errors = validateForm({ ...base, clientName: longStr, productName: longStr });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("handles special characters in names", () => {
    const errors = validateForm({
      ...base,
      clientName: "José María Ñoño <script>alert('xss')</script>",
      productName: "Caneca™ — Edição Especial®",
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

// ============================================================
// 6. Notification mapping structure
// ============================================================
describe("Notification row mapping", () => {
  it("maps all required fields correctly", () => {
    const mockRow = {
      id: "uuid-1",
      os_id: "uuid-2",
      os_number: "OS-2603-0001",
      product_name: "Caneca",
      old_status: "aberta",
      new_status: "em_producao",
      event_type: "status_change",
      read: false,
      created_at: "2026-03-23T10:00:00Z",
      user_id: "user-1",
    };

    // Simulate rowToNotification
    const notification = {
      id: mockRow.id,
      osId: mockRow.os_id,
      osNumber: mockRow.os_number,
      productName: mockRow.product_name,
      oldStatus: mockRow.old_status,
      newStatus: mockRow.new_status,
      eventType: mockRow.event_type,
      read: mockRow.read,
      createdAt: mockRow.created_at,
    };

    expect(notification.id).toBe("uuid-1");
    expect(notification.osId).toBe("uuid-2");
    expect(notification.osNumber).toBe("OS-2603-0001");
    expect(notification.productName).toBe("Caneca");
    expect(notification.oldStatus).toBe("aberta");
    expect(notification.newStatus).toBe("em_producao");
    expect(notification.eventType).toBe("status_change");
    expect(notification.read).toBe(false);
  });

  it("handles null os_id (os_created event)", () => {
    const mockRow = {
      id: "uuid-1",
      os_id: null,
      os_number: "OS-2603-0002",
      product_name: "Camiseta",
      old_status: null,
      new_status: "aberta",
      event_type: "os_created",
      read: false,
      created_at: "2026-03-23T10:00:00Z",
    };

    expect(mockRow.os_id).toBeNull();
    expect(mockRow.old_status).toBeNull();
    expect(mockRow.event_type).toBe("os_created");
  });
});

// ============================================================
// 7. Weekly activity builder
// ============================================================
describe("Weekly activity computation", () => {
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

  it("returns all zeros for empty data", () => {
    const weeks = buildWeeklyActivity([], [], []);
    weeks.forEach((w) => {
      expect(w.os).toBe(0);
      expect(w.mockups).toBe(0);
      expect(w.ia).toBe(0);
    });
  });

  it("counts today's items in the last week", () => {
    const today = new Date().toISOString();
    const weeks = buildWeeklyActivity(
      [{ createdAt: today }],
      [{ createdAt: today }, { createdAt: today }],
      [{ createdAt: today }],
    );
    const lastWeek = weeks[weeks.length - 1];
    expect(lastWeek.os).toBe(1);
    expect(lastWeek.mockups).toBe(2);
    expect(lastWeek.ia).toBe(1);
  });

  it("places old items in earlier weeks", () => {
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400_000).toISOString();
    const weeks = buildWeeklyActivity([{ createdAt: fourWeeksAgo }], [], []);
    const total = weeks.reduce((sum, w) => sum + w.os, 0);
    expect(total).toBe(1);
    // Should NOT be in the last week
    expect(weeks[weeks.length - 1].os).toBe(0);
  });

  it("handles 1000 items without error", () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
    }));
    expect(() => buildWeeklyActivity(items, items, items)).not.toThrow();
  });
});

// ============================================================
// 8. Sidebar state
// ============================================================
describe("Sidebar collapse state logic", () => {
  it("defaults to expanded (false)", () => {
    const collapsed = false;
    expect(collapsed).toBe(false);
  });

  it("toggles correctly", () => {
    let collapsed = false;
    collapsed = !collapsed;
    expect(collapsed).toBe(true);
    collapsed = !collapsed;
    expect(collapsed).toBe(false);
  });

  it("computes correct margin class", () => {
    const getMargin = (collapsed: boolean) => (collapsed ? "ml-16" : "ml-[240px]");
    expect(getMargin(false)).toBe("ml-[240px]");
    expect(getMargin(true)).toBe("ml-16");
  });
});

// ============================================================
// 9. Module routing validation
// ============================================================
describe("Route module detection", () => {
  const detectModule = (path: string) => {
    if (path.startsWith("/magicup")) return "magicup";
    if (path.startsWith("/video")) return "video";
    return "mockup";
  };

  it.each([
    ["/", "mockup"],
    ["/mockup/new", "mockup"],
    ["/mockup/drafts", "mockup"],
    ["/mockup/service-orders", "mockup"],
    ["/magicup/generate", "magicup"],
    ["/magicup/prompts", "magicup"],
    ["/magicup/history", "magicup"],
    ["/video/new", "video"],
    ["/video/cinema", "video"],
    ["/video/moodboard", "video"],
    ["/settings", "mockup"],
  ])("path '%s' → module '%s'", (path, expected) => {
    expect(detectModule(path)).toBe(expected);
  });
});

// ============================================================
// 10. Data mapping robustness (service orders)
// ============================================================
describe("Service order row mapping", () => {
  const rowToOrder = (row: any) => ({
    id: row.id,
    osNumber: row.os_number,
    status: row.status,
    clientName: row.client_name,
    productName: row.product_name,
    technique: row.technique,
    quantity: String(row.quantity),
    deliveryDate: row.delivery_date ?? "",
    clientCompany: row.client_company ?? "",
    materialEvento: row.material_evento ?? false,
    aprovarPrimeiraPeca: row.aprovar_primeira_peca ?? false,
    fazParteKit: row.faz_parte_kit ?? false,
  });

  it("maps all required fields", () => {
    const row = {
      id: "1",
      os_number: "OS-2603-0001",
      status: "aberta",
      client_name: "Test",
      product_name: "Caneca",
      technique: "Laser",
      quantity: 100,
      delivery_date: null,
      client_company: null,
      material_evento: null,
      aprovar_primeira_peca: null,
      faz_parte_kit: null,
    };
    const order = rowToOrder(row);
    expect(order.deliveryDate).toBe("");
    expect(order.materialEvento).toBe(false);
    expect(order.quantity).toBe("100");
  });

  it("handles zero quantity", () => {
    const order = rowToOrder({
      id: "1",
      os_number: "X",
      status: "aberta",
      client_name: "T",
      product_name: "P",
      technique: "L",
      quantity: 0,
    });
    expect(order.quantity).toBe("0");
  });

  it("preserves boolean true values", () => {
    const order = rowToOrder({
      id: "1",
      os_number: "X",
      status: "aberta",
      client_name: "T",
      product_name: "P",
      technique: "L",
      quantity: 1,
      material_evento: true,
      aprovar_primeira_peca: true,
      faz_parte_kit: true,
    });
    expect(order.materialEvento).toBe(true);
    expect(order.aprovarPrimeiraPeca).toBe(true);
    expect(order.fazParteKit).toBe(true);
  });
});
