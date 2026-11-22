// magic-up-jobs — testes de validação dos schemas de input da edge function.
import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const STYLE_ENUM = z.union([
  z.enum([
    "premium",
    "lifestyle",
    "flatlay",
    "minimal",
    "corporate",
    "ecommerce",
    "social",
    "outdoor",
  ]),
  z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "slug inválido"),
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
    styles: [
      "premium",
      "lifestyle",
      "flatlay",
      "minimal",
      "corporate",
      "ecommerce",
      "social",
      "outdoor",
      "premium",
    ],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - enqueue aceita slug customizado", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: ["natal-2026"],
  });
  assertEquals(result.success, true);
  if (result.success && result.data.action === "enqueue") {
    assertEquals(result.data.styles, ["natal-2026"]);
  }
});

Deno.test("magic-up-jobs - enqueue aceita slug customizado com numero inicial", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: ["2026-black-friday"],
  });
  assertEquals(result.success, true);
});

Deno.test("magic-up-jobs - enqueue rejeita slug com maiuscula", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: ["Natal-2026"],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - enqueue rejeita slug com underline", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: ["natal_2026"],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - enqueue rejeita slug vazio", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: [""],
  });
  assertEquals(result.success, false);
});

Deno.test("magic-up-jobs - enqueue rejeita estilo desconhecido", () => {
  const result = BodySchema.safeParse({
    action: "enqueue",
    organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    prompt: "Uma caneca personalizada",
    styles: [".invalid"],
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

// Regressão: sem OPENROUTER_API_KEY o handler precisa falhar, nunca enfileirar
// e marcar os jobs como `done` com imagem placeholder. Esse fallback existia e
// fazia a UI mostrar "Concluído" verde sem nenhuma arte gerada.
Deno.test("magic-up-jobs - sem provedor de IA falha em vez de fingir sucesso", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(
    src.includes("if (!apiKey) {") && src.includes('error: "Configuração do servidor incompleta"'),
    "o handler deve retornar 500 quando o provedor de IA não está configurado",
  );
  // A guarda precisa vir antes do enfileiramento, senão sobram jobs `queued` órfãos.
  assert(
    src.indexOf("if (!apiKey) {") < src.indexOf('rpc("enqueue_magic_up_jobs"'),
    "a checagem da chave deve preceder o enfileiramento",
  );
  assert(
    !src.includes("fallback determinístico"),
    "o fallback que marcava jobs como done sem imagem não pode voltar",
  );
});
