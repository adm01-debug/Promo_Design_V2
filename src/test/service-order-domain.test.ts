import { describe, it, expect } from "vitest";
import {
  STATUS_CONFIG,
  type OsStatus,
  validateForm,
  generateOsNumber,
  TECHNIQUES,
  type ServiceOrderData,
} from "@/features/service-orders";

// ============================================================
// STATUS_CONFIG — exhaustive tests
// ============================================================
describe("STATUS_CONFIG", () => {
  const allStatuses: OsStatus[] = ["aberta", "em_producao", "concluida", "cancelada"];

  it("contains exactly 4 statuses", () => {
    expect(Object.keys(STATUS_CONFIG)).toHaveLength(4);
  });

  allStatuses.forEach((status) => {
    describe(`status: ${status}`, () => {
      it("has a non-empty label", () => {
        expect(STATUS_CONFIG[status].label.length).toBeGreaterThan(0);
      });

      it("has a color class starting with text-", () => {
        expect(STATUS_CONFIG[status].color).toMatch(/^text-/);
      });

      it("has a bg class starting with bg-", () => {
        expect(STATUS_CONFIG[status].bg).toMatch(/^bg-/);
      });
    });
  });

  it("labels are in Portuguese", () => {
    expect(STATUS_CONFIG.aberta.label).toBe("Aberta");
    expect(STATUS_CONFIG.em_producao.label).toBe("Em Produção");
    expect(STATUS_CONFIG.concluida.label).toBe("Concluída");
    expect(STATUS_CONFIG.cancelada.label).toBe("Cancelada");
  });
});

// ============================================================
// generateOsNumber — stress tests
// ============================================================
describe("generateOsNumber — stress", () => {
  it("generates valid format", () => {
    expect(generateOsNumber()).toMatch(/^OS-\d{4}-\d{4}$/);
  });

  it("generates 200 unique numbers", () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) {
      set.add(generateOsNumber());
    }
    // With 9999 possible sequences, 200 should be mostly unique
    expect(set.size).toBeGreaterThan(180);
  });

  it("first 4 digits encode year+month", () => {
    const os = generateOsNumber();
    const yearMonth = os.slice(3, 7);
    const now = new Date();
    const expectedYM =
      now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, "0");
    expect(yearMonth).toBe(expectedYM);
  });

  it("sequence is 4 digits (0001-9999)", () => {
    for (let i = 0; i < 50; i++) {
      const os = generateOsNumber();
      const seq = parseInt(os.slice(8), 10);
      expect(seq).toBeGreaterThanOrEqual(1);
      expect(seq).toBeLessThanOrEqual(9999);
    }
  });
});

// ============================================================
// TECHNIQUES — exhaustive
// ============================================================
describe("TECHNIQUES", () => {
  it("has exactly 17 techniques", () => {
    expect(TECHNIQUES).toHaveLength(17);
  });

  it("all techniques are non-empty strings", () => {
    TECHNIQUES.forEach((t) => {
      expect(typeof t).toBe("string");
      expect(t.length).toBeGreaterThan(0);
    });
  });

  it("has no duplicates", () => {
    const unique = new Set(TECHNIQUES);
    expect(unique.size).toBe(TECHNIQUES.length);
  });

  it("includes all laser types", () => {
    expect(TECHNIQUES).toContain("Laser Fiber");
    expect(TECHNIQUES).toContain("Laser UV");
    expect(TECHNIQUES).toContain("Laser Co2");
  });

  it("includes all serigrafia types", () => {
    expect(TECHNIQUES).toContain("Serigrafia Têxtil");
    expect(TECHNIQUES).toContain("Serigrafia Vinílica Plana");
    expect(TECHNIQUES).toContain("Serigrafia Vinílica Rotativa");
  });

  it("includes DTF types", () => {
    expect(TECHNIQUES).toContain("(DTF) Transfer Digital Têxtil");
    expect(TECHNIQUES).toContain("(DTF) Transfer Digital UV");
  });

  it("includes sublimação types", () => {
    expect(TECHNIQUES).toContain("Sublimação - Caneca");
    expect(TECHNIQUES).toContain("Sublimação Têxtil");
  });

  it("includes remaining techniques", () => {
    expect(TECHNIQUES).toContain("Tampografia");
    expect(TECHNIQUES).toContain("Hot Stamping (Baixo Relevo)");
    expect(TECHNIQUES).toContain("Digital UV");
    expect(TECHNIQUES).toContain("Adesivo Resinado");
    expect(TECHNIQUES).toContain("Bordado");
    expect(TECHNIQUES).toContain("Decalque");
    expect(TECHNIQUES).toContain("Filme de Recorte");
  });
});

// ============================================================
// validateForm — comprehensive edge cases
// ============================================================
describe("validateForm — comprehensive", () => {
  const makeForm = (overrides: Partial<ServiceOrderData> = {}): ServiceOrderData => ({
    osNumber: generateOsNumber(),
    date: new Date().toISOString().slice(0, 10),
    deliveryDate: "",
    clientName: "Maria Santos",
    clientCompany: "",
    clientPhone: "",
    clientEmail: "",
    productName: "Squeeze 500ml",
    productSku: "",
    productMaterial: "",
    productColors: "",
    technique: TECHNIQUES[0],
    areaName: "",
    areaWidth: "",
    areaHeight: "",
    areaShape: "",
    artColors: "",
    artDpi: "300",
    artFile: "",
    artFileDataUrl: "",
    quantity: "100",
    observations: "",
    mockupImageUrl: "",
    identificacaoCaixa: "",
    materialEvento: false,
    aprovarPrimeiraPeca: false,
    qtdCompra: "",
    qtdLiberada: "",
    fazParteKit: false,
    gravacaoDetalhe: "",
    ...overrides,
  });

  // ---- Happy path ----
  it("valid form returns no errors", () => {
    expect(Object.keys(validateForm(makeForm()))).toHaveLength(0);
  });

  it("accepts every technique", () => {
    TECHNIQUES.forEach((tech) => {
      const errors = validateForm(makeForm({ technique: tech }));
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  // ---- Required field errors ----
  it("empty productName → error", () => {
    const errors = validateForm(makeForm({ productName: "" }));
    expect(errors.productName).toBeDefined();
  });

  it("whitespace-only productName → error", () => {
    const errors = validateForm(makeForm({ productName: "   " }));
    expect(errors.productName).toBeDefined();
  });

  it("empty clientName → error", () => {
    const errors = validateForm(makeForm({ clientName: "" }));
    expect(errors.clientName).toBeDefined();
  });

  it("whitespace-only clientName → error", () => {
    const errors = validateForm(makeForm({ clientName: "  \n  " }));
    expect(errors.clientName).toBeDefined();
  });

  it("empty technique → error", () => {
    const errors = validateForm(makeForm({ technique: "" }));
    expect(errors.technique).toBeDefined();
  });

  it("empty quantity → error", () => {
    const errors = validateForm(makeForm({ quantity: "" }));
    expect(errors.quantity).toBeDefined();
  });

  // ---- Quantity edge cases ----
  it("quantity '0' → error", () => {
    const errors = validateForm(makeForm({ quantity: "0" }));
    expect(errors.quantity).toBeDefined();
  });

  it("quantity '-1' → error", () => {
    const errors = validateForm(makeForm({ quantity: "-1" }));
    expect(errors.quantity).toBeDefined();
  });

  it("quantity '-100' → error", () => {
    const errors = validateForm(makeForm({ quantity: "-100" }));
    expect(errors.quantity).toBeDefined();
  });

  it("quantity '0.5' → error (< 1)", () => {
    const errors = validateForm(makeForm({ quantity: "0.5" }));
    expect(errors.quantity).toBeDefined();
  });

  it("quantity 'abc' → error (NaN)", () => {
    const errors = validateForm(makeForm({ quantity: "abc" }));
    expect(errors.quantity).toBeDefined();
  });

  it("quantity '1' → no error", () => {
    const errors = validateForm(makeForm({ quantity: "1" }));
    expect(errors.quantity).toBeUndefined();
  });

  it("quantity '999999' → no error", () => {
    const errors = validateForm(makeForm({ quantity: "999999" }));
    expect(errors.quantity).toBeUndefined();
  });

  it("quantity '1.5' → no error (Number >= 1)", () => {
    const errors = validateForm(makeForm({ quantity: "1.5" }));
    expect(errors.quantity).toBeUndefined();
  });

  // ---- Multiple field errors ----
  it("all 4 required fields empty → 4 errors", () => {
    const errors = validateForm(
      makeForm({
        productName: "",
        clientName: "",
        technique: "",
        quantity: "",
      }),
    );
    expect(Object.keys(errors)).toHaveLength(4);
  });

  it("2 required fields empty → 2 errors", () => {
    const errors = validateForm(
      makeForm({
        productName: "",
        quantity: "abc",
      }),
    );
    expect(Object.keys(errors)).toHaveLength(2);
  });

  // ---- Unicode / special characters ----
  it("accepts accented characters in names", () => {
    const errors = validateForm(
      makeForm({
        clientName: "José María García",
        productName: "Caneta Éco-Friendly ñ",
      }),
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("accepts emojis in names", () => {
    const errors = validateForm(
      makeForm({
        clientName: "Cliente 🎉",
        productName: "Produto ★ Premium 💎",
      }),
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("accepts CJK characters", () => {
    const errors = validateForm(
      makeForm({
        clientName: "田中太郎",
        productName: "マグカップ",
      }),
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("accepts Arabic characters", () => {
    const errors = validateForm(
      makeForm({
        clientName: "أحمد",
        productName: "كوب",
      }),
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  // ---- Optional fields don't affect validation ----
  it("optional boolean fields don't cause errors", () => {
    const errors = validateForm(
      makeForm({
        materialEvento: true,
        aprovarPrimeiraPeca: true,
        fazParteKit: true,
      }),
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("optional string fields empty don't cause errors", () => {
    const errors = validateForm(
      makeForm({
        clientCompany: "",
        clientPhone: "",
        clientEmail: "",
        productSku: "",
        observations: "",
        gravacaoDetalhe: "",
      }),
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  // ---- Error messages are in Portuguese ----
  it("error messages are in Portuguese", () => {
    const errors = validateForm(
      makeForm({
        productName: "",
        clientName: "",
        technique: "",
        quantity: "",
      }),
    );
    expect(errors.productName).toMatch(/produto/i);
    expect(errors.clientName).toMatch(/cliente/i);
    expect(errors.technique).toMatch(/técnica|gravação/i);
    expect(errors.quantity).toMatch(/quantidade/i);
  });
});

// ============================================================
// rowToOrder mapping tests (testing via STATUS_CONFIG + types)
// ============================================================
describe("StoredServiceOrder field mapping", () => {
  it("OsStatus type includes all valid statuses", () => {
    const statuses: OsStatus[] = ["aberta", "em_producao", "concluida", "cancelada"];
    statuses.forEach((s) => {
      expect(STATUS_CONFIG[s]).toBeDefined();
    });
  });

  it("STATUS_CONFIG keys match OsStatus values", () => {
    const keys = Object.keys(STATUS_CONFIG) as OsStatus[];
    expect(keys).toContain("aberta");
    expect(keys).toContain("em_producao");
    expect(keys).toContain("concluida");
    expect(keys).toContain("cancelada");
  });
});

// ============================================================
// ServiceOrderData type completeness
// ============================================================
describe("ServiceOrderData type completeness", () => {
  it("has all required fields", () => {
    const form: ServiceOrderData = {
      osNumber: "OS-2503-0001",
      date: "2025-03-01",
      deliveryDate: "2025-03-15",
      clientName: "Test",
      clientCompany: "Corp",
      clientPhone: "(11)99999-9999",
      clientEmail: "test@test.com",
      productName: "Caneca",
      productSku: "CAN-001",
      productMaterial: "Cerâmica",
      productColors: "Branco",
      technique: "Laser Fiber",
      areaName: "Lado A",
      areaWidth: "80",
      areaHeight: "60",
      areaShape: "rectangle",
      artColors: "1 cor",
      artDpi: "300",
      artFile: "logo.png",
      artFileDataUrl: "data:image/png;base64,abc",
      quantity: "100",
      observations: "Sem observações",
      mockupImageUrl: "https://example.com/mockup.png",
      identificacaoCaixa: "CX-001",
      materialEvento: true,
      aprovarPrimeiraPeca: true,
      qtdCompra: "200",
      qtdLiberada: "100",
      fazParteKit: true,
      gravacaoDetalhe: "Gravação Laser Escuro",
    };

    // Verify all fields are accessible
    expect(form.osNumber).toBeDefined();
    expect(form.identificacaoCaixa).toBeDefined();
    expect(form.materialEvento).toBe(true);
    expect(form.aprovarPrimeiraPeca).toBe(true);
    expect(form.fazParteKit).toBe(true);
    expect(form.gravacaoDetalhe).toBe("Gravação Laser Escuro");
  });
});
