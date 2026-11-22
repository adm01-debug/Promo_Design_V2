// magic-up-jobs — fila de gerações em lote do Magic Up (Feature #4).
//
// Ações:
//   enqueue -> cria N jobs (via RPC SECURITY DEFINER) e processa cada um:
//              geração de imagem via OpenRouter. Sem OPENROUTER_API_KEY a ação
//              responde 500 antes de enfileirar — nunca marca job como `done`
//              sem imagem, que a UI exibiria como "Concluído".
//   list    -> jobs da organização atual (RLS do usuário).
//   cancel  -> cancela um job ainda não finalizado (RPC SECURITY DEFINER).
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsPreflight, getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_COMPLETIONS_URL, AI_MODELS, aiHeaders } from "../_shared/ai.ts";

// Estilos padrão do sistema + slugs customizados da organização
// (Feature 8 — presets gerenciáveis em magic_up_styles). Slug custom
// segue o mesmo formato da migration: ^[a-z0-9][a-z0-9-]{0,39}$.
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
const ALLOWED_STYLES = 8;

const EnqueueSchema = z.object({
  action: z.literal("enqueue"),
  organizationId: z.string().uuid(),
  prompt: z.string().trim().min(5).max(4000),
  productName: z.string().trim().max(300).nullable().optional(),
  productSku: z.string().trim().max(120).nullable().optional(),
  styles: z.array(STYLE_ENUM).min(1).max(ALLOWED_STYLES),
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

type Json = Record<string, unknown>;

function json(req: Request, body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

const STYLE_PROMPT: Record<string, string> = {
  premium:
    "professional product photography, dark executive desk, warm ambient lighting, shallow depth of field, premium corporate feel, photorealistic",
  lifestyle:
    "modern lifestyle scene in daily use, natural environment, authentic feel, bokeh background, Instagram-worthy composition",
  flatlay:
    "clean flat lay product photography on white marble surface, centered, soft natural overhead light, e-commerce ready, ultra sharp",
  minimal: "minimalist product shot, negative space, single accent color, editorial magazine style",
  corporate:
    "corporate gift set arrangement, elegant presentation, branded items, professional studio lighting, catalog quality",
  ecommerce:
    "e-commerce product photo on pure white background, centered, even lighting, high resolution, Amazon and Shopify ready",
  social:
    "eye-catching social media post, vibrant colors, modern design, trending aesthetic, square format",
  outdoor:
    "product photographed in outdoor natural setting, golden hour lighting, depth of field, lifestyle brand aesthetic",
};

/**
 * Gera a imagem no OpenRouter (gemini com modality image).
 * Lança com a mensagem do erro quando o provedor não está disponível ou
 * rejeita — o chamador decide se vira 'failed' ou fallback.
 */
async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(AI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: aiHeaders(apiKey),
      body: JSON.stringify({
        model: AI_MODELS.image,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Gateway retornou HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }
    const data = await response.json();
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) {
      throw new Error("IA não retornou URL de imagem");
    }
    return String(url);
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return json(req, { error: "Unauthorized" }, 401);
  }
  const userId = String(claimsData.claims.sub);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(req, { error: "Corpo da requisição inválido (JSON esperado)." }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(req, { error: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  if (body.action === "list") {
    const { data, error } = await userClient
      .from("magic_up_jobs")
      .select("*")
      .eq("organization_id", body.organizationId)
      .order("created_at", { ascending: false });
    if (error) return json(req, { error: error.message }, 400);
    return json(req, { jobs: data ?? [] });
  }

  if (body.action === "cancel") {
    const { data, error } = await userClient.rpc("cancel_magic_up_job", {
      _job_id: body.jobId,
      _user_id: userId,
    });
    if (error) return json(req, { error: error.message }, 400);
    return json(req, { job: data });
  }

  // action === "enqueue"
  // Sem provedor configurado nenhum job tem como virar `done`: gerar imagem é
  // a razão de existir da fila. Falhar aqui evita o falso positivo de jobs
  // "Concluídos" com imagem placeholder, que o usuário vê como sucesso.
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return json(req, { error: "Configuração do servidor incompleta" }, 500);
  }
  // Cliente admin para marcar processamento/resultado (RLS da tabela não dá UPDATE ao app).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data: created, error: enqueueError } = await userClient.rpc("enqueue_magic_up_jobs", {
    _organization_id: body.organizationId,
    _user_id: userId,
    _prompt: body.prompt,
    _product_name: body.productName ?? null,
    _product_sku: body.productSku ?? null,
    _styles: body.styles,
  });
  if (enqueueError || !created) {
    return json(req, { error: enqueueError?.message ?? "Falha ao enfileirar o batch." }, 400);
  }

  // Presets customizados da organização (Feature 8): se o slug veio de
  // magic_up_styles, o prompt do estilo é o que foi cadastrado na página
  // /magicup/styles. Estilos padrão continuam no STYLE_PROMPT embutido.
  const customPromptMap: Record<string, string> = {};
  const { data: customRows, error: customError } = await admin
    .from("magic_up_styles")
    .select("slug, prompt")
    .in("slug", body.styles)
    .eq("organization_id", body.organizationId);
  if (!customError) {
    for (const row of customRows ?? []) customPromptMap[row.slug] = row.prompt;
  }

  const results: Json[] = [];
  const createdRows = created as { id: string; style: string }[];
  for (const job of createdRows) {
    await admin
      .from("magic_up_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", job.id);

    let status: "done" | "failed" = "done";
    let resultImageUrl: string | null = "/placeholder.svg";
    let errorMessage: string | null = null;

    const stylePrompt = customPromptMap[job.style] ?? STYLE_PROMPT[job.style] ?? "";
    try {
      resultImageUrl = await generateImage(apiKey, `${body.prompt}\n\n${stylePrompt}`.trim());
    } catch (err) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : "Falha desconhecida ao gerar imagem";
    }

    await admin
      .from("magic_up_jobs")
      .update({
        status,
        result_image_url: resultImageUrl,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    const { data: finalRow } = await admin
      .from("magic_up_jobs")
      .select("*")
      .eq("id", job.id)
      .single();
    if (finalRow) results.push(finalRow);
  }

  return json(req, { jobs: results }, 201);
});
