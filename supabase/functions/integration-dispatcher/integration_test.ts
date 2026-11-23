/** Testes dos adapters de destino e das primitivas de entrega. */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import type { AdapterContext, DesignPayload, OsPayload, QueuedEvent } from "./contracts.ts";
import { cleanText, positiveNumber, postJson, signBody, toIsoDate } from "./lib.ts";
import { deliverToChampions } from "./adapters/champions.ts";
import { deliverToFastGravacoes } from "./adapters/fast_gravacoes.ts";
import { deliverToSupply } from "./adapters/supply.ts";

const CONFIG = { url: "https://dest.example", secret: "sekrit" };

function osEvent(overrides: Partial<OsPayload> = {}, event = "os.closed"): QueuedEvent {
  const payload: OsPayload = {
    os_id: "11111111-1111-4111-8111-111111111111",
    os_number: "OS-2026-001",
    status: "pronta",
    client_name: "Fulano",
    client_company: "ACME",
    client_email: "cliente@acme.com",
    client_phone: "11999",
    product_name: "Caneca",
    product_sku: "SKU-1",
    product_material: "Ceramica",
    technique: "Sublimação - Caneca",
    fg_technique_id: "sublimation-mug",
    quantity: 10,
    delivery_date: "2026-12-01",
    observations: "urgente",
    owner_email: "vendedor@promo.com",
    ...overrides,
  };
  return {
    event_id: "22222222-2222-4222-8222-222222222222",
    entity: "service_order",
    entity_id: payload.os_id,
    event,
    destination: "fast_gravacoes",
    payload: payload as unknown as Record<string, unknown>,
    attempts: 1,
  };
}

function designEvent(): QueuedEvent {
  const payload: DesignPayload = {
    design_id: "33333333-3333-4333-8333-333333333333",
    name: "Arte Caneca ACME",
    product_name: "Caneca",
    product_sku: "SKU-1",
    thumbnail_url: "https://cdn.example/t.png",
    owner_email: "vendedor@promo.com",
    updated_at: "2026-11-23T10:00:00.000Z",
  };
  return {
    event_id: "44444444-4444-4444-8444-444444444444",
    entity: "design",
    entity_id: payload.design_id,
    event: "design.created",
    destination: "champions",
    payload: payload as unknown as Record<string, unknown>,
    attempts: 1,
  };
}

interface Captured {
  url: string;
  body: string;
  headers: Record<string, string>;
}

function captureFetch(status = 200, responseBody = "{}") {
  const calls: Captured[] = [];
  const fn = async (url: unknown, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: String(init?.body ?? ""),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return new Response(responseBody, { status });
  };
  return { calls, fetchImpl: fn as unknown as typeof fetch };
}

function ctx(fetchImpl: typeof fetch, config = CONFIG): AdapterContext {
  return { fetchImpl, config };
}

// ── primitivas ──────────────────────────────────────────────────────────────

Deno.test("signBody devolve 64 hex minusculos e e deterministico", async () => {
  const a = await signBody("{\"a\":1}", "s");
  const b = await signBody("{\"a\":1}", "s");
  assertEquals(/^[0-9a-f]{64}$/.test(a), true);
  assertEquals(a, b);
  assertEquals(a === await signBody("{\"a\":1}", "outro"), false);
});

Deno.test("toIsoDate extrai YYYY-MM-DD de timestamp ISO e ignora lixo", () => {
  assertEquals(toIsoDate("2026-12-01T00:00:00Z"), "2026-12-01");
  assertEquals(toIsoDate("2026-12-01"), "2026-12-01");
  assertEquals(toIsoDate(null), undefined);
  assertEquals(toIsoDate("sem data"), undefined);
});

Deno.test("cleanText e positiveNumber normalizam entrada ausente", () => {
  assertEquals(cleanText("  x  "), "x");
  assertEquals(cleanText("   "), undefined);
  assertEquals(cleanText(null), undefined);
  assertEquals(positiveNumber(5), 5);
  assertEquals(positiveNumber("7"), 7);
  assertEquals(positiveNumber(0), undefined);
  assertEquals(positiveNumber(-3), undefined);
  assertEquals(positiveNumber(undefined), undefined);
});

Deno.test("postJson nao lanca em erro de rede (status 0)", async () => {
  const res = await postJson(
    "https://x.example",
    "{}",
    {},
    (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch,
  );
  assertEquals(res.ok, false);
  assertEquals(res.status, 0);
});

// ── Fast Gravacoes ─────────────────────────────────────────────────────────

Deno.test("FG: POST /jobs com x-api-key e payload do ERPJobRequest", async () => {
  const { calls, fetchImpl } = captureFetch(201);
  const r = await deliverToFastGravacoes(osEvent(), ctx(fetchImpl));
  assertEquals(r.outcome, "delivered");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://dest.example/jobs");
  assertEquals(calls[0].headers["x-api-key"], "sekrit");
  const body = JSON.parse(calls[0].body);
  assertEquals(body.order_number, "OS-2026-001");
  assertEquals(body.technique_id, "sublimation-mug");
  assertEquals(body.quantity, 10);
  assertEquals(body.scheduled_date, "2026-12-01");
  assertEquals(body.client, "ACME");
  // Idempotencia: erp-api devolve o job existente quando a mesma OS reenvia.
  assertEquals(body.external_ref, "11111111-1111-4111-8111-111111111111");
});

Deno.test("FG: tecnica sem mapeamento vira skipped, nao retry", async () => {
  const { calls, fetchImpl } = captureFetch(201);
  const r = await deliverToFastGravacoes(
    osEvent({ technique: "Tecnica Nova", fg_technique_id: null }),
    ctx(fetchImpl),
  );
  assertEquals(r.outcome, "skipped");
  assertEquals(calls.length, 0);
  assertEquals((r.reason ?? "").includes("Tecnica Nova"), true);
});

Deno.test("FG: quantidade ausente vira skipped", async () => {
  const { fetchImpl } = captureFetch(201);
  const r = await deliverToFastGravacoes(osEvent({ quantity: null }), ctx(fetchImpl));
  assertEquals(r.outcome, "skipped");
});

Deno.test("FG: 5xx do destino vira retry com o status no motivo", async () => {
  const { fetchImpl } = captureFetch(503, "unavailable");
  const r = await deliverToFastGravacoes(osEvent(), ctx(fetchImpl));
  assertEquals(r.outcome, "retry");
  assertEquals(r.status, 503);
  assertEquals((r.reason ?? "").includes("503"), true);
});

Deno.test("FG: 409 (job ja existe) conta como entregue", async () => {
  const { fetchImpl } = captureFetch(409);
  const r = await deliverToFastGravacoes(osEvent(), ctx(fetchImpl));
  assertEquals(r.outcome, "delivered");
});

// ── Champions ──────────────────────────────────────────────────────────────

Deno.test("Champions: envelope PromoGifts com HMAC hex e correlation_key", async () => {
  const { calls, fetchImpl } = captureFetch(200);
  const r = await deliverToChampions(designEvent(), ctx(fetchImpl));
  assertEquals(r.outcome, "delivered");
  const body = JSON.parse(calls[0].body);
  assertEquals(body.event, "design.created");
  assertEquals(body.correlation_key, "33333333-3333-4333-8333-333333333333:design.created");
  assertEquals(body.payload.seller_email, "vendedor@promo.com");
  const sig = calls[0].headers["x-webhook-signature"];
  assertEquals(sig.startsWith("sha256="), true);
  const hex = sig.slice("sha256=".length);
  assertEquals(/^[0-9a-f]{64}$/.test(hex), true);
  // A assinatura precisa bater com o corpo exato: e o que o destino valida.
  assertEquals(hex, await signBody(calls[0].body, "sekrit"));
  assertEquals(calls[0].headers["x-correlation-key"], "33333333-3333-4333-8333-333333333333:design.created");
});

Deno.test("Champions: design.created e design.updated do mesmo design nao colidem no dedupe", async () => {
  const a = captureFetch(200);
  await deliverToChampions(designEvent(), ctx(a.fetchImpl));
  const b = captureFetch(200);
  const updated = designEvent();
  updated.event = "design.updated";
  await deliverToChampions(updated, ctx(b.fetchImpl));
  const kCreated = JSON.parse(a.calls[0].body).correlation_key;
  const kUpdated = JSON.parse(b.calls[0].body).correlation_key;
  assertEquals(kCreated === kUpdated, false);
  // Mesmo design nos dois - o CRM precisa sobrescrever a mesma linha.
  assertEquals(JSON.parse(a.calls[0].body).payload.design_id,
    JSON.parse(b.calls[0].body).payload.design_id);
});

Deno.test("Champions: design sem nome vira skipped", async () => {
  const ev = designEvent();
  (ev.payload as Record<string, unknown>).name = "   ";
  const { fetchImpl } = captureFetch(200);
  const r = await deliverToChampions(ev, ctx(fetchImpl));
  assertEquals(r.outcome, "skipped");
});

// ── Supply ─────────────────────────────────────────────────────────────────

Deno.test("Supply: envia o que o receptor precisa para abrir a solicitacao", async () => {
  const { calls, fetchImpl } = captureFetch(201);
  const r = await deliverToSupply(osEvent(), ctx(fetchImpl));
  assertEquals(r.outcome, "delivered");
  const body = JSON.parse(calls[0].body);
  // `tipo` nao vai no payload: quem grava 'material' e o receptor, respeitando
  // o CHECK do schema de compras.
  assertEquals(body.payload.tipo, undefined);
  assertEquals(body.payload.os_id, "11111111-1111-4111-8111-111111111111");
  assertEquals(body.payload.produto, "Caneca");
  assertEquals(body.payload.quantidade, 10);
  assertEquals(body.payload.produto_sku, "SKU-1");
  assertEquals(body.correlation_key, "OS-2026-001");
  assertEquals(body.payload.source, "promo_design");
});

Deno.test("Supply: manda o e-mail do dono para resolver tenant no destino", async () => {
  const { calls, fetchImpl } = captureFetch(201);
  await deliverToSupply(osEvent(), ctx(fetchImpl));
  assertEquals(JSON.parse(calls[0].body).payload.solicitante_email, "vendedor@promo.com");
});

Deno.test("Supply: sem owner_email cai no client_email como solicitante", async () => {
  const { calls, fetchImpl } = captureFetch(201);
  const r = await deliverToSupply(osEvent({ owner_email: null }), ctx(fetchImpl));
  assertEquals(r.outcome, "delivered");
  assertEquals(JSON.parse(calls[0].body).payload.solicitante_email, "cliente@acme.com");
});

Deno.test("Supply: sem produto ou quantidade nao cria solicitacao", async () => {
  assertEquals(
    (await deliverToSupply(osEvent({ product_name: null }), ctx(captureFetch(201).fetchImpl))).outcome,
    "skipped",
  );
  assertEquals(
    (await deliverToSupply(osEvent({ quantity: 0 }), ctx(captureFetch(201).fetchImpl))).outcome,
    "skipped",
  );
});

Deno.test("Supply: 422 vira skipped, nao retry (lacuna de cadastro)", async () => {
  const { fetchImpl } = captureFetch(422, JSON.stringify({ error: "tenant_id nao resolvido" }));
  const r = await deliverToSupply(osEvent(), ctx(fetchImpl));
  assertEquals(r.outcome, "skipped");
  assertEquals(r.status, 422);
});

Deno.test("Supply: 500 continua retry", async () => {
  const { fetchImpl } = captureFetch(500, JSON.stringify({ error: "boom" }));
  const r = await deliverToSupply(osEvent(), ctx(fetchImpl));
  assertEquals(r.outcome, "retry");
});