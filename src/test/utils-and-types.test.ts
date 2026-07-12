import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
import { getProductImageUrl } from "@/features/mockup";
import type { DbProduct, DbProductImage, DbPrintAreaTechnique, DbCategory, DbProductVariant } from "@/features/mockup";

// ============================================================
// cn() utility — exhaustive tests
// ============================================================
describe("cn() — class merging", () => {
  it("merges simple classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles undefined", () => {
    expect(cn("a", undefined)).toBe("a");
  });

  it("handles null", () => {
    expect(cn("a", null)).toBe("a");
  });

  it("handles false", () => {
    expect(cn("a", false)).toBe("a");
  });

  it("handles empty string", () => {
    expect(cn("a", "")).toBe("a");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
  });

  it("handles conditional false", () => {
    const isActive = false;
    expect(cn("base", isActive && "active")).toBe("base");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("resolves text color conflicts", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("resolves background color conflicts", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("keeps non-conflicting classes", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("handles arrays", () => {
    expect(cn(["a", "b"])).toBe("a b");
  });

  it("handles nested conditionals", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles only falsy values", () => {
    expect(cn(undefined, null, false, "")).toBe("");
  });

  it("resolves complex Tailwind conflicts", () => {
    expect(cn("rounded-lg", "rounded-xl")).toBe("rounded-xl");
  });

  it("preserves responsive prefixes", () => {
    expect(cn("md:p-4", "lg:p-8")).toBe("md:p-4 lg:p-8");
  });

  it("resolves same responsive prefix conflicts", () => {
    expect(cn("md:p-4", "md:p-8")).toBe("md:p-8");
  });
});

// ============================================================
// getProductImageUrl
// ============================================================
describe("getProductImageUrl", () => {
  it("returns primary_image_url when available", () => {
    const product = { primary_image_url: "https://cdn.example.com/primary.jpg", image_url: "https://cdn.example.com/fallback.jpg" };
    expect(getProductImageUrl(product)).toBe("https://cdn.example.com/primary.jpg");
  });

  it("falls back to image_url when primary is null", () => {
    const product = { primary_image_url: null, image_url: "https://cdn.example.com/fallback.jpg" };
    expect(getProductImageUrl(product)).toBe("https://cdn.example.com/fallback.jpg");
  });

  it("returns placeholder when both are null", () => {
    const product = { primary_image_url: null, image_url: null };
    expect(getProductImageUrl(product)).toBe("/placeholder.svg");
  });

  it("returns primary even if empty string (truthy check)", () => {
    const product = { primary_image_url: "", image_url: "https://cdn.example.com/fallback.jpg" };
    // Empty string is falsy, so should fall back
    expect(getProductImageUrl(product)).toBe("https://cdn.example.com/fallback.jpg");
  });

  it("handles both undefined", () => {
    const product: Pick<DbProduct, "primary_image_url" | "image_url"> = {
      primary_image_url: null,
      image_url: null,
    };
    expect(getProductImageUrl(product)).toBe("/placeholder.svg");
  });
});

// ============================================================
// DbProduct type validation
// ============================================================
describe("DbProduct type shape", () => {
  const makeProduct = (overrides: Partial<DbProduct> = {}): DbProduct => ({
    id: "uuid-123",
    name: "Caneca 350ml",
    description: null,
    short_description: "Caneca branca",
    sku: "CAN-350",
    category_id: "cat-1",
    supplier_id: null,
    primary_image_url: "https://cdn.example.com/caneca.jpg",
    images: [],
    image_url: null,
    allows_personalization: true,
    personalization_areas: [],
    engraving_type: "laser",
    colors: ["branco", "preto"],
    materials: ["cerâmica"],
    dimensions: { width_cm: 8, height_cm: 10, shape_type: "cylindrical" },
    weight_g: 300,
    length_cm: null,
    width_cm: 8,
    height_cm: 10,
    diameter_cm: 8,
    shape_type: "cylindrical",
    is_active: true,
    stock_quantity: 500,
    brand: "PromoBrindes",
    slug: "caneca-350ml",
    is_kit: false,
    is_textil: false,
    has_colors: true,
    min_quantity: 50,
    supply_mode: "stock",
    ...overrides,
  });

  it("creates valid product with all fields", () => {
    const product = makeProduct();
    expect(product.id).toBe("uuid-123");
    expect(product.name).toBe("Caneca 350ml");
    expect(product.is_active).toBe(true);
  });

  it("handles null optional fields", () => {
    const product = makeProduct({ description: null, supplier_id: null, brand: null });
    expect(product.description).toBeNull();
    expect(product.supplier_id).toBeNull();
    expect(product.brand).toBeNull();
  });

  it("handles empty arrays", () => {
    const product = makeProduct({ colors: [], materials: [], images: [] });
    expect(product.colors).toHaveLength(0);
    expect(product.materials).toHaveLength(0);
    expect(product.images).toHaveLength(0);
  });

  it("handles dimensions with all fields", () => {
    const product = makeProduct({
      dimensions: { width_cm: 10, height_cm: 15, length_cm: 5, shape_type: "rectangle", diameter_cm: 0 },
    });
    expect(product.dimensions?.width_cm).toBe(10);
    expect(product.dimensions?.shape_type).toBe("rectangle");
  });

  it("handles null dimensions", () => {
    const product = makeProduct({ dimensions: null });
    expect(product.dimensions).toBeNull();
  });
});

// ============================================================
// DbCategory type validation
// ============================================================
describe("DbCategory type shape", () => {
  it("creates valid category", () => {
    const cat: DbCategory = {
      id: "cat-1",
      name: "Drinkware",
      slug: "drinkware",
      parent_id: null,
      image_url: "https://cdn.example.com/drinkware.jpg",
      is_active: true,
      level: 1,
      full_path_readable: "Drinkware",
      products_count: 42,
    };
    expect(cat.name).toBe("Drinkware");
    expect(cat.products_count).toBe(42);
  });

  it("supports nested categories", () => {
    const child: DbCategory = {
      id: "cat-2",
      name: "Canecas",
      slug: "canecas",
      parent_id: "cat-1",
      image_url: null,
      is_active: true,
      level: 2,
      full_path_readable: "Drinkware > Canecas",
      products_count: 15,
    };
    expect(child.parent_id).toBe("cat-1");
    expect(child.level).toBe(2);
  });
});

// ============================================================
// DbProductVariant type validation
// ============================================================
describe("DbProductVariant type shape", () => {
  it("creates variant with color", () => {
    const variant: DbProductVariant = {
      id: "var-1",
      product_id: "prod-1",
      sku: "CAN-350-BLK",
      name: "Caneca Preta",
      attributes: { size: "350ml" },
      stock_quantity: 100,
      color_name: "Preto",
      color_hex: "#000000",
      selected_thumbnail: "https://cdn.example.com/preto.jpg",
      is_active: true,
    };
    expect(variant.color_name).toBe("Preto");
    expect(variant.stock_quantity).toBe(100);
  });

  it("handles variant without color", () => {
    const variant: DbProductVariant = {
      id: "var-2",
      product_id: "prod-1",
      sku: "CAN-350-STD",
      name: "Standard",
      attributes: {},
      stock_quantity: 0,
      color_name: null,
      color_hex: null,
      selected_thumbnail: null,
      is_active: true,
    };
    expect(variant.color_name).toBeNull();
    expect(variant.stock_quantity).toBe(0);
  });
});

// ============================================================
// DbPrintAreaTechnique type validation
// ============================================================
describe("DbPrintAreaTechnique type shape", () => {
  it("creates valid print area", () => {
    const area: DbPrintAreaTechnique = {
      id: "area-1",
      product_id: "prod-1",
      tabela_preco_id: "tab-1",
      max_width: 80,
      max_height: 60,
      is_curved: false,
      shape: "rectangle",
      location_code: "LADO-A",
      location_name: "Lado A",
      location_order: 1,
      gravacao_largura_max: 80,
      gravacao_altura_max: 60,
      is_active: true,
    };
    expect(area.location_code).toBe("LADO-A");
    expect(area.max_width).toBe(80);
  });

  it("supports curved surface area", () => {
    const area: DbPrintAreaTechnique = {
      id: "area-2",
      product_id: "prod-1",
      tabela_preco_id: "tab-2",
      max_width: 200,
      max_height: 80,
      is_curved: true,
      shape: "circle",
      location_code: "TAMPA",
      location_name: "Tampa",
      location_order: 2,
      gravacao_largura_max: 180,
      gravacao_altura_max: 70,
      is_active: true,
    };
    expect(area.is_curved).toBe(true);
    expect(area.shape).toBe("circle");
  });
});

// ============================================================
// DbProductImage type validation
// ============================================================
describe("DbProductImage type shape", () => {
  it("creates valid product image", () => {
    const img: DbProductImage = {
      id: "img-1",
      product_id: "prod-1",
      variant_id: null,
      color_id: null,
      url_cdn: "https://cdn.example.com/img.jpg",
      url_original: "https://storage.example.com/original.jpg",
      filename: "caneca-branca.jpg",
      image_type: "main",
      is_primary: true,
      display_order: 0,
      applies_to_color: false,
      alt_text: "Caneca branca 350ml",
      title_text: null,
      is_active: true,
    };
    expect(img.is_primary).toBe(true);
    expect(img.image_type).toBe("main");
  });

  it("supports color-specific images", () => {
    const img: DbProductImage = {
      id: "img-2",
      product_id: "prod-1",
      variant_id: "var-1",
      color_id: "color-1",
      url_cdn: "https://cdn.example.com/preto.jpg",
      url_original: null,
      filename: "caneca-preta.jpg",
      image_type: "detail",
      is_primary: false,
      display_order: 1,
      applies_to_color: true,
      alt_text: null,
      title_text: null,
      is_active: true,
    };
    expect(img.applies_to_color).toBe(true);
    expect(img.variant_id).toBe("var-1");
  });
});
