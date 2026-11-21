// Edge function for the client approval flow.
//
//   GET  /functions/v1/mockup-approval?token=...   -> public lookup (snapshot)
//   POST { token, status, note }                    -> public decision
//   POST { action: "create", mockup_id, client_name, valid_days } ->
//        requires a valid user JWT (share links are only minted by the app)
//
// The share token in the URL IS the credential for public ops. All DB work
// goes through SECURITY DEFINER RPCs; the table RLS is closed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";
import {
  CreateSchema,
  DecideSchema,
  isValidToken,
  makeClient,
  parseJwtSub,
} from "./lib.ts";

const SHARE_BASE = Deno.env.get("APP_BASE_URL") || "https://promo-design-v2.vercel.app";

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

    // GET -> public lookup
    if (req.method === "GET") {
      const token = url.searchParams.get("token") ?? "";
      if (!isValidToken(token)) return json({ error: "Link inválido" }, 400);
      const { data, error } = await sb.rpc("get_approval_by_token", { _token: token });
      if (error) {
        console.error("[mockup-approval] lookup:", error.message);
        return json({ error: "Erro ao consultar aprovação" }, 500);
      }
      const row = data as Record<string, unknown> | null;
      if (!row) return json({ error: "Link inválido ou expirado" }, 404);
      return json({ approval: row });
    }

    const body = await req.json().catch(() => null);

    // Public decision
    const decision = DecideSchema.safeParse(body);
    if (decision.success) {
      const { data, error } = await sb.rpc("decide_approval", {
        _token: decision.data.token,
        _status: decision.data.status,
        _note: decision.data.note ?? null,
      });
      if (error) {
        console.error("[mockup-approval] decide:", error.message);
        return json({ error: "Erro ao registrar decisão" }, 500);
      }
      if (!data) return json({ error: "Link já respondido ou expirado" }, 409);
      return json({ ok: true });
    }

    // Private create -> requires a valid user JWT (sub = draft owner)
    const create = CreateSchema.safeParse(body);
    if (create.success) {
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const userId = parseJwtSub(jwt);
      if (!userId) return json({ error: "Não autorizado" }, 401);

      const { data: created, error: createError } = await sb.rpc("create_approval_token", {
        _mockup_id: create.data.mockup_id,
        _organization_id: null,
        _created_by: userId,
        _client_name: create.data.client_name ?? null,
        _valid_days: create.data.valid_days ?? 7,
      });
      if (createError) {
        console.error("[mockup-approval] create:", createError.message);
        return json({ error: "Erro ao criar link de aprovação" }, 500);
      }
      if (!created) return json({ error: "Não autorizado" }, 403);
      return json({ token: created, url: `${SHARE_BASE}/mockup/approve/${created}` });
    }

    return json({ error: "Payload inválido" }, 400);
  } catch (err) {
    console.error("[mockup-approval] unexpected:", err);
    return json({ error: "Erro interno" }, 500);
  }
});