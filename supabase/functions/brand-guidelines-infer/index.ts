// deno-lint-ignore-file no-explicit-any
// Edge Function: brand-guidelines-infer
// Recebe client_id + urls de imagens (logo + assets recentes) e retorna uma
// proposta de brand guidelines gerada pela IA — SEM gravar (dry-run).
// O usuário revisa e aplica pelo hook `useBrandGuidelines.upsert` existente.

import { createClient } from "npm:@supabase/supabase-js@2.45.3";
import { z } from "npm:zod@3.23.8";
import { corsPreflight, getCorsHeaders } from "../_shared/cors.ts";

const RequestSchema = z.object({
  client_id: z.string().uuid(),
  asset_urls: z.array(z.string().url()).max(10).optional(),
});

const ProposalSchema = z.object({
  primary_colors: z
    .array(z.object({ name: z.string().min(1).max(60), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) }))
    .max(6)
    .default([]),
  secondary_colors: z
    .array(z.object({ name: z.string().min(1).max(60), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) }))
    .max(6)
    .default([]),
  fonts: z
    .array(z.object({ name: z.string().min(1).max(80), usage: z.string().max(120).optional() }))
    .max(4)
    .default([]),
  do_rules: z.array(z.string().min(3).max(200)).max(8).default([]),
  dont_rules: z.array(z.string().min(3).max(200)).max(8).default([]),
});

function jsonResponse(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") return corsPreflight(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed", requestId }, 405, req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized", requestId }, 401, req);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON", requestId }, 400, req);
    }
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validação falhou", details: parsed.error.flatten().fieldErrors, requestId },
        400,
        req,
      );
    }
    const { client_id, asset_urls } = parsed.data;

    // Autenticação via getClaims (assinaturas rotacionadas)
    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await authed.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return jsonResponse({ error: "Unauthorized", requestId }, 401, req);
    }
    const userId = claims.claims.sub as string;

    // Client service_role para RPCs SECDEF
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // Verificação de acesso: o cliente pertence a alguma organização da qual o usuário é membro
    const { data: clientRow, error: clientErr } = await admin
      .from("clients")
      .select("id, organization_id, name")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr) throw clientErr;
    if (!clientRow) return jsonResponse({ error: "Cliente não encontrado", requestId }, 404, req);

    const { data: isMember, error: memberErr } = await admin.rpc("is_member_of", {
      _user_id: userId,
      _org_id: clientRow.organization_id,
    });
    if (memberErr) throw memberErr;
    if (!isMember) return jsonResponse({ error: "Forbidden", requestId }, 403, req);

    // Cota de IA da organização
    const { data: hasQuota } = await admin.rpc("check_ai_quota", {
      _org_id: clientRow.organization_id,
      _required_cost: 0,
    });
    if (hasQuota === false) {
      return jsonResponse({ error: "Quota de IA atingida para este mês.", requestId }, 403, req);
    }

    // Rate limit por usuário (feature: brand-guidelines-infer)
    const { data: rl } = await admin.rpc("check_and_consume_ai_rate_limit", {
      _user_id: userId,
      _feature: "brand-guidelines-infer",
      _limit_per_min: 5,
    });
    if (rl && (rl as { allowed?: boolean }).allowed === false) {
      return jsonResponse(
        { error: "Muitas requisições. Aguarde alguns segundos.", requestId },
        429,
        req,
      );
    }

    // Coleta URLs: se não fornecidas, busca assets recentes do cliente e gera signed URLs (bucket privado)
    const imageUrls: string[] = [...(asset_urls ?? [])];
    if (imageUrls.length === 0) {
      const { data: assets } = await admin
        .from("assets")
        .select("file_path")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(8);
      const paths = (assets ?? [])
        .map((a: { file_path: string | null }) => a.file_path)
        .filter((p: string | null): p is string => typeof p === "string" && p.length > 0);
      for (const p of paths) {
        const { data: signed } = await admin.storage.from("assets").createSignedUrl(p, 300);
        if (signed?.signedUrl) imageUrls.push(signed.signedUrl);
      }
    }

    if (imageUrls.length === 0) {
      return jsonResponse(
        {
          error: "Nenhum asset disponível para inferência. Envie um logo ou peça alguns assets primeiro.",
          requestId,
        },
        400,
        req,
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error(`[${requestId}] LOVABLE_API_KEY missing`);
      return jsonResponse({ error: "AI configuration missing", requestId }, 500, req);
    }

    const systemPrompt =
      "Você analisa assets visuais de um cliente e propõe brand guidelines. " +
      "Sempre responda em JSON puro no formato: " +
      '{"primary_colors":[{"name","hex"}],"secondary_colors":[{"name","hex"}],' +
      '"fonts":[{"name","usage"}],"do_rules":[string],"dont_rules":[string]}. ' +
      "Cores em hex '#rrggbb'. Escreva nomes e regras em português (PT-BR). " +
      "Máx 4 cores primárias, 4 secundárias, 3 fontes, 5 do_rules, 5 dont_rules.";

    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: `Cliente: ${clientRow.name}. Analise as imagens e proponha guidelines coerentes.` },
      ...imageUrls.slice(0, 8).map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errBody = await aiResp.text();
      console.error(`[${requestId}] AI gateway error [${aiResp.status}]: ${errBody}`);
      const status = aiResp.status === 402 ? 402 : aiResp.status === 429 ? 429 : 502;
      return jsonResponse(
        { error: "AI request failed", status: aiResp.status, details: errBody, requestId },
        status,
        req,
      );
    }

    const aiJson = (await aiResp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = aiJson.choices?.[0]?.message?.content ?? "";
    let proposalRaw: unknown;
    try {
      proposalRaw = JSON.parse(rawContent);
    } catch {
      console.error(`[${requestId}] AI returned non-JSON:`, rawContent.slice(0, 200));
      return jsonResponse({ error: "IA retornou formato inválido", requestId }, 502, req);
    }

    const proposal = ProposalSchema.safeParse(proposalRaw);
    if (!proposal.success) {
      console.error(`[${requestId}] Proposal validation failed:`, proposal.error.flatten());
      return jsonResponse(
        {
          error: "Proposta da IA falhou validação",
          details: proposal.error.flatten().fieldErrors,
          requestId,
        },
        502,
        req,
      );
    }

    // Registra uso (best-effort) para observabilidade
    admin
      .from("ai_usage_log")
      .insert({
        organization_id: clientRow.organization_id,
        user_id: userId,
        feature: "brand-guidelines-infer",
        model: "google/gemini-2.5-flash",
        cost_usd: 0,
      })
      .then(({ error: e }: { error: { message: string } | null }) => {
        if (e) console.warn(`[${requestId}] ai_usage_log insert failed:`, e.message);
      });

    // Snapshot das guidelines atuais + diff/confidence para o histórico
    const { data: currentBg } = await admin
      .from("brand_guidelines")
      .select("primary_colors, secondary_colors, fonts, do_rules, dont_rules")
      .eq("client_id", client_id)
      .maybeSingle();

    const snapshotBefore = currentBg ?? {
      primary_colors: [],
      secondary_colors: [],
      fonts: [],
      do_rules: [],
      dont_rules: [],
    };

    const norm = (s: string) => s.trim().toLowerCase();
    const normHex = (h: string) => h.trim().toLowerCase();
    const diffColors = (
      before: Array<{ hex: string }>,
      after: Array<{ hex: string }>,
    ) => {
      const b = new Set((before ?? []).map((c) => normHex(c.hex)));
      const a = new Set((after ?? []).map((c) => normHex(c.hex)));
      return {
        added: [...a].filter((x) => !b.has(x)),
        removed: [...b].filter((x) => !a.has(x)),
        kept: [...a].filter((x) => b.has(x)),
      };
    };
    const diffFonts = (
      before: Array<{ name: string }>,
      after: Array<{ name: string }>,
    ) => {
      const b = new Set((before ?? []).map((f) => norm(f.name)));
      const a = new Set((after ?? []).map((f) => norm(f.name)));
      return {
        added: [...a].filter((x) => !b.has(x)),
        removed: [...b].filter((x) => !a.has(x)),
        kept: [...a].filter((x) => b.has(x)),
      };
    };
    const diffRules = (before: string[], after: string[]) => {
      const b = new Set((before ?? []).map(norm));
      const a = new Set((after ?? []).map(norm));
      return {
        added: [...a].filter((x) => !b.has(x)),
        removed: [...b].filter((x) => !a.has(x)),
        kept: [...a].filter((x) => b.has(x)),
      };
    };

    const p = proposal.data;
    const diff = {
      primary_colors: diffColors(
        (snapshotBefore.primary_colors as Array<{ hex: string }>) ?? [],
        p.primary_colors,
      ),
      secondary_colors: diffColors(
        (snapshotBefore.secondary_colors as Array<{ hex: string }>) ?? [],
        p.secondary_colors,
      ),
      fonts: diffFonts(
        (snapshotBefore.fonts as Array<{ name: string }>) ?? [],
        p.fonts,
      ),
      do_rules: diffRules(
        (snapshotBefore.do_rules as string[]) ?? [],
        p.do_rules,
      ),
      dont_rules: diffRules(
        (snapshotBefore.dont_rules as string[]) ?? [],
        p.dont_rules,
      ),
    };

    // Confiança heurística: coerência do payload + tamanho da amostra
    const coverage =
      (p.primary_colors.length >= 2 ? 1 : p.primary_colors.length / 2) * 0.35 +
      (p.fonts.length >= 1 ? 1 : 0) * 0.2 +
      (p.do_rules.length >= 2 ? 1 : p.do_rules.length / 2) * 0.15 +
      (p.dont_rules.length >= 2 ? 1 : p.dont_rules.length / 2) * 0.15;
    const sampleBoost = Math.min(imageUrls.length / 8, 1) * 0.15;
    const confidence = Math.max(0, Math.min(1, coverage + sampleBoost));

    const { data: historyRow } = await admin
      .from("brand_guidelines_infer_history")
      .insert({
        organization_id: clientRow.organization_id,
        client_id,
        user_id: userId,
        request_id: requestId,
        model: "google/gemini-2.5-flash",
        inputs: {
          asset_urls_provided: (asset_urls ?? []).length,
          asset_urls_signed: imageUrls.length,
          client_name: clientRow.name,
        },
        proposal: p,
        snapshot_before: snapshotBefore,
        diff,
        sample_size: imageUrls.length,
        assets_used: imageUrls.length,
        confidence: Number(confidence.toFixed(3)),
      })
      .select("id")
      .maybeSingle();

    return jsonResponse(
      {
        proposal: p,
        client_id,
        assets_used: imageUrls.length,
        sample_size: imageUrls.length,
        confidence: Number(confidence.toFixed(3)),
        diff,
        history_id: historyRow?.id ?? null,
        dry_run: true,
        requestId,
      },
      200,
      req,
    );
  } catch (err) {
    console.error(`[${requestId}] Unhandled error:`, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: "Erro interno", details: message, requestId }, 500, req);
  }
});
