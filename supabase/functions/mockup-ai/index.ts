import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
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

function jsonResponse(data: unknown, status: number, req: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// ─── Zod Schemas ───────────────────────────────────────────
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const requestId = req.headers.get("X-Request-Id") || crypto.randomUUID();
  console.log(`[${requestId}] mockup-ai started`);

  try {
    // ─── Auth check ────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn(`[${requestId}] Unauthorized: missing bearer token`);
      return jsonResponse({ error: "Unauthorized", requestId }, 401, req);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn(`[${requestId}] Invalid session:`, userErr);
      return jsonResponse({ error: "Unauthorized", requestId }, 401, req);
    }

    // Fetch user's organization (assuming first one for simplicity or logic needs improvement)
    const { data: orgData } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();

    const orgId = orgData?.organization_id;

    // Check quota before call
    if (orgId) {
      const { data: hasQuota } = await supabase.rpc("check_ai_quota", { _org_id: orgId });
      if (hasQuota === false) {
        console.warn(`[${requestId}] Quota exceeded for org ${orgId}`);
        return jsonResponse({ error: "Quota de IA da organização atingida para este mês.", requestId }, 403, req);
      }
    }

    // ─── API Key ───────────────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] LOVABLE_API_KEY is missing`);
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ─── Input Validation ──────────────────────────────────
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400, req);
    }

    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.warn(`[${requestId}] Validation failed:`, parsed.error.flatten().fieldErrors);
      return jsonResponse(
        { error: "Validação falhou", details: parsed.error.flatten().fieldErrors, requestId },
        400,
        req
      );
    }

    const body = parsed.data;

    // ─── Action: Remove Background ─────────────────────────
    if (body.action === "remove-bg") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Remove the background from this image completely. Keep only the main subject/logo with a transparent or clean white background. Output the cleaned image.",
                },
                {
                  type: "image_url",
                  image_url: { url: body.imageBase64 },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text().catch(() => "");
        console.error(`[${requestId}] AI gateway error (remove-bg):`, response.status, t);
        if (response.status === 429) {
          return jsonResponse({ error: "Limite de requisições excedido. Tente novamente em alguns segundos.", requestId }, 429, req);
        }
        if (response.status === 402) {
          return jsonResponse({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso.", requestId }, 402, req);
        }
        return jsonResponse({ error: "Erro no serviço de IA", requestId }, 500, req);
      }

      const data = await response.json();
      const usage = data.usage || {};
      const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      // Log usage
      if (orgId) {
        await supabase.from("ai_usage_log").insert({
          organization_id: orgId,
          user_id: userData.user.id,
          feature_name: "mockup-ai:remove-bg",
          model_name: "google/gemini-2.5-flash-image",
          tokens_in: usage.prompt_tokens || 0,
          tokens_out: usage.completion_tokens || 0,
          cost_estimate: 0.01, // Flat estimate for image removal
          metadata: { action: body.action }
        });
      }

      if (!resultImage) {
        console.warn(`[${requestId}] AI did not return a processed image`);
        return jsonResponse({ error: "IA não retornou imagem processada", requestId }, 500, req);
      }

      return jsonResponse({ imageBase64: resultImage }, 200, req);
    }

    // ─── Action: Suggest Placement ──────────────────────────
    if (body.action === "suggest-placement") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are a mockup placement expert for promotional products. Given a product type and print area dimensions, suggest optimal logo placement parameters. Always respond using the suggest_placement tool.`,
            },
            {
              role: "user",
              content: `Product: ${body.productName || "Generic product"}
Template: ${body.templateId || "custom"}
Print area: ${body.areaWidth || 15}cm × ${body.areaHeight || 15}cm

Suggest the best placement for a logo on this product, considering:
- Centering and visual balance
- Typical branding conventions for this product type
- Optimal scale to fill the area without overcrowding
- Whether the logo should be rotated
- Best blend mode for this product material
- Recommended surface warp type`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_placement",
                description: "Suggest optimal placement parameters for a logo on a product mockup",
                parameters: {
                  type: "object",
                  properties: {
                    scale: { type: "number", description: "Logo scale relative to area, 0.1 to 1.5" },
                    xPercent: { type: "number", description: "X position as percentage of area width, 0 to 100" },
                    yPercent: { type: "number", description: "Y position as percentage of area height, 0 to 100" },
                    rotation: { type: "number", description: "Rotation in degrees, -180 to 180" },
                    blendMode: {
                      type: "string",
                      enum: ["normal", "multiply", "screen", "overlay", "darken", "color-burn"],
                      description: "Recommended blend mode",
                    },
                    surfaceType: {
                      type: "string",
                      enum: ["flat", "curved", "cylindrical", "spherical", "angled"],
                      description: "Best surface warp type",
                    },
                    opacity: { type: "number", description: "Logo opacity percentage, 50 to 100" },
                    reasoning: { type: "string", description: "Brief explanation of why these values were chosen, in Portuguese" },
                  },
                  required: ["scale", "xPercent", "yPercent", "rotation", "blendMode", "surfaceType", "opacity", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_placement" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return jsonResponse({ error: "Limite de requisições excedido." }, 429, req);
        }
        if (response.status === 402) {
          return jsonResponse({ error: "Créditos de IA esgotados." }, 402, req);
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return jsonResponse({ error: "Erro no serviço de IA" }, 500, req);
      }

      const data = await response.json();
      const usage = data.usage || {};
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

      // Log usage
      if (orgId) {
        await supabase.from("ai_usage_log").insert({
          organization_id: orgId,
          user_id: userData.user.id,
          feature_name: "mockup-ai:suggest-placement",
          model_name: "google/gemini-3-flash-preview",
          tokens_in: usage.prompt_tokens || 0,
          tokens_out: usage.completion_tokens || 0,
          cost_estimate: ((usage.prompt_tokens || 0) * 0.000000075) + ((usage.completion_tokens || 0) * 0.0000003),
          metadata: { action: body.action }
        });
      }

      if (!toolCall) {
        return jsonResponse({ error: "IA não retornou sugestão" }, 500, req);
      }

      const suggestion = JSON.parse(toolCall.function.arguments);
      return jsonResponse(suggestion, 200, req);
    }

    return jsonResponse({ error: `Unknown action: ${(body as { action: string }).action}` }, 400, req);
  } catch (e) {
    console.error("mockup-ai error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
      req
    );
  }
});
