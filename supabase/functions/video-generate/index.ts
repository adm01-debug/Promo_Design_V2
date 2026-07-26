// video-generate — fila de geração de vídeos.
//
// Ações:
//   enqueue  -> cria a linha em public.videos com status 'queued' (RLS do usuário)
//   status   -> devolve o estado atual do job
//   cancel   -> cancela um job ainda não finalizado
//
// A chamada ao provedor de geração é isolada em `dispatchToProvider`. Enquanto
// nenhum provedor estiver configurado (secret VIDEO_PROVIDER_API_KEY ausente),
// o job é marcado como 'failed' com mensagem explícita — nunca fica preso em
// 'generating', o que travaria o polling do cliente.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsPreflight, getCorsHeaders } from "../_shared/cors.ts";

const EnqueueSchema = z.object({
  action: z.literal("enqueue"),
  organizationId: z.string().uuid(),
  clientId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  productName: z.string().trim().max(200).nullable().optional(),
  productSku: z.string().trim().max(120).nullable().optional(),
  prompt: z.string().trim().min(10).max(4000),
  aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5"]),
  duration: z.union([z.literal(5), z.literal(10)]),
  style: z.string().trim().max(60).nullable().optional(),
  motionPresets: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
});

const JobRefSchema = z.object({
  action: z.enum(["status", "cancel"]),
  videoId: z.string().uuid(),
});

const BodySchema = z.discriminatedUnion("action", [
  EnqueueSchema,
  JobRefSchema.extend({ action: z.literal("status") }),
  JobRefSchema.extend({ action: z.literal("cancel") }),
]);

type Json = Record<string, unknown>;

function json(req: Request, body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

/**
 * Envia o job ao provedor externo. Retorna o id remoto quando aceito.
 * Lança quando não há provedor configurado, para que o chamador marque 'failed'.
 */
async function dispatchToProvider(_prompt: string): Promise<{ provider: string; jobId: string }> {
  const apiKey = Deno.env.get("VIDEO_PROVIDER_API_KEY");
  if (!apiKey) {
    throw new Error(
      "ERR_VIDEO_PROVIDER: nenhum provedor de geração de vídeo configurado neste ambiente.",
    );
  }
  // Ponto de extensão: chamada HTTP ao provedor real.
  throw new Error("ERR_VIDEO_PROVIDER: provedor configurado mas ainda não implementado.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
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

  if (body.action === "status") {
    const { data, error } = await supabase
      .from("videos")
      .select("id,status,video_url,thumbnail_url,error_message,started_at,completed_at")
      .eq("id", body.videoId)
      .maybeSingle();
    if (error) return json(req, { error: error.message }, 400);
    if (!data) return json(req, { error: "Vídeo não encontrado." }, 404);
    return json(req, { job: data });
  }

  if (body.action === "cancel") {
    const { data, error } = await supabase
      .from("videos")
      .update({ status: "cancelled" })
      .eq("id", body.videoId)
      .in("status", ["queued", "generating"])
      .select("id,status")
      .maybeSingle();
    if (error) return json(req, { error: error.message }, 400);
    if (!data) return json(req, { error: "Job não está mais cancelável." }, 409);
    return json(req, { job: data });
  }

  // action === "enqueue"
  const { data: created, error: insertError } = await supabase
    .from("videos")
    .insert({
      organization_id: body.organizationId,
      client_id: body.clientId ?? null,
      created_by: userId,
      name: body.name,
      product_name: body.productName ?? null,
      product_sku: body.productSku ?? null,
      prompt: body.prompt,
      motion_presets: body.motionPresets,
      aspect_ratio: body.aspectRatio,
      duration: body.duration,
      style: body.style ?? null,
      status: "queued",
      video_url: null,
    })
    .select("id,status")
    .single();

  if (insertError || !created) {
    return json(req, { error: insertError?.message ?? "Falha ao enfileirar o vídeo." }, 400);
  }

  try {
    const { provider, jobId } = await dispatchToProvider(body.prompt);
    await supabase
      .from("videos")
      .update({ status: "generating", provider, provider_job_id: jobId })
      .eq("id", created.id);
    return json(req, { job: { id: created.id, status: "generating" } }, 202);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha desconhecida no provedor.";
    await supabase
      .from("videos")
      .update({ status: "failed", error_message: message })
      .eq("id", created.id);
    return json(req, { job: { id: created.id, status: "failed" }, error: message }, 503);
  }
});
