import { describe, it, expect } from "vitest";

// ============================================================
// Barrel export tests — verify feature folders re-export correctly
// ============================================================

describe("Feature barrel: service-orders", () => {
  it("re-exports STATUS_CONFIG", async () => {
    const mod = await import("@/features/service-orders");
    expect(mod.STATUS_CONFIG).toBeDefined();
    expect(mod.STATUS_CONFIG.aberta).toBeDefined();
  });

  it("re-exports TECHNIQUES", async () => {
    const mod = await import("@/features/service-orders");
    expect(mod.TECHNIQUES).toHaveLength(17);
  });

  it("re-exports validateForm", async () => {
    const mod = await import("@/features/service-orders");
    expect(typeof mod.validateForm).toBe("function");
  });

  it("re-exports generateOsNumber", async () => {
    const mod = await import("@/features/service-orders");
    expect(typeof mod.generateOsNumber).toBe("function");
    expect(mod.generateOsNumber()).toMatch(/^OS-\d{4}-\d{4}$/);
  });
});

describe("Feature barrel: mockup", () => {
  it("re-exports getProductImageUrl", async () => {
    const mod = await import("@/features/mockup");
    expect(typeof mod.getProductImageUrl).toBe("function");
  });

  it("re-exports PERSPECTIVE_PRESETS", async () => {
    const mod = await import("@/features/mockup");
    expect(mod.PERSPECTIVE_PRESETS).toHaveLength(5);
  });

  it("re-exports calculateAutoFit", async () => {
    const mod = await import("@/features/mockup");
    expect(typeof mod.calculateAutoFit).toBe("function");
  });

  it("re-exports cmToPx and pxToCm", async () => {
    const mod = await import("@/features/mockup");
    expect(typeof mod.cmToPx).toBe("function");
    expect(typeof mod.pxToCm).toBe("function");
  });
});

describe("Feature barrel: magic-up", () => {
  it("re-exports SAMPLE_PROMPTS", async () => {
    const mod = await import("@/features/magic-up");
    expect(mod.SAMPLE_PROMPTS.length).toBeGreaterThan(0);
  });

  it("re-exports PROMPT_CATEGORIES", async () => {
    const mod = await import("@/features/magic-up");
    expect(mod.PROMPT_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("re-exports INSPIRATION_GALLERY", async () => {
    const mod = await import("@/features/magic-up");
    expect(mod.INSPIRATION_GALLERY.length).toBeGreaterThan(0);
  });
});
