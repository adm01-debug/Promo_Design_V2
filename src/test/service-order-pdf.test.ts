import { describe, it, expect, vi } from "vitest";
import { generateServiceOrderPdf, PdfFormData } from "@/components/service-order/ServiceOrderPdf";

// Mock jspdf since we're testing logic, not actual PDF rendering
vi.mock("jspdf", () => {
  const mockDoc = {
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFillColor: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    setTextColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    setLineDashPattern: vi.fn(),
    circle: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(["line1"]),
    getTextWidth: vi.fn().mockReturnValue(50),
    addPage: vi.fn(),
    save: vi.fn(),
    output: vi.fn(),
    autoTable: vi.fn(),
    lastAutoTable: { finalY: 100 },
  };
  return {
    default: vi.fn().mockImplementation(() => mockDoc),
  };
});

vi.mock("jspdf-autotable", () => ({}));

const fullForm: PdfFormData = {
  osNumber: "OS-2503-0001",
  date: "2025-03-14",
  deliveryDate: "2025-04-01",
  clientName: "Sicoob Credplus",
  clientCompany: "Sicoob",
  clientPhone: "(11) 99999-9999",
  clientEmail: "contato@sicoob.com",
  productName: "Necessaire + plaquinha",
  productSku: "NEC-001",
  productMaterial: "Tecido",
  productColors: "Branco",
  technique: "Laser Fiber",
  areaName: "Frente",
  areaWidth: "3",
  areaHeight: "0.9",
  areaShape: "Retangular",
  artColors: "1 cor",
  artDpi: "300",
  artFile: "logo-sicoob.png",
  artFileDataUrl: "data:image/png;base64,iVBOR",
  quantity: "35",
  observations: "Reposição.",
  mockupImageUrl: "data:image/png;base64,mock",
  identificacaoCaixa: "01/02",
  materialEvento: false,
  aprovarPrimeiraPeca: false,
  qtdCompra: "35",
  qtdLiberada: "35",
  fazParteKit: false,
  gravacaoDetalhe: "Gravação Laser Escuro",
};

describe("generateServiceOrderPdf", () => {
  it("should return a jsPDF document", () => {
    const doc = generateServiceOrderPdf(fullForm);
    expect(doc).toBeDefined();
  });

  it("should call addPage for the verso", () => {
    const doc = generateServiceOrderPdf(fullForm);
    expect(doc.addPage).toHaveBeenCalled();
  });

  it("should render technique name in header", () => {
    const doc = generateServiceOrderPdf(fullForm);
    expect(doc.text).toHaveBeenCalledWith(
      "LASER FIBER",
      expect.any(Number),
      expect.any(Number),
      expect.any(Object)
    );
  });

  it("should render ticket number", () => {
    const doc = generateServiceOrderPdf(fullForm);
    expect(doc.text).toHaveBeenCalledWith(
      "#TICKET OS-2503-0001",
      expect.any(Number),
      expect.any(Number),
      expect.any(Object)
    );
  });

  it("should render mockup image when provided", () => {
    const doc = generateServiceOrderPdf(fullForm);
    expect(doc.addImage).toHaveBeenCalled();
  });

  it("should render art image when provided", () => {
    const doc = generateServiceOrderPdf(fullForm);
    // addImage called at least twice: mockup + art
    expect((doc.addImage as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("should render gabarito circles on page 2", () => {
    const doc = generateServiceOrderPdf(fullForm);
    // 17 techniques = 17 circles
    expect((doc.circle as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(17);
  });

  it("should render production sections on page 2", () => {
    const doc = generateServiceOrderPdf(fullForm);
    const textCalls = (doc.text as ReturnType<typeof vi.fn>).mock.calls.map((c: any[]) => c[0]);
    const hasSections = ["Triagem", "Gravação", "Manuseio", "Expedição"].every((s) =>
      textCalls.some((t: string) => typeof t === "string" && t.includes(s))
    );
    expect(hasSections).toBe(true);
  });

  it("should handle form without optional fields", () => {
    const minimalForm: PdfFormData = {
      ...fullForm,
      mockupImageUrl: "",
      artFileDataUrl: "",
      artFile: "",
      observations: "",
      identificacaoCaixa: "",
      gravacaoDetalhe: "",
      qtdCompra: "",
      qtdLiberada: "",
    };
    expect(() => generateServiceOrderPdf(minimalForm)).not.toThrow();
  });

  it("should handle materialEvento and aprovarPrimeiraPeca as SIM", () => {
    const doc = generateServiceOrderPdf({
      ...fullForm,
      materialEvento: true,
      aprovarPrimeiraPeca: true,
    });
    const textCalls = (doc.text as ReturnType<typeof vi.fn>).mock.calls.map((c: any[]) => c[0]);
    const hasSimEntries = textCalls.filter((t: string) => typeof t === "string" && t.includes("SIM"));
    expect(hasSimEntries.length).toBeGreaterThanOrEqual(2);
  });
});
