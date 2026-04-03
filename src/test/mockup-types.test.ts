import { describe, it, expect } from "vitest";
import {
  SAMPLE_PRODUCTS,
  SAMPLE_PROMPTS,
  PROMPT_CATEGORIES,
  INSPIRATION_GALLERY,
} from "@/features/magic-up";
import type {
  Product,
  CustomizationArea,
  PromptTemplate,
  InspirationItem,
  Technique,
} from "@/lib/mockup-types";

// ============================================================
// SAMPLE_PRODUCTS
// ============================================================
describe("SAMPLE_PRODUCTS", () => {
  it("has at least 1 product", () => {
    expect(SAMPLE_PRODUCTS.length).toBeGreaterThan(0);
  });

  it("all products have required fields", () => {
    SAMPLE_PRODUCTS.forEach((product: Product) => {
      expect(product.id).toBeTruthy();
      expect(product.name).toBeTruthy();
      expect(product.imageUrl).toBeTruthy();
      expect(product.category).toBeTruthy();
      expect(Array.isArray(product.areas)).toBe(true);
    });
  });

  it("all product IDs are unique", () => {
    const ids = SAMPLE_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all products have at least one customization area", () => {
    SAMPLE_PRODUCTS.forEach((product) => {
      expect(product.areas.length).toBeGreaterThan(0);
    });
  });

  it("all customization areas have valid coordinates", () => {
    SAMPLE_PRODUCTS.forEach((product) => {
      product.areas.forEach((area: CustomizationArea) => {
        expect(area.x).toBeGreaterThanOrEqual(0);
        expect(area.y).toBeGreaterThanOrEqual(0);
        expect(area.width).toBeGreaterThan(0);
        expect(area.height).toBeGreaterThan(0);
        expect(area.widthCm).toBeGreaterThan(0);
        expect(area.heightCm).toBeGreaterThan(0);
      });
    });
  });

  it("all areas have at least one technique", () => {
    SAMPLE_PRODUCTS.forEach((product) => {
      product.areas.forEach((area) => {
        expect(area.techniques.length).toBeGreaterThan(0);
        area.techniques.forEach((tech: Technique) => {
          expect(["laser", "serigrafia", "uv"]).toContain(tech);
        });
      });
    });
  });
});

// ============================================================
// PROMPT_CATEGORIES
// ============================================================
describe("PROMPT_CATEGORIES", () => {
  it("has at least 3 categories", () => {
    expect(PROMPT_CATEGORIES.length).toBeGreaterThanOrEqual(3);
  });

  it("all categories are non-empty strings", () => {
    PROMPT_CATEGORIES.forEach((cat) => {
      expect(typeof cat).toBe("string");
      expect(cat.length).toBeGreaterThan(0);
    });
  });

  it("has no duplicates", () => {
    const unique = new Set(PROMPT_CATEGORIES);
    expect(unique.size).toBe(PROMPT_CATEGORIES.length);
  });
});

// ============================================================
// SAMPLE_PROMPTS
// ============================================================
describe("SAMPLE_PROMPTS", () => {
  it("has at least 5 prompts", () => {
    expect(SAMPLE_PROMPTS.length).toBeGreaterThanOrEqual(5);
  });

  it("all prompts have required fields", () => {
    SAMPLE_PROMPTS.forEach((prompt: PromptTemplate) => {
      expect(prompt.id).toBeTruthy();
      expect(prompt.category).toBeTruthy();
      expect(prompt.title).toBeTruthy();
      expect(prompt.prompt).toBeTruthy();
      expect(Array.isArray(prompt.tags)).toBe(true);
    });
  });

  it("all prompt IDs are unique", () => {
    const ids = SAMPLE_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all prompt categories exist in PROMPT_CATEGORIES", () => {
    SAMPLE_PROMPTS.forEach((prompt) => {
      expect(PROMPT_CATEGORIES).toContain(prompt.category);
    });
  });

  it("all prompts have at least one tag", () => {
    SAMPLE_PROMPTS.forEach((prompt) => {
      expect(prompt.tags.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// INSPIRATION_GALLERY
// ============================================================
describe("INSPIRATION_GALLERY", () => {
  it("has at least 3 items", () => {
    expect(INSPIRATION_GALLERY.length).toBeGreaterThanOrEqual(3);
  });

  it("all items have required fields", () => {
    INSPIRATION_GALLERY.forEach((item: InspirationItem) => {
      expect(item.id).toBeTruthy();
      expect(item.prompt).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.thumbnail).toBeTruthy();
      expect(Array.isArray(item.tags)).toBe(true);
    });
  });

  it("all item IDs are unique", () => {
    const ids = INSPIRATION_GALLERY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all item categories exist in PROMPT_CATEGORIES", () => {
    INSPIRATION_GALLERY.forEach((item) => {
      expect(PROMPT_CATEGORIES).toContain(item.category);
    });
  });
});

// ============================================================
// Technique type validation
// ============================================================
describe("Technique type", () => {
  it("only allows valid technique values", () => {
    const validTechniques: Technique[] = ["laser", "serigrafia", "uv"];
    validTechniques.forEach((t) => {
      expect(typeof t).toBe("string");
    });
  });
});

// ============================================================
// Product + Area cross-validation
// ============================================================
describe("Product-Area relationships", () => {
  it("each product area has a unique ID within the product", () => {
    SAMPLE_PRODUCTS.forEach((product) => {
      const areaIds = product.areas.map((a) => a.id);
      expect(new Set(areaIds).size).toBe(areaIds.length);
    });
  });

  it("area names are human-readable", () => {
    SAMPLE_PRODUCTS.forEach((product) => {
      product.areas.forEach((area) => {
        expect(area.name.length).toBeGreaterThan(0);
        // Names should not be UUIDs or codes
        expect(area.name).not.toMatch(/^[0-9a-f]{8}-/);
      });
    });
  });
});
