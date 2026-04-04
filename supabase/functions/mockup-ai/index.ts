import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://artful-mock-lab.lovable.app",
  "https://id-preview--9e2d0e84-1b63-4f32-bfac-a18bc7e9eab4.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.find((o) => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, imageBase64, productName, templateId, areaWidth, areaHeight } = await req.json();

    // ─── Action: Remove Background ───
    if (action === "remove-bg") {
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!resultImage) {
        return new Response(JSON.stringify({ error: "IA não retornou imagem processada" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ imageBase64: resultImage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action: Suggest Placement ───
    if (action === "suggest-placement") {
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
              content: `Product: ${productName || "Generic product"}
Template: ${templateId || "custom"}
Print area: ${areaWidth || 15}cm × ${areaHeight || 15}cm

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
                    scale: {
                      type: "number",
                      description: "Logo scale relative to area, 0.1 to 1.5",
                    },
                    xPercent: {
                      type: "number",
                      description: "X position as percentage of area width, 0 to 100",
                    },
                    yPercent: {
                      type: "number",
                      description: "Y position as percentage of area height, 0 to 100",
                    },
                    rotation: {
                      type: "number",
                      description: "Rotation in degrees, -180 to 180",
                    },
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
                    opacity: {
                      type: "number",
                      description: "Logo opacity percentage, 50 to 100",
                    },
                    reasoning: {
                      type: "string",
                      description: "Brief explanation of why these values were chosen, in Portuguese",
                    },
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
          return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return new Response(JSON.stringify({ error: "IA não retornou sugestão" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const suggestion = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(suggestion), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mockup-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
