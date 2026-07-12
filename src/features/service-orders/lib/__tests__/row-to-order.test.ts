import { describe, it, expect } from "vitest";
import { rowToOrder } from "@/features/service-orders/hooks/use-service-orders";
import type { Tables } from "@/integrations/supabase/types";

type Row = Tables<"service_orders">;

/**
 * Minimal but type-complete DB row builder. Every nullable text column is
 * `null` by default so we exercise the `?? ""` coalescing branch in
 * `rowToOrder` — the exact transformation the list page relies on.
 */
function makeRow(overrides: Partial<Row> = {}): Row {
  const base: Row = {
    id: "00000000-0000-0000-0000-000000000001",
    os_number: "OS-0001",
    status: "aberta",
    date: "2025-01-01",
    delivery_date: null,
    client_name: "Cliente A",
    client_company: null,
    client_phone: null,
    client_email: null,
    product_name: "Caneca 350ml",
    product_sku: null,
    product_material: null,
    product_colors: null,
    technique: "Serigrafia",
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
    material_evento: null,
    aprovar_primeira_peca: null,
    qtd_compra: null,
    qtd_liberada: null,
    faz_parte_kit: null,
    gravacao_detalhe: null,
    art_asset_id: null,
    lock_version: 1,
    deleted_at: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    organization_id: "00000000-0000-0000-0000-000000000000",
    created_by: "00000000-0000-0000-0000-000000000000",
  } as Row;
  return { ...base, ...overrides };
}

describe("rowToOrder — nullable coercion", () => {
  it("coalesces every nullable text field to an empty string", () => {
    const o = rowToOrder(makeRow());
    expect(o.deliveryDate).toBe("");
    expect(o.clientCompany).toBe("");
    expect(o.clientPhone).toBe("");
    expect(o.clientEmail).toBe("");
    expect(o.productSku).toBe("");
    expect(o.productMaterial).toBe("");
    expect(o.productColors).toBe("");
    expect(o.areaName).toBe("");
    expect(o.areaWidth).toBe("");
    expect(o.areaHeight).toBe("");
    expect(o.areaShape).toBe("");
    expect(o.artColors).toBe("");
    expect(o.artDpi).toBe("");
    expect(o.artFile).toBe("");
    expect(o.artFileDataUrl).toBe("");
    expect(o.observations).toBe("");
    expect(o.mockupImageUrl).toBe("");
    expect(o.identificacaoCaixa).toBe("");
    expect(o.qtdCompra).toBe("");
    expect(o.qtdLiberada).toBe("");
    expect(o.gravacaoDetalhe).toBe("");
  });

  it("coalesces booleans to false when null", () => {
    const o = rowToOrder(makeRow());
    expect(o.materialEvento).toBe(false);
    expect(o.aprovarPrimeiraPeca).toBe(false);
    expect(o.fazParteKit).toBe(false);
  });

  it("preserves booleans when explicitly true", () => {
    const o = rowToOrder(
      makeRow({ material_evento: true, aprovar_primeira_peca: true, faz_parte_kit: true }),
    );
    expect(o.materialEvento).toBe(true);
    expect(o.aprovarPrimeiraPeca).toBe(true);
    expect(o.fazParteKit).toBe(true);
  });

  it("keeps non-null text values verbatim", () => {
    const o = rowToOrder(
      makeRow({
        client_company: "Acme Corp",
        product_sku: "CAN-350",
        observations: "  cuidado  ",
      }),
    );
    expect(o.clientCompany).toBe("Acme Corp");
    expect(o.productSku).toBe("CAN-350");
    expect(o.observations).toBe("  cuidado  "); // no trimming — intentional
  });
});

describe("rowToOrder — quantity coercion", () => {
  it("stringifies numeric quantity", () => {
    expect(rowToOrder(makeRow({ quantity: 42 })).quantity).toBe("42");
  });

  it("stringifies zero without dropping to empty string", () => {
    expect(rowToOrder(makeRow({ quantity: 0 })).quantity).toBe("0");
  });
});

describe("rowToOrder — optimistic-concurrency & soft-delete metadata", () => {
  it("defaults lockVersion to 1 when missing", () => {
    // Cast: strip lock_version to simulate a legacy row.
    const partial = makeRow();
    delete (partial as Partial<Row>).lock_version;
    expect(rowToOrder(partial as Row).lockVersion).toBe(1);
  });

  it("preserves an explicit lockVersion", () => {
    expect(rowToOrder(makeRow({ lock_version: 7 })).lockVersion).toBe(7);
  });

  it("preserves deletedAt when set", () => {
    const iso = "2025-06-01T10:00:00.000Z";
    expect(rowToOrder(makeRow({ deleted_at: iso })).deletedAt).toBe(iso);
  });

  it("normalizes art_asset_id null to null (not undefined)", () => {
    expect(rowToOrder(makeRow({ art_asset_id: null })).artAssetId).toBeNull();
  });
});

describe("rowToOrder — status pass-through", () => {
  it("keeps all four legal statuses", () => {
    for (const s of ["aberta", "em_producao", "concluida", "cancelada"] as const) {
      expect(rowToOrder(makeRow({ status: s })).status).toBe(s);
    }
  });
});
