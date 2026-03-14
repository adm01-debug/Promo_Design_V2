import { describe, it, expect } from "vitest";
import {
  ServiceOrderData,
  TECHNIQUES,
  generateOsNumber,
  validateForm,
} from "@/components/service-order/types";

describe("generateOsNumber", () => {
  it("should generate OS number with correct format", () => {
    const os = generateOsNumber();
    expect(os).toMatch(/^OS-\d{4}-\d{4}$/);
  });

  it("should generate unique numbers", () => {
    const numbers = new Set(Array.from({ length: 20 }, () => generateOsNumber()));
    expect(numbers.size).toBeGreaterThan(1);
  });
});

describe("TECHNIQUES", () => {
  it("should contain all 17 techniques from the real gabarito", () => {
    expect(TECHNIQUES).toHaveLength(17);
  });

  const expectedTechniques = [
    "Laser Fiber", "Laser UV", "Laser Co2",
    "Serigrafia Têxtil", "Serigrafia Vinílica Plana", "Serigrafia Vinílica Rotativa",
    "Tampografia",
    "(DTF) Transfer Digital Têxtil", "(DTF) Transfer Digital UV",
    "Sublimação - Caneca", "Sublimação Têxtil",
    "Hot Stamping (Baixo Relevo)",
    "Digital UV", "Adesivo Resinado", "Bordado", "Decalque", "Filme de Recorte",
  ];

  it.each(expectedTechniques)("should include '%s'", (technique) => {
    expect(TECHNIQUES).toContain(technique);
  });
});

describe("validateForm", () => {
  const validForm: ServiceOrderData = {
    osNumber: "OS-2503-0001",
    date: "2025-03-14",
    deliveryDate: "2025-04-01",
    clientName: "João Silva",
    clientCompany: "Empresa LTDA",
    clientPhone: "(11) 99999-9999",
    clientEmail: "joao@empresa.com",
    productName: "Caneca 350ml",
    productSku: "CAN-350",
    productMaterial: "Cerâmica",
    productColors: "Branco",
    technique: "Sublimação - Caneca",
    areaName: "Frente",
    areaWidth: "8",
    areaHeight: "9",
    areaShape: "Retangular",
    artColors: "CMYK",
    artDpi: "300",
    artFile: "logo.png",
    artFileDataUrl: "",
    quantity: "500",
    observations: "Reposição",
    mockupImageUrl: "",
    identificacaoCaixa: "01/02",
    materialEvento: true,
    aprovarPrimeiraPeca: false,
    qtdCompra: "500",
    qtdLiberada: "500",
    fazParteKit: false,
    gravacaoDetalhe: "Sublimação full color",
  };

  it("should pass with all valid fields", () => {
    const errors = validateForm(validForm);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("should fail when productName is empty", () => {
    const errors = validateForm({ ...validForm, productName: "" });
    expect(errors.productName).toBeDefined();
  });

  it("should fail when clientName is empty", () => {
    const errors = validateForm({ ...validForm, clientName: "" });
    expect(errors.clientName).toBeDefined();
  });

  it("should fail when technique is empty", () => {
    const errors = validateForm({ ...validForm, technique: "" });
    expect(errors.technique).toBeDefined();
  });

  it("should fail when quantity is 0", () => {
    const errors = validateForm({ ...validForm, quantity: "0" });
    expect(errors.quantity).toBeDefined();
  });

  it("should fail when quantity is empty", () => {
    const errors = validateForm({ ...validForm, quantity: "" });
    expect(errors.quantity).toBeDefined();
  });

  it("should collect multiple errors at once", () => {
    const errors = validateForm({
      ...validForm,
      productName: "",
      clientName: "",
      technique: "",
      quantity: "",
    });
    expect(Object.keys(errors)).toHaveLength(4);
  });

  it("should accept new boolean/string fields without affecting validation", () => {
    const errors = validateForm({
      ...validForm,
      materialEvento: true,
      aprovarPrimeiraPeca: true,
      fazParteKit: true,
      identificacaoCaixa: "",
      gravacaoDetalhe: "",
      qtdCompra: "",
      qtdLiberada: "",
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe("ServiceOrderData type completeness", () => {
  it("should have all new fields from the real template", () => {
    const form: ServiceOrderData = {
      osNumber: "", date: "", deliveryDate: "", clientName: "", clientCompany: "",
      clientPhone: "", clientEmail: "", productName: "", productSku: "",
      productMaterial: "", productColors: "", technique: "", areaName: "",
      areaWidth: "", areaHeight: "", areaShape: "", artColors: "", artDpi: "",
      artFile: "", artFileDataUrl: "", quantity: "", observations: "",
      mockupImageUrl: "",
      // New fields
      identificacaoCaixa: "",
      materialEvento: false,
      aprovarPrimeiraPeca: false,
      qtdCompra: "",
      qtdLiberada: "",
      fazParteKit: false,
      gravacaoDetalhe: "",
    };
    expect(form).toHaveProperty("identificacaoCaixa");
    expect(form).toHaveProperty("materialEvento");
    expect(form).toHaveProperty("aprovarPrimeiraPeca");
    expect(form).toHaveProperty("qtdCompra");
    expect(form).toHaveProperty("qtdLiberada");
    expect(form).toHaveProperty("fazParteKit");
    expect(form).toHaveProperty("gravacaoDetalhe");
  });
});
