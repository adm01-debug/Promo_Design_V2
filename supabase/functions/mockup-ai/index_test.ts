import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { z } from "https://esm.sh/zod@3.23.8";

// ─── Zod Schema Unit Tests (mirrors edge function schemas) ──

const RemoveBgSchema = z.object({
  action: z.literal("remove-bg"),
  imageBase64: z.string().min(10).max(10_000_000),
});

const SuggestPlacementSchema = z.object({
  action: z.literal("suggest-placement"),
  productName: z.string().max(500).optional(),
  templateId: z.string().max(100).optional(),
  areaWidth: z.number().min(0.1).max(200).optional(),
  areaHeight: z.number().min(0.1).max(200).optional(),
});

const RequestSchema = z.discriminatedUnion("action", [RemoveBgSchema, SuggestPlacementSchema]);

Deno.test("RequestSchema - valid remove-bg", () => {
  const result = RequestSchema.safeParse({
    action: "remove-bg",
    imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
  });
  assertEquals(result.success, true);
});

Deno.test("RequestSchema - remove-bg rejects missing imageBase64", () => {
  const result = RequestSchema.safeParse({ action: "remove-bg" });
  assertEquals(result.success, false);
});

Deno.test("RequestSchema - remove-bg rejects short imageBase64", () => {
  const result = RequestSchema.safeParse({ action: "remove-bg", imageBase64: "short" });
  assertEquals(result.success, false);
});

Deno.test("RequestSchema - valid suggest-placement minimal", () => {
  const result = RequestSchema.safeParse({ action: "suggest-placement" });
  assertEquals(result.success, true);
});

Deno.test("RequestSchema - valid suggest-placement full", () => {
  const result = RequestSchema.safeParse({
    action: "suggest-placement",
    productName: "Caneca 300ml",
    templateId: "tpl-001",
    areaWidth: 15,
    areaHeight: 10,
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.action, "suggest-placement");
    assertExists(result.data.productName);
  }
});

Deno.test("RequestSchema - rejects unknown action", () => {
  const result = RequestSchema.safeParse({ action: "hack-server" });
  assertEquals(result.success, false);
});

Deno.test("RequestSchema - rejects missing action", () => {
  const result = RequestSchema.safeParse({ imageBase64: "abcdef1234" });
  assertEquals(result.success, false);
});

Deno.test("RequestSchema - rejects productName over 500 chars", () => {
  const result = RequestSchema.safeParse({
    action: "suggest-placement",
    productName: "x".repeat(501),
  });
  assertEquals(result.success, false);
});

Deno.test("RequestSchema - rejects areaWidth out of range", () => {
  const negativeWidth = RequestSchema.safeParse({
    action: "suggest-placement",
    areaWidth: 0,
  });
  assertEquals(negativeWidth.success, false);

  const tooLarge = RequestSchema.safeParse({
    action: "suggest-placement",
    areaWidth: 201,
  });
  assertEquals(tooLarge.success, false);
});

Deno.test("RequestSchema - accepts edge values for dimensions", () => {
  const result = RequestSchema.safeParse({
    action: "suggest-placement",
    areaWidth: 0.1,
    areaHeight: 200,
  });
  assertEquals(result.success, true);
});

Deno.test("RequestSchema - rejects non-object input", () => {
  assertEquals(RequestSchema.safeParse(null).success, false);
  assertEquals(RequestSchema.safeParse("string").success, false);
  assertEquals(RequestSchema.safeParse(42).success, false);
  assertEquals(RequestSchema.safeParse([]).success, false);
});
