import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { z } from "https://esm.sh/zod@3.23.8";

// Contract Definition based on ARCHITECTURE.md
const RequestSchema = z.object({
  action: z.enum(["sync_order", "fetch_inventory", "update_status"]),
  table: z.enum(["catalog_products", "service_orders", "audit_logs"]),
  params: z.object({
    id: z.string().uuid().optional(),
    filter: z.record(z.any()).optional(),
    data: z.record(z.any()).optional(),
  }),
});

const ResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    data: z.array(z.any()).or(z.record(z.any())),
    metadata: z.object({
      execution_time_ms: z.number(),
    }),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  }),
]);

Deno.test("external-db-bridge contract validation", async (t) => {
  await t.step("should validate a valid request payload", () => {
    const validPayload = {
      action: "sync_order",
      table: "service_orders",
      params: {
        data: { test: true }
      }
    };
    const result = RequestSchema.safeParse(validPayload);
    assertEquals(result.success, true);
  });

  await t.step("should fail on invalid action", () => {
    const invalidPayload = {
      action: "invalid_action",
      table: "service_orders",
      params: {}
    };
    const result = RequestSchema.safeParse(invalidPayload);
    assertEquals(result.success, false);
  });

  await t.step("should fail on unsupported table", () => {
    const invalidPayload = {
      action: "sync_order",
      table: "users", // Not in the supported list
      params: {}
    };
    const result = RequestSchema.safeParse(invalidPayload);
    assertEquals(result.success, false);
  });

  await t.step("should validate a successful response format", () => {
    const validResponse = {
      success: true,
      data: [],
      metadata: { execution_time_ms: 100 }
    };
    const result = ResponseSchema.safeParse(validResponse);
    assertEquals(result.success, true);
  });

  await t.step("should validate an error response format", () => {
    const errorResponse = {
      success: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "Error message"
      }
    };
    const result = ResponseSchema.safeParse(errorResponse);
    assertEquals(result.success, true);
  });
});
