// ---------------------------------------------------------------------------
// migrate-helper — exportador TEMPORÁRIO e SOMENTE LEITURA para migrar
// estrutura e dados deste projeto para outro.
//
// Autenticação: header `x-access-key` comparado com o segredo do servidor
// `MIGRATE_HELPER_KEY` (nunca escrito no código).
//
// Para desativar: apague o segredo `MIGRATE_HELPER_KEY`. A função passa a
// responder 503 imediatamente, sem precisar de novo deploy.
//
// Esta função NUNCA retorna service role key, senha ou URL do banco.
// ---------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";

const FUNCTION_VERSION = "2.0.0";

/** Tabelas de negócio liberadas para exportação (sem partições/telemetria). */
const ALLOWED_TABLES = [
  "assets",
  "audit_alert_rules",
  "audit_saved_views",
  "brand_guidelines",
  "catalog_products",
  "client_contacts",
  "client_design_patterns",
  "clients",
  "dam_saved_searches",
  "magicup_history",
  "mockup_drafts",
  "notifications",
  "organization_invites",
  "organization_members",
  "organizations",
  "product_categories",
  "service_orders",
  "status_audit_log",
  "videos",
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const ParamsSchema = z.object({
  action: z.enum(["ping", "schema", "export", "count"]).default("ping"),
  table: z.enum(ALLOWED_TABLES).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  offset: z.coerce.number().int().min(0).default(0),
});

type Params = z.infer<typeof ParamsSchema>;

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

/** Comparação em tempo constante para não vazar o segredo por timing. */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Compara sempre o mesmo número de bytes.
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return corsPreflight(req);

  const expectedKey = Deno.env.get("MIGRATE_HELPER_KEY");
  if (!expectedKey) {
    return json(req, { error: "migration_helper_disabled" }, 503);
  }

  const providedKey = req.headers.get("x-access-key") ?? "";
  if (!timingSafeEqual(providedKey, expectedKey)) {
    return json(req, { error: "unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const parsed = ParamsSchema.safeParse({
    action: url.searchParams.get("action") ?? undefined,
    table: url.searchParams.get("table") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return json(req, { error: "invalid_params", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const params: Params = parsed.data;

  if (params.action === "ping") {
    return json(req, {
      ok: true,
      version: FUNCTION_VERSION,
      server_time: new Date().toISOString(),
      allowed_tables: ALLOWED_TABLES,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { error: "server_misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function logAudit(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await admin.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        table_name: "migrate_helper",
        action: "MIGRATE_HELPER",
        new_values: { helper_action: action, ...details },
      });
    } catch (_error) {
      // Auditoria é best-effort: não deve derrubar a exportação.
    }
  }

  try {
    if (params.action === "schema") {
      const { data, error } = await admin.rpc("export_public_schema");
      if (error) {
        return json(req, { error: "schema_export_failed" }, 500);
      }
      await logAudit("schema", {});
      return json(req, { ok: true, schema: data });
    }

    if (!params.table) {
      return json(req, { error: "missing_table" }, 400);
    }
    const table: AllowedTable = params.table;

    if (params.action === "count") {
      const { count, error } = await admin
        .from(table)
        .select("id", { count: "exact", head: true });
      if (error) {
        return json(req, { error: "count_failed" }, 500);
      }
      return json(req, { ok: true, table, count: count ?? 0 });
    }

    // action === "export"
    const { data, error, count } = await admin
      .from(table)
      .select("*", { count: "exact" })
      .order("id", { ascending: true })
      .range(params.offset, params.offset + params.limit - 1);

    if (error) {
      return json(req, { error: "export_failed" }, 500);
    }

    const rows = data ?? [];
    const total = count ?? rows.length;
    const nextOffset = params.offset + rows.length;

    await logAudit("export", { table, rows: rows.length, offset: params.offset });

    return json(req, {
      ok: true,
      table,
      limit: params.limit,
      offset: params.offset,
      returned: rows.length,
      total,
      next_offset: nextOffset < total ? nextOffset : null,
      rows,
    });
  } catch (_error) {
    return json(req, { error: "unexpected_error" }, 500);
  }
});
