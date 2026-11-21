// Edge function do compartilhamento publico do manual de marca.
//
//   GET  /functions/v1/brand-share?token=...      -> lookup publico (snapshot)
//   POST { action: "create", brand_guideline_id, organization_id, valid_days }
//        -> requer JWT valido (links so sao emitidos pelo app autenticado)
//
// O token na URL E a credencial para as operacoes publicas. Todo dado do banco
// passa por RPCs SECURITY DEFINER; a tabela nao aceita acesso direto anonimo.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";
import { CreateSchema, isValidToken, parseJwtSub } from "./lib.ts";

const SHARE_BASE = Deno.env.get("APP_BASE_URL") || "https://promo-design-v2.vercel.app";

function makeClient(serviceRole: string) {
  return createClient("https://fygxlswpkjtjpcefjfty.supabase.co", serviceRole, {
    auth: { persistSession: false },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceRole) {
    return json({ error: "Serviço não configurado" }, 503);
  }
  const sb = makeClient(serviceRole);

  try {
    const url = new URL(req.url);

    // GET -> lookup publico
    if (req.method === "GET") {
      const token = url.searchParams.get("token") ?? "";
      if (!isValidToken(token)) return json({ error: "Link inválido" }, 400);
      const { data, error } = await sb.rpc("get_brand_share_by_token", { _token: token });
      if (error) {
        console.error("[brand-share] lookup:", error.message);
        return json({ error: "Erro ao consultar manual compartilhado" }, 500);
      }
      const row = data as Record<string, unknown> | null;
      if (!row) return json({ error: "Link inválido ou expirado" }, 404);
      return json({ share: row });
    }

    const body = await req.json().catch(() => null);

    // Create -> requer JWT valido (sub = membro com designer+ na org)
    const create = CreateSchema.safeParse(body);
    if (create.success) {
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const userId = parseJwtSub(jwt);
      if (!userId) return json({ error: "Não autorizado" }, 401);

      const { data: created, error: createError } = await sb.rpc("create_brand_share_token", {
        _brand_guideline_id: create.data.brand_guideline_id,
        _organization_id: create.data.organization_id,
        _created_by: userId,
        _valid_days: create.data.valid_days ?? 30,
      });
      if (createError) {
        console.error("[brand-share] create:", createError.message);
        return json({ error: "Erro ao criar link de compartilhamento" }, 500);
      }
      if (!created) return json({ error: "Sem permissão" }, 403);
      return json({ token: created, url: `${SHARE_BASE}/brand/public/${created}` });
    }

    return json({ error: "Payload inválido" }, 400);
  } catch (err) {
    console.error("[brand-share] unexpected:", err);
    return json({ error: "Erro interno" }, 500);
  }
});
