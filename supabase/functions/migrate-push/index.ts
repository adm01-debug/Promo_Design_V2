// ---------------------------------------------------------------------------
// migrate-push — copia os dados deste projeto (origem) para o projeto de
// DESTINO configurado nos segredos do servidor.
//
// Autenticação: header `x-access-key` comparado com `MIGRATE_HELPER_KEY`.
// Destino: `DEST_SUPABASE_URL` + `DEST_SUPABASE_SERVICE_ROLE_KEY`.
//
// Nenhuma credencial (de origem ou destino) é retornada na resposta.
// Para desativar: apague o segredo `MIGRATE_HELPER_KEY` (503 imediato).
//
// Pré-requisito: o schema já precisa existir no destino, e os usuários de
// `auth.users` referenciados pelas FKs precisam existir lá — senão as linhas
// afetadas falham com erro de chave estrangeira (reportado por tabela).
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";

const FUNCTION_VERSION = "1.0.0";

/**
 * Ordem de cópia respeitando as dependências de chave estrangeira.
 * Tabelas com auto-referência (assets.parent_asset_id) são inseridas em
 * lotes ordenados por `created_at`, o que preserva pai antes de filho.
 */
const TABLE_ORDER = [
  "organizations",
  "organization_members",
  "organization_invites",
  "clients",
  "client_contacts",
  "product_categories",
  "catalog_products",
  "assets",
  "brand_guidelines",
  "client_design_patterns",
  "service_orders",
  "status_audit_log",
  "notifications",
  "magicup_history",
  "mockup_drafts",
  "videos",
  "dam_saved_searches",
  "audit_saved_views",
  "audit_alert_rules",
] as const;

type MigratableTable = (typeof TABLE_ORDER)[number];

/** Coluna usada para ordenar a leitura de cada tabela (estabilidade da paginação). */
const ORDER_COLUMN: Record<MigratableTable, string> = {
  organizations: "created_at",
  organization_members: "created_at",
  organization_invites: "created_at",
  clients: "created_at",
  client_contacts: "created_at",
  product_categories: "created_at",
  catalog_products: "created_at",
  assets: "created_at",
  brand_guidelines: "created_at",
  client_design_patterns: "created_at",
  service_orders: "created_at",
  status_audit_log: "changed_at",
  notifications: "created_at",
  magicup_history: "created_at",
  mockup_drafts: "created_at",
  videos: "created_at",
  dam_saved_searches: "created_at",
  audit_saved_views: "created_at",
  audit_alert_rules: "created_at",
};

const ParamsSchema = z.object({
  action: z.enum(["ping", "plan", "push"]).default("ping"),
  /** Quando omitido em `push`, todas as tabelas são copiadas na ordem segura. */
  table: z.enum(TABLE_ORDER).optional(),
  /** Linhas por lote de leitura/gravação. */
  batch: z.coerce.number().int().min(1).max(500).default(200),
  /** Simula a cópia sem gravar nada no destino. */
  dry_run: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

type Params = z.infer<typeof ParamsSchema>;

interface TableResult {
  table: MigratableTable;
  source_rows: number;
  written_rows: number;
  batches: number;
  skipped: boolean;
  error: string | null;
}

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
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

/** Mensagem de erro sem qualquer credencial embutida. */
function safeMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.slice(0, 300);
}

async function copyTable(
  source: SupabaseClient,
  destination: SupabaseClient,
  table: MigratableTable,
  batchSize: number,
  dryRun: boolean,
): Promise<TableResult> {
  const result: TableResult = {
    table,
    source_rows: 0,
    written_rows: 0,
    batches: 0,
    skipped: dryRun,
    error: null,
  };

  let offset = 0;

  // Lê em páginas ordenadas para que pais entrem antes de filhos.
  for (;;) {
    const { data, error } = await source
      .from(table)
      .select("*")
      .order(ORDER_COLUMN[table], { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      result.error = `read_failed: ${error.message.slice(0, 200)}`;
      return result;
    }

    const rows = data ?? [];
    if (rows.length === 0) break;

    result.source_rows += rows.length;
    result.batches += 1;

    if (!dryRun) {
      const { error: writeError } = await destination
        .from(table)
        .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

      if (writeError) {
        result.error = `write_failed: ${writeError.message.slice(0, 200)}`;
        return result;
      }
      result.written_rows += rows.length;
    }

    if (rows.length < batchSize) break;
    offset += rows.length;
  }

  return result;
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
    batch: url.searchParams.get("batch") ?? undefined,
    dry_run: url.searchParams.get("dry_run") ?? undefined,
  });

  if (!parsed.success) {
    return json(
      req,
      { error: "invalid_params", details: parsed.error.flatten().fieldErrors },
      400,
    );
  }

  const params: Params = parsed.data;

  const sourceUrl = Deno.env.get("SUPABASE_URL");
  const sourceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const destUrl = Deno.env.get("DEST_SUPABASE_URL");
  const destKey = Deno.env.get("DEST_SUPABASE_SERVICE_ROLE_KEY");

  if (!sourceUrl || !sourceKey) {
    return json(req, { error: "source_misconfigured" }, 500);
  }

  if (params.action === "ping") {
    return json(req, {
      ok: true,
      version: FUNCTION_VERSION,
      server_time: new Date().toISOString(),
      destination_configured: Boolean(destUrl && destKey),
      table_order: TABLE_ORDER,
    });
  }

  if (!destUrl || !destKey) {
    return json(req, { error: "destination_not_configured" }, 503);
  }

  const clientOptions = {
    auth: { persistSession: false, autoRefreshToken: false },
  } as const;

  const source = createClient(sourceUrl, sourceKey, clientOptions);
  const destination = createClient(destUrl, destKey, clientOptions);

  const tables: readonly MigratableTable[] = params.table
    ? [params.table]
    : TABLE_ORDER;

  try {
    if (params.action === "plan") {
      const plan: Array<{ table: MigratableTable; source_count: number; destination_count: number | string }> = [];

      for (const table of tables) {
        const { count: sourceCount, error: sourceError } = await source
          .from(table)
          .select("id", { count: "exact", head: true });

        const { count: destCount, error: destError } = await destination
          .from(table)
          .select("id", { count: "exact", head: true });

        plan.push({
          table,
          source_count: sourceError ? -1 : sourceCount ?? 0,
          destination_count: destError ? `erro: ${destError.message.slice(0, 120)}` : destCount ?? 0,
        });
      }

      return json(req, { ok: true, action: "plan", plan });
    }

    // action === "push"
    const results: TableResult[] = [];
    for (const table of tables) {
      const result = await copyTable(
        source,
        destination,
        table,
        params.batch,
        params.dry_run,
      );
      results.push(result);
      // Se uma tabela base falhar, as dependentes falhariam em cascata:
      // interrompe para o operador corrigir antes de continuar.
      if (result.error && !params.table) break;
    }

    // Auditoria best-effort na origem (não bloqueia a migração).
    try {
      await source.from("audit_log").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        table_name: "migrate_push",
        action: "MIGRATE_PUSH",
        new_values: {
          dry_run: params.dry_run,
          tables: results.map((item) => ({
            table: item.table,
            source_rows: item.source_rows,
            written_rows: item.written_rows,
            error: item.error,
          })),
        },
      });
    } catch (_error) {
      // ignorado de propósito
    }

    const failed = results.filter((item) => item.error !== null);

    return json(req, {
      ok: failed.length === 0,
      action: "push",
      dry_run: params.dry_run,
      total_source_rows: results.reduce((sum, item) => sum + item.source_rows, 0),
      total_written_rows: results.reduce((sum, item) => sum + item.written_rows, 0),
      failed_tables: failed.map((item) => item.table),
      results,
    });
  } catch (error) {
    return json(req, { error: "unexpected_error", message: safeMessage(error) }, 500);
  }
});
