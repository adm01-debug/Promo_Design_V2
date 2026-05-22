import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const ALLOWED_ORIGINS = [
  "https://id-preview--5da5ba25-dbc3-474e-b521-f7c17b3151a4.lovable.app",
  "https://lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.endsWith(".lovable.app"));
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const BodySchema = z.object({
  assetId: z.string().uuid(),
  filePath: z.string().min(1),
  mimeType: z.string().min(1),
});

function jsonResponse(data: unknown, status = 200, req?: Request) {
  const headers = req ? getCorsHeaders(req) : { "Access-Control-Allow-Origin": "*" };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/**
 * Exponential backoff fetch
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      // Retry on 5xx or 429
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }
      console.warn(`Fetch attempt ${i + 1} failed with status ${response.status}. Retrying...`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Fetch attempt ${i + 1} threw error: ${lastError.message}. Retrying...`);
    }
    if (i < maxRetries - 1) {
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error(`Fetch failed after ${maxRetries} attempts`);
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });

  const requestId = req.headers.get("X-Request-Id") || crypto.randomUUID();
  console.log(`[${requestId}] asset-ocr started`);

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn(`[${requestId}] Unauthorized: missing bearer token`);
      return jsonResponse({ error: "Não autorizado", requestId }, 401, req);
    }

    // Parse + validate
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      console.warn(`[${requestId}] Invalid parameters:`, parsed.error.flatten());
      return jsonResponse({ error: "Parâmetros inválidos", details: parsed.error.flatten(), requestId }, 400, req);
    }
    const { assetId, filePath, mimeType } = parsed.data;

    const startTimestamp = Date.now();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] LOVABLE_API_KEY is missing`);
      return jsonResponse({ error: "AI gateway não configurado", requestId }, 500, req);
    }

    // User-scoped client validates JWT and respects RLS
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn(`[${requestId}] Invalid session:`, userErr);
      return jsonResponse({ error: "Sessão inválida", requestId }, 401, req);
    }

    // Service-role client to update OCR fields after RLS check
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    // RLS check: user must be able to read the asset
    const { data: asset, error: assetErr } = await userClient
      .from("assets")
      .select("id, file_path, mime_type, organization_id")
      .eq("id", assetId)
      .maybeSingle();
    if (assetErr || !asset) {
      console.warn(`[${requestId}] Asset not found or permission denied: ${assetId}`, assetErr);
      return jsonResponse({ error: "Asset não encontrado ou sem permissão", requestId }, 404, req);
    }

    if (!mimeType.startsWith("image/")) {
      console.log(`[${requestId}] Skipping non-image mime type: ${mimeType}`);
      await adminClient
        .from("assets")
        .update({ ocr_status: "skipped", ocr_text: null })
        .eq("id", assetId);
      return jsonResponse({ ok: true, skipped: true }, 200, req);
    }

    // Mark pending
    await adminClient.from("assets").update({ ocr_status: "pending" }).eq("id", assetId);

    // Signed URL → fetch image → base64
    const { data: signed, error: signErr } = await adminClient.storage
      .from("assets")
      .createSignedUrl(filePath, 60 * 60);

    if (signErr || !signed) {
      console.error(`[${requestId}] Failed to generate signed URL:`, signErr);
      await adminClient.from("assets").update({ ocr_status: "failed" }).eq("id", assetId);
      return jsonResponse({ error: "Falha ao gerar URL assinada", requestId }, 500, req);
    }

    const imgRes = await fetchWithRetry(signed.signedUrl);
    if (!imgRes.ok) {
      console.error(`[${requestId}] Failed to download image from signed URL. Status: ${imgRes.status}`);
      await adminClient.from("assets").update({ ocr_status: "failed" }).eq("id", assetId);
      return jsonResponse({ error: "Falha ao baixar imagem", requestId }, 500, req);
    }
    const imgBuffer = new Uint8Array(await imgRes.arrayBuffer());
    // Base64 encode
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < imgBuffer.length; i += chunkSize) {
      binary += String.fromCharCode(...imgBuffer.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Call Lovable AI Gateway with structured tool
    const aiRes = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é um extrator de texto OCR. Sua única tarefa é chamar a função extract_text com todo o texto visível na imagem. Preserve quebras de linha. Não faça comentários.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia todo o texto visível nesta imagem." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_text",
              description: "Retorna o texto extraído da imagem.",
              parameters: {
                type: "object",
                properties: {
                  text: { type: "string", description: "Texto extraído. Vazio se não houver texto." },
                  has_text: { type: "boolean" },
                },
                required: ["text", "has_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_text" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error(`[${requestId}] AI gateway error:`, aiRes.status, errText);
      await adminClient.from("assets").update({ ocr_status: "failed" }).eq("id", assetId);
      if (aiRes.status === 429) {
        return jsonResponse({ error: "Muitas requisições. Tente novamente em instantes.", requestId }, 429, req);
      }
      if (aiRes.status === 402) {
        return jsonResponse(
          { error: "Créditos do AI Gateway esgotados. Adicione créditos em Settings > Workspace > Usage.", requestId },
          402,
          req
        );
      }
      return jsonResponse({ error: "Falha no AI Gateway", requestId }, 502, req);
    }

    const aiJson = await aiRes.json();
    const usage = aiJson?.usage || {};
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    
    // Log usage
    await adminClient.from("ai_usage_log").insert({
      organization_id: asset.organization_id,
      user_id: userData.user.id,
      feature_name: "asset-ocr",
      model_name: "google/gemini-3-flash-preview",
      tokens_in: usage.prompt_tokens || 0,
      tokens_out: usage.completion_tokens || 0,
      cost_estimate: ((usage.prompt_tokens || 0) * 0.000000075) + ((usage.completion_tokens || 0) * 0.0000003), // Approximate
      metadata: { assetId }
    });

    let extractedText = "";
    let hasText = false;
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        extractedText = typeof args.text === "string" ? args.text : "";
        hasText = Boolean(args.has_text) && extractedText.trim().length > 0;
      } catch (e) {
        console.error("Falha ao parsear tool_call args:", e);
      }
    }

    // Truncate to 5000 chars
    const finalText = hasText ? extractedText.slice(0, 5000) : null;

    const { error: updErr } = await adminClient
      .from("assets")
      .update({ ocr_text: finalText, ocr_status: "done" })
      .eq("id", assetId);
    if (updErr) {
      console.error(`[${requestId}] Failed to save OCR:`, updErr);
      await adminClient.from("assets").update({ ocr_status: "failed" }).eq("id", assetId);
      return jsonResponse({ error: "Falha ao salvar texto extraído", requestId }, 500, req);
    }

    console.log(`[${requestId}] asset-ocr completed successfully. Text length: ${finalText?.length ?? 0}`);
    return jsonResponse({ ok: true, length: finalText?.length ?? 0, hasText, requestId }, 200, req);
  } catch (e) {
    console.error(`[${requestId}] asset-ocr fatal error:`, e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Erro desconhecido", requestId },
      500,
      req
    );
  }
});