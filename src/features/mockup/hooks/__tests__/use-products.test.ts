import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createElement } from "react";
import { useProducts, usePrintAreaTechniques } from "../use-products";

/**
 * O catálogo externo (`doufsxqlfjyuvxuezpln`) bloqueia por coluna na tabela `products`:
 * a chave anônima só lê `id`, `is_active` e `is_deleted`. Qualquer select com `name`,
 * `sku` ou `primary_image_url` volta 400/401 e o app caía no fallback de 36 produtos
 * sem imagem. Estes testes travam o contrato: a listagem usa `products` apenas para os
 * IDs e lê os dados visíveis de `product_variants`.
 */

type Row = Record<string, unknown>;

const PRODUCT_IDS = ["p-1", "p-2"];
const VARIANT_ROWS: Row[] = [
  {
    id: "v-1",
    product_id: "p-1",
    sku: "CAN-001",
    name: "Caneca Porcelana 300ml",
    color_name: "Branco",
    color_hex: "#FFFFFF",
    size_code: null,
    stock_quantity: 5,
    images: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
    selected_thumbnail: "https://cdn.example/thumb-a.jpg",
  },
  {
    id: "v-2",
    product_id: "p-1",
    sku: "CAN-001",
    name: "Caneca Porcelana 300ml",
    color_name: "Azul",
    color_hex: "#0000FF",
    size_code: null,
    stock_quantity: 7,
    images: ["https://cdn.example/c.jpg"],
    selected_thumbnail: null,
  },
];

/**
 * Linhas reais de `print_area_techniques`: 804 das linhas do catálogo têm
 * `location_name`/`location_order` nulos, por isso a UI precisa de um fallback.
 */
const PRINT_AREA_ROWS: Row[] = [
  {
    id: "pa-1",
    product_id: "p-1",
    tabela_preco_id: "tp-1",
    max_width: 8,
    max_height: 14,
    is_curved: false,
    shape: "rectangle",
    location_code: "LADO-A",
    location_name: "Lado A",
    location_order: 1,
    is_active: true,
  },
  {
    id: "pa-2",
    product_id: "p-1",
    tabela_preco_id: "tp-1",
    max_width: 6,
    max_height: 6,
    is_curved: false,
    shape: "circle",
    location_code: "TAMPA",
    location_name: null,
    location_order: null,
    is_active: true,
  },
];

/** Colunas realmente bloqueadas à chave anônima no projeto externo. */
const BLOCKED_PRODUCT_COLUMNS = [
  "name",
  "sku",
  "primary_image_url",
  "image_url",
  "category_id",
  "brand",
  "slug",
  "colors",
  "dimensions",
];

const externalSelects: { table: string; columns: string }[] = [];

function makeChain(table: string, columns: string, rows: Row[], count: number | null) {
  const chain: Row = {};
  const self = () => chain;
  for (const method of ["eq", "neq", "ilike", "in", "not", "order", "limit", "range"]) {
    chain[method] = vi.fn(self);
  }
  chain.select = vi.fn(self);
  chain.maybeSingle = vi.fn(async () => ({ data: rows[0] ?? null, error: null }));
  chain.single = vi.fn(async () => ({ data: rows[0] ?? null, error: null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null, count }).then(resolve);
  externalSelects.push({ table, columns });
  return chain;
}

vi.mock("@/lib/external-supabase", () => ({
  externalSupabase: {
    from: (table: string) => ({
      select: (columns: string) => {
        if (table === "products") {
          const requested = columns.split(",").map((c) => c.trim());
          const blocked = requested.filter((c) =>
            BLOCKED_PRODUCT_COLUMNS.includes(c.replace(/[()]/g, "")),
          );
          if (blocked.length > 0) {
            // Comportamento real do PostgREST/Supabase para coluna sem GRANT.
            return makeChain(table, columns, [], null);
          }
          return makeChain(
            table,
            columns,
            PRODUCT_IDS.map((id) => ({ id })),
            PRODUCT_IDS.length,
          );
        }
        if (table === "product_variants") {
          return makeChain(table, columns, VARIANT_ROWS, VARIANT_ROWS.length);
        }
        if (table === "print_area_techniques") {
          return makeChain(table, columns, PRINT_AREA_ROWS, PRINT_AREA_ROWS.length);
        }
        return makeChain(table, columns, [], 0);
      },
    }),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeChain("catalog_products", "*", [{ id: "fallback-1" }], 1),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  externalSelects.length = 0;
  if (typeof window !== "undefined") window.sessionStorage.clear();
});

describe("useProducts — catálogo externo com RLS por coluna", () => {
  it("não pede colunas bloqueadas de products", async () => {
    const { result } = renderHook(() => useProducts({ pageSize: 2 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const productSelects = externalSelects.filter((s) => s.table === "products");
    expect(productSelects.length).toBeGreaterThan(0);
    for (const call of productSelects) {
      const requested = call.columns.split(",").map((c) => c.trim().replace(/[()]/g, ""));
      for (const column of requested) {
        expect(BLOCKED_PRODUCT_COLUMNS).not.toContain(column);
      }
    }
  });

  it("devolve o total real do catálogo externo, não o fallback de 36", async () => {
    const { result } = renderHook(() => useProducts({ pageSize: 2 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.products.map((p) => p.id)).not.toContain("fallback-1");
  });

  it("agrega as variações de um produto em um único item com galeria e cores", async () => {
    const { result } = renderHook(() => useProducts({ pageSize: 2 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const products = result.current.data?.products ?? [];
    expect(products).toHaveLength(1);
    const [product] = products;
    expect(product.id).toBe("p-1");
    expect(product.name).toBe("Caneca Porcelana 300ml");
    expect(product.colors).toEqual(["Branco", "Azul"]);
    expect(product.stock_quantity).toBe(12);
    expect(product.images).toContain("https://cdn.example/thumb-a.jpg");
    expect(product.primary_image_url).toBe("https://cdn.example/thumb-a.jpg");
  });

  it("aplica onlyWithImages usando a galeria das variações", async () => {
    const { result } = renderHook(() => useProducts({ pageSize: 2, onlyWithImages: true }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const products = result.current.data?.products ?? [];
    expect(products).toHaveLength(1);
    expect(products[0].primary_image_url).toBeTruthy();
  });
});

describe("usePrintAreaTechniques — colunas liberadas e campos nulos", () => {
  it("não pede select('*'), que devolve 401 na chave anônima", async () => {
    const { result } = renderHook(() => usePrintAreaTechniques("p-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calls = externalSelects.filter((s) => s.table === "print_area_techniques");
    expect(calls).toHaveLength(1);
    expect(calls[0].columns).not.toContain("*");
    for (const column of calls[0].columns.split(",").map((c) => c.trim())) {
      expect(column).not.toBe("");
    }
  });

  it("cai no código da área quando location_name/location_order vêm nulos", async () => {
    const { result } = renderHook(() => usePrintAreaTechniques("p-1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rows = result.current.data ?? [];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.location_name)).toEqual(["Lado A", "TAMPA"]);
    expect(rows.map((r) => r.location_order)).toEqual([1, 0]);
    expect(rows.map((r) => r.max_width)).toEqual([8, 6]);
  });
});
