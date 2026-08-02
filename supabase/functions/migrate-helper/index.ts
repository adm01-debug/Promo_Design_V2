// Edge function utilitária para checagem de saúde durante migrações.
// Requer um usuário autenticado (JWT válido). Não expõe credenciais.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";

interface PingResponse {
  ok: true;
  action: "ping";
  userId: string;
  /** Timestamp ISO do servidor — útil para validar clock skew em migrações. */
  serverTime: string;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return corsPreflight(req);

  const json = (body: PingResponse | ErrorResponse, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "ping";
    if (action !== "ping") {
      return json({ ok: false, error: "unknown_action" }, 400);
    }

    return json({
      ok: true,
      action: "ping",
      userId: String(data.claims.sub),
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    console.error("migrate-helper failure", e);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
