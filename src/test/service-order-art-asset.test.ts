import { describe, it, expect } from "vitest";
import { serviceOrderSchema, type ServiceOrderData } from "@/features/service-orders/types";
import { rowToOrder } from "@/features/service-orders/hooks/use-service-orders";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Garante que `artAssetId` (camelCase no form) é mapeado consistentemente
 * para `art_asset_id` (snake_case no banco) e recuperado corretamente.
 */

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

function makeValidForm(overrides: Partial<ServiceOrderData> = {}): ServiceOrderData {
  return {
    osNumber: "OS-0001",
    date: "2025-01-01",
    deliveryDate: "",
    clientName: "Acme",
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
    ...overrides,
  };
}

function makeRow(overrides: Partial<Tables<"service_orders">> = {}): Tables<"service_orders"> {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    user_id: "33333333-3333-4333-8333-333333333333",
    os_number: "OS-0001",
    status: "aberta",
    date: "2025-01-01",
    delivery_date: null,
    client_name: "Acme",
    client_company: null,
    client_phone: null,
    client_email: null,
    product_name: "Caneca",
    product_sku: null,
    product_material: null,
    product_colors: null,
    technique: "Laser Fiber",
    area_name: null,
    area_width: null,
    area_height: null,
    area_shape: null,
    art_colors: null,
    art_dpi: null,
    art_file: null,
    art_file_data_url: null,
    quantity: 10,
    observations: null,
    mockup_image_url: null,
    identificacao_caixa: null,
    material_evento: false,
    aprovar_primeira_peca: false,
    qtd_compra: null,
    qtd_liberada: null,
    faz_parte_kit: false,
    gravacao_detalhe: null,
    art_asset_id: null,
    organization_id: null,
    lock_version: 1,
    version: 1,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("artAssetId — Zod validation", () => {
  it("accepts null", () => {
    expect(serviceOrderSchema.safeParse(makeValidForm({ artAssetId: null })).success).toBe(true);
  });
  it("accepts undefined / omitted", () => {
    const form = makeValidForm();
    delete (form as { artAssetId?: string | null }).artAssetId;
    expect(serviceOrderSchema.safeParse(form).success).toBe(true);
  });
  it("accepts a valid UUID", () => {
    expect(serviceOrderSchema.safeParse(makeValidForm({ artAssetId: VALID_UUID })).success).toBe(true);
  });
  it("rejects an empty string", () => {
    const r = serviceOrderSchema.safeParse(makeValidForm({ artAssetId: "" }));
    expect(r.success).toBe(false);
  });
  it("rejects a non-UUID string", () => {
    const r = serviceOrderSchema.safeParse(makeValidForm({ artAssetId: "abc-123" }));
    expect(r.success).toBe(false);
  });
});

describe("artAssetId — round trip rowToOrder", () => {
  it("maps row.art_asset_id (uuid) to order.artAssetId", () => {
    const order = rowToOrder(makeRow({ art_asset_id: VALID_UUID }));
    expect(order.artAssetId).toBe(VALID_UUID);
  });
  it("maps row.art_asset_id null to order.artAssetId null", () => {
    const order = rowToOrder(makeRow({ art_asset_id: null }));
    expect(order.artAssetId).toBeNull();
  });
  it("never produces undefined for artAssetId", () => {
    const order = rowToOrder(makeRow({ art_asset_id: null }));
    expect(order.artAssetId).not.toBeUndefined();
  });
});

describe("artAssetId — list mapping", () => {
  it("each row in a list preserves its art_asset_id independently", () => {
    const rows = [
      makeRow({ id: "a", art_asset_id: VALID_UUID }),
      makeRow({ id: "b", art_asset_id: null }),
      makeRow({ id: "c", art_asset_id: "44444444-4444-4444-8444-444444444444" }),
    ];
    const orders = rows.map(rowToOrder);
    expect(orders.map((o) => o.artAssetId)).toEqual([
      VALID_UUID,
      null,
      "44444444-4444-4444-8444-444444444444",
    ]);
  });
});