// magic-up-jobs — testes de validação dos schemas de input da edge function.
import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const STYLE_ENUM = z.enum([
  "premium", "lifestyle", "flatlay", "minimal", "corporate", "ecommerce",
  "social", "outdoor",
]);

const EnqueueSchema = z.object({
  action: z.literal("enqueue"),
  organizationId: z.string().uuid(),
  prompt: z.string().trim().min(5).max(4000),
  productName: z.string().trim().max(300).nullable().optional(),
  productSku: z.string().trim().max(120).nullable().optional(),
  styles: z.array(STYLE_ENUM).min(1).max(8),
});

const ListSchema = z.object({
  action: z.literal("list"),
  organizationId: z.string().uuid(),
});

const CancelSchema = z.object({
  action: z.literal("cancel"),
  jobId: z.string().uuid(),
});

const BodySchema = z.discriminatedUnion("action", [EnqueueSchema, ListSchema, CancelSchema]);

Deno.test("magic-up-jobs - enqueue válido com 4 estilos", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Caneca premium para executivo com logo da empresa",
    productName: "Caneca Executiva",
    productSku: "CAN-001",
    styles: ["premium", "lifestyle", "flatlay", "minimal"],
  });
  assertEquals(result.success, true);
  if (result.success && result.data.action === "enqueue") {
    assertEquals(result.data.styles.length, 4);
  }
});

Deno.test("magic-up-jobs - enqueue rejeita prompt curto", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "oi",
    styles: ["premium"],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - enqueue rejeita sem estilos", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: [],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - enqueue rejeita mais de 8 estilos", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: ["premium", "lifestyle", "flatlay", "minimal", "corporate", "ecommerce", "social", "outdoor", "premium"],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - enqueue rejeita estilo desconhecido", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: ["hacker-style"],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - list válido", () => {
  const result = BodySchema.safeParse({
    action: "list",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  });
  assertEquals(result.success, true);
});

Deno.test("magic-up-jobs - cancel válido", () => {
  const result = BodySchema.safeParse({
    action: "cancel",
    jobId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  });
  assertEquals(result.success, true);
});

Deno.test("magic-up-jobs - rejeita ação desconhecida", () => {
  const result = BodySchema.safeParse({ action: "delete-everything" });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - rejeita organizationId inválido", () => {
  const result = BodySchema.safeParse({
    action: "list",
    organizationId: "not-a-uuid",
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - prompt trimmado ainda válido", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "  Caneca com logo  ",
    styles: ["premium"],
  });
  assertEquals(result.success, true);
  if (result.success && result.data.action === "enqueue") {
    assert(result.data.prompt.length >= 5);
  }
});