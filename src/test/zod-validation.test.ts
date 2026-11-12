import { describe, it, expect } from "vitest";
import { serviceOrderSchema, validateForm } from "@/features/service-orders";

describe("Zod serviceOrderSchema", () => {
  const validData = {
    osNumber: "OS-2604-0001",
    date: "2026-04-03",
    deliveryDate: "",
    clientName: "Test Client",
    clientCompany: "",
    clientPhone: "",
    clientEmail: "",
    productName: "Caneca",
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
  };

  it("validates valid data successfully", () => {
    const result = serviceOrderSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects empty clientName", () => {
    const result = serviceOrderSchema.safeParse({ ...validData, clientName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only clientName", () => {
    const errors = validateForm({ ...validData, clientName: "   " });
    expect(errors.clientName).toBeDefined();
  });

  it("rejects quantity of 0", () => {
    const errors = validateForm({ ...validData, quantity: "0" });
    expect(errors.quantity).toBeDefined();
  });

  it("rejects non-numeric quantity", () => {
    const errors = validateForm({ ...validData, quantity: "abc" });
    expect(errors.quantity).toBeDefined();
  });

  it("rejects negative quantity", () => {
    const errors = validateForm({ ...validData, quantity: "-5" });
    expect(errors.quantity).toBeDefined();
  });

  it("accepts valid quantity", () => {
    const errors = validateForm({ ...validData, quantity: "500" });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("rejects empty technique", () => {
    const errors = validateForm({ ...validData, technique: "" });
    expect(errors.technique).toBeDefined();
  });

  it("accumulates all errors", () => {
    const errors = validateForm({
      ...validData,
      clientName: "",
      productName: "",
      technique: "",
      quantity: "0",
    });
    expect(Object.keys(errors).length).toBe(4);
  });
});
