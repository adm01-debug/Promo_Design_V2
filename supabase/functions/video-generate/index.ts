// video-generate — fila de geração de vídeos (OpenRouter Video Generation API).
//
// Ações:
//   enqueue  -> cria a linha em public.videos ('queued') e submete o job ao provedor
//   status   -> sincroniza o job com o provedor e devolve o estado atual
//   cancel   -> cancela um job ainda não finalizado
//
// As regras puras (mapeamento de aspect ratio, status e corpo do request) vivem
// em ./lib.ts e são testadas sem rede. O arquivo final é copiado para o bucket
// privado `videos` porque as URLs pré-assinadas do provedor expiram em
// `expires_at`; `video_url` guarda o CAMINHO no bucket e o front troca por uma
// signed URL na hora de abrir/baixar (ver src/features/video/lib/video-url.ts).
//
// Sem OPENROUTER_API_KEY o job é marcado como 'failed' com mensagem explícita —
// nunca fica preso em 'generating', o que travaria o polling do cliente.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { corsPreflight, getCorsHeaders } from "../_shared/cors.ts";
import {
  AI_MODELS,
  AI_NOT_CONFIGURED_STATUS,
  AI_VIDEO_JOBS_URL,
  AiNotConfiguredError,
  aiHeaders,
  aiNotConfiguredPayload,
  getAiApiKey,
} from "../_shared/ai.ts";
import {
  buildVideoRequest,
  describeTerminalError,
  mapProviderStatus,
  videoStoragePath,
} from "./lib.ts";

const HttpUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), "URL deve começar com http(s)://");

const CharacterRefSchema = z.object({
  id: z.string().trim().max(120).nullable().optional(),
  label: z.string().trim().max(120).nullable().optional(),
  avatar: z.string().trim().max(16).nullable().optional(),
  description: z.string().trim().max(600).nullable().optional(),
});

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
  startFrameUrl: HttpUrl.nullable().optional(),
  endFrameUrl: HttpUrl.nullable().optional(),
  characterRef: CharacterRefSchema.nullable().optional(),
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

const VIDEO_BUCKET = "videos";
const SUBMIT_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;

/** Subconjunto do VideoJobResponse do provedor que realmente usamos. */
interface ProviderJob {
  id: string;
  status: string;
  urls?: string[] | null;
  unsigned_urls?: string[] | null;
  expires_at?: number | null;
  error?: string | null;
}

function json(req: Request, body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function readProviderJob(res: Response): Promise<ProviderJob> {
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      (payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify((payload as { error: unknown }).error)
        : null) ?? `HTTP ${res.status}`;
    throw new Error(`ERR_VIDEO_PROVIDER: ${detail}`);
  }
  const job = payload as ProviderJob | null;
  if (!job?.id || !job.status) {
    throw new Error("ERR_VIDEO_PROVIDER: resposta do provedor sem id/status.");
  }
  return job;
}

/**
 * Submete o job ao provedor. Retorna o id remoto quando aceito.
 * Lança quando não há provedor configurado ou o provedor recusa, para que o
 * chamador marque 'failed' com a mensagem real.
 */
async function dispatchToProvider(input: {
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  duration: number;
  startFrameUrl?: string | null;
  endFrameUrl?: string | null;
}): Promise<{ provider: string; jobId: string }> {
  const apiKey = getAiApiKey();
  if (!apiKey) {
    throw new AiNotConfiguredError();
  }

  const res = await fetch(AI_VIDEO_JOBS_URL, {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify(
      buildVideoRequest({
        model: AI_MODELS.video,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        duration: input.duration,
        startFrameUrl: input.startFrameUrl,
        endFrameUrl: input.endFrameUrl,
      }),
    ),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });

  const job = await readProviderJob(res);
  return { provider: "openrouter", jobId: job.id };
}

async function fetchProviderJob(apiKey: string, jobId: string): Promise<ProviderJob> {
  const res = await fetch(`${AI_VIDEO_JOBS_URL}/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: aiHeaders(apiKey),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });
  return await readProviderJob(res);
}

/**
 * Copia o MP4 final para o bucket privado. Devolve o caminho no bucket, ou null
 * quando a cópia falha (o chamador cai para a URL temporária do provedor para
 * não perder uma geração já paga).
 */
async function archiveVideo(
  admin: SupabaseClient,
  apiKey: string,
  job: ProviderJob,
  organizationId: string,
  videoId: string,
): Promise<string | null> {
  const direct = job.urls?.[0];
  const authenticated = job.unsigned_urls?.[0];
  const source =
    direct ?? (authenticated ? new URL(authenticated, AI_VIDEO_JOBS_URL).toString() : null);
  if (!source) return null;

  try {
    const res = await fetch(source, {
      // URLs pré-assinadas recusam o header; o endpoint /content exige.
      headers: direct ? undefined : aiHeaders(apiKey),
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`archive: download ${res.status} for job ${job.id}`);
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = videoStoragePath(organizationId, videoId);
    const { error } = await admin.storage
      .from(VIDEO_BUCKET)
      .upload(path, bytes, { contentType: "video/mp4", upsert: true });
    if (error) {
      console.error(`archive: upload failed for job ${job.id}:`, error.message);
      return null;
    }
    return path;
  } catch (err) {
    console.error(`archive: failed for job ${job.id}:`, err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(req, { error: "Unauthorized" }, 401);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

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
    // Leitura escopada por RLS: garante que o job é do usuário antes de
    // qualquer escrita com service role.
    const { data, error } = await supabase
      .from("videos")
      .select(
        "id,organization_id,status,provider,provider_job_id,video_url,thumbnail_url,error_message,started_at,completed_at",
      )
      .eq("id", body.videoId)
      .maybeSingle();
    if (error) return json(req, { error: error.message }, 400);
    if (!data) return json(req, { error: "Vídeo não encontrado." }, 404);

    const apiKey = getAiApiKey();
    const canSync =
      data.status === "generating" && !!data.provider_job_id && data.provider === "openrouter";

    if (!canSync || !apiKey) {
      return json(req, { job: data });
    }

    let remote: ProviderJob;
    try {
      remote = await fetchProviderJob(apiKey, String(data.provider_job_id));
    } catch (err) {
      // Falha transitória de rede: devolve o estado atual e deixa o cliente
      // tentar de novo no próximo poll em vez de matar o job.
      console.error(`status: provider poll failed for ${data.id}:`, err);
      return json(req, { job: data, stale: true });
    }

    const nextStatus = mapProviderStatus(remote.status);
    if (!nextStatus || nextStatus === "generating") {
      return json(req, { job: data, stale: true });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const patch: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "ready") {
      const archived = await archiveVideo(
        admin,
        apiKey,
        remote,
        String(data.organization_id),
        String(data.id),
      );
      const fallback = remote.urls?.[0] ?? null;
      if (!archived && !fallback) {
        patch.status = "failed";
        patch.error_message =
          "ERR_VIDEO_PROVIDER: o vídeo foi gerado mas nenhuma URL de download foi devolvida.";
      } else {
        // Sem a cópia durável, guarda a URL temporária para não perder a geração.
        patch.video_url = archived ?? fallback;
      }
    } else if (nextStatus === "failed") {
      patch.error_message = describeTerminalError(remote.status, remote.error ?? undefined);
    }

    const { data: updated, error: updateError } = await admin
      .from("videos")
      .update(patch)
      .eq("id", data.id)
      .select("id,status,video_url,thumbnail_url,error_message,started_at,completed_at")
      .maybeSingle();

    if (updateError) {
      console.error(`status: update failed for ${data.id}:`, updateError.message);
      return json(req, { job: data, stale: true });
    }
    return json(req, { job: updated ?? data });
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
  // Service role: o insert em `videos` e o registro de uso são escopados por RLS/organização.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Rate limit por usuário só na criação: /status e /cancel não consomem provedor.
  const { data: rl } = await admin.rpc("check_and_consume_ai_rate_limit", {
    _user_id: userId,
    _feature: "video-generate",
    _limit_per_min: 3,
  });
  if (rl && (rl as { allowed?: boolean }).allowed === false) {
    return json(req, { error: "Muitas requisições. Aguarde alguns segundos." }, 429);
  }

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
      start_frame_url: body.startFrameUrl ?? null,
      end_frame_url: body.endFrameUrl ?? null,
      character_ref: body.characterRef ?? {},
      status: "queued",
      video_url: null,
    })
    .select("id,status")
    .single();

  if (insertError || !created) {
    return json(req, { error: insertError?.message ?? "Falha ao enfileirar o vídeo." }, 400);
  }

  try {
    const { provider, jobId } = await dispatchToProvider({
      prompt: body.prompt,
      aspectRatio: body.aspectRatio,
      duration: body.duration,
      startFrameUrl: body.startFrameUrl ?? null,
      endFrameUrl: body.endFrameUrl ?? null,
    });
    // Consome o orcamento do rate limit assim que o provedor aceita o job
    // (a RPC check_and_consume_ai_rate_limit conta linhas desta tabela).
    await admin.from("ai_usage_log").insert({
      organization_id: body.organizationId,
      user_id: userId,
      feature_name: "video-generate",
      model_name: AI_MODELS.video,
      tokens_in: 0,
      tokens_out: 0,
      cost_estimate: 0.5,
      metadata: { videoId: created.id, providerJobId: jobId },
    });
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
    if (err instanceof AiNotConfiguredError) {
      return json(
        req,
        aiNotConfiguredPayload({ job: { id: created.id, status: "failed" } }),
        AI_NOT_CONFIGURED_STATUS,
      );
    }
    return json(req, { job: { id: created.id, status: "failed" }, error: message }, 503);
  }
});
