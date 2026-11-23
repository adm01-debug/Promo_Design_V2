/**
 * integration-dispatcher — drena `integration_queue` e roteia cada evento para
 * o sistema que de fato executa o trabalho.
 *
 * Nao existe ERP generico (decisao do dono, 2026-11-23):
 *   design.created / design.updated      -> Promo Champions (CRM dos vendedores)
 *   os.closed / os.completed             -> Fast Gravacoes (personalizacao)
 *                                         + Promo Supply  (compras)
 *
 * Cada destino tem URL e credencial proprias no env da function. Destino sem
 * configuracao e simplesmente ignorado (self-disable por destino), de forma
 * que ligar um sistema novo nao exige mexer no codigo nem derrubar os outros.
 *
 * O roteamento vem de `event.destination`, gravado pela trigger no banco —
 * a edge function nao decide negocio, so entrega.
 *
 * Auth: Bearer SUPABASE_SERVICE_ROLE_KEY ou x-cron-secret == CRON_SECRET.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";
import { DESTINATIONS, type Destination, type QueuedEvent } from "./contracts.ts";
import { deliverToChampions } from "./adapters/champions.ts";
import { deliverToFastGravacoes } from "./adapters/fast_gravacoes.ts";
import { deliverToSupply } from "./adapters/supply.ts";

const BATCH_LIMIT = 25;

/** Env por destino: URL e credencial. Vazio = destino desligado. */
function destinationConfig(destination: Destination): { url: string; secret: string } {
  switch (destination) {
    case "champions":
      return {
        url: Deno.env.get("CHAMPIONS_WEBHOOK_URL") ?? "",
        secret: Deno.env.get("CHAMPIONS_WEBHOOK_SECRET") ?? "",
      };
    case "fast_gravacoes":
      return {
        url: Deno.env.get("FAST_GRAVACOES_API_URL") ?? "",
        secret: Deno.env.get("FAST_GRAVACOES_API_KEY") ?? "",
      };
    case "supply":
      return {
        url: Deno.env.get("SUPPLY_WEBHOOK_URL") ?? "",
        secret: Deno.env.get("SUPPLY_WEBHOOK_SECRET") ?? "",
      };
  }
}

async function deliverOne(
  ev: QueuedEvent,
  fetchImpl: typeof fetch,
): Promise<{ outcome: "delivered" | "skipped" | "retry"; reason?: string }> {
  const config = destinationConfig(ev.destination);
  if (!config.url || !config.secret) {
    return { outcome: "retry", reason: `destino ${ev.destination} sem configuracao` };
  }
  const ctx = { fetchImpl, config };
  switch (ev.destination) {
    case "champions":
      return await deliverToChampions(ev, ctx);
    case "fast_gravacoes":
      return await deliverToFastGravacoes(ev, ctx);
    case "supply":
      return await deliverToSupply(ev, ctx);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  const corsHeaders = getCorsHeaders(req);

  const bearer = req.headers.get("Authorization") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authorized =
    (serviceRole !== "" && bearer === `Bearer ${serviceRole}`) ||
    (cronSecret !== "" && cronHeader === cronSecret);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary: Record<string, { delivered: number; failed: number; skipped: number }> = {};
  for (const d of DESTINATIONS) summary[d] = { delivered: 0, failed: 0, skipped: 0 };

  for (const destination of DESTINATIONS) {
    const config = destinationConfig(destination);
    // Destino nao configurado: nao drenar, senao os eventos entram em backoff
    // e queimam tentativas enquanto ninguem pode entrega-los.
    if (!config.url || !config.secret) continue;

    const { data: events, error } = await admin.rpc("dequeue_integration_events", {
      _destination: destination,
      _limit: BATCH_LIMIT,
    });
    if (error) {
      console.error(`dequeue_integration_events(${destination}) error:`, error.message);
      continue;
    }

    for (const ev of (events ?? []) as QueuedEvent[]) {
      try {
        const result = await deliverOne(ev, fetch);
        if (result.outcome === "delivered") {
          await admin.rpc("mark_integration_delivered", { _event_id: ev.event_id });
          summary[destination].delivered += 1;
        } else if (result.outcome === "skipped") {
          await admin.rpc("mark_integration_skipped", {
            _event_id: ev.event_id,
            _reason: result.reason ?? "skipped",
          });
          summary[destination].skipped += 1;
        } else {
          await admin.rpc("mark_integration_failed", {
            _event_id: ev.event_id,
            _error: result.reason ?? "delivery failed",
          });
          summary[destination].failed += 1;
        }
      } catch (err) {
        console.error(`[${ev.event_id}] dispatch failed:`, err);
        await admin.rpc("mark_integration_failed", {
          _event_id: ev.event_id,
          _error: err instanceof Error ? err.message : String(err),
        });
        summary[destination].failed += 1;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
