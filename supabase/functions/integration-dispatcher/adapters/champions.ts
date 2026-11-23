/**
 * Adapter Promo Champions (CRM dos vendedores).
 *
 * Destino: `receive-design-sync`. Envelope identico ao fluxo PromoGifts do
 * `receive-quote-sync` que o Champions ja usa (HMAC hex + x-webhook-event +
 * x-correlation-key + body {event, payload, correlation_key}), para que a
 * funcao receptora la possa reaproveitar o mesmo validador de assinatura e a
 * mesma tabela de dedupe (`webhook_inbound_dedupe`).
 *
 * `correlation_key` = id do design + evento. Garante que reenvio do mesmo evento e
 * deduplicado no destino, sem que o `design.updated` do mesmo design seja descartado como
 * duplicata do `design.created` (a tabela de dedupe do CRM tem UNIQUE so em correlation_key).
 */
import type { AdapterContext, AdapterResult, DesignPayload, QueuedEvent } from "../contracts.ts";
import { cleanText, postJson, signBody } from "../lib.ts";

export async function deliverToChampions(
  ev: QueuedEvent,
  ctx: AdapterContext,
): Promise<AdapterResult> {
  const p = ev.payload as unknown as DesignPayload;

  const designId = cleanText(p.design_id) ?? ev.entity_id;
  if (!designId) {
    return { outcome: "skipped", reason: "design_id ausente" };
  }
  const name = cleanText(p.name);
  if (!name) {
    return { outcome: "skipped", reason: "name ausente" };
  }

  const correlationKey = `${designId}:${ev.event}`;

  const body = JSON.stringify({
    event: ev.event,
    correlation_key: correlationKey,
    payload: {
      design_id: designId,
      name,
      product_name: cleanText(p.product_name) ?? null,
      product_sku: cleanText(p.product_sku) ?? null,
      thumbnail_url: cleanText(p.thumbnail_url) ?? null,
      seller_email: cleanText(p.owner_email) ?? null,
      updated_at: p.updated_at ?? null,
      source: "promo_design",
    },
  });

  const signature = await signBody(body, ctx.config.secret);
  const res = await postJson(
    ctx.config.url.replace(/\/+$/, ""),
    body,
    {
      "x-webhook-signature": `sha256=${signature}`,
      "x-webhook-event": ev.event,
      "x-correlation-key": correlationKey,
    },
    ctx.fetchImpl,
  );

  if (res.ok) return { outcome: "delivered", status: res.status };
  // 200/409 de dedupe tambem contam como entregue.
  if (res.status === 409) return { outcome: "delivered", status: 409 };
  return {
    outcome: "retry",
    status: res.status,
    reason: `champions ${res.status}: ${res.body}`,
  };
}