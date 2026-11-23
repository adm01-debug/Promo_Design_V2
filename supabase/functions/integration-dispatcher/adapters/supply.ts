/**
 * Adapter Promo Supply (compras).
 *
 * Destino: `receive-os-sync`. Envelope com HMAC hex + x-webhook-event, body
 * {event, payload, correlation_key} — mesmo padrao dos outros destinos para
 * reaproveitar o validador de assinatura la.
 *
 * Regras de negocio do destino que o payload precisa respeitar:
 *  - `solicitacoes.tipo` so aceita 'PE_LISO' | 'FAB_LISO' | 'FAB_PERSONALIZADO'
 *    (nao existe 'material', apesar de punchout-receive gravar isso).
 *    Personalizacao => 'FAB_PERSONALIZADO'.
 *  - `solicitacoes.vendedor` e NOT NULL. O Promo Design nao tem campo de
 *    vendedor, entao usamos o e-mail do dono da OS (owner_email) com fallback
 *    no e-mail do cliente. Sem NENHUM dos dois o evento e 'skipped' — melhor
 *    nao criar linha do que criar com vendedor falso.
 */
import type { AdapterContext, AdapterResult, OsPayload, QueuedEvent } from "../contracts.ts";
import { cleanText, positiveNumber, postJson, signBody, toIsoDate } from "../lib.ts";

export async function deliverToSupply(
  ev: QueuedEvent,
  ctx: AdapterContext,
): Promise<AdapterResult> {
  const p = ev.payload as unknown as OsPayload;

  const osNumber = cleanText(p.os_number);
  if (!osNumber) return { outcome: "skipped", reason: "os_number ausente" };

  const produto = cleanText(p.product_name);
  if (!produto) return { outcome: "skipped", reason: "product_name ausente" };

  const quantidade = positiveNumber(p.quantity);
  if (!quantidade) return { outcome: "skipped", reason: "quantity ausente ou nao positiva" };

  const vendedor = cleanText(p.owner_email) ?? cleanText(p.client_email);
  if (!vendedor) {
    return { outcome: "skipped", reason: "sem vendedor (owner_email) nem client_email" };
  }

  const body = JSON.stringify({
    event: ev.event,
    correlation_key: osNumber,
    payload: {
      os_number: osNumber,
      os_id: p.os_id,
      item_number: cleanText(p.product_sku) ?? osNumber,
      produto,
      quantidade,
      tipo: "FAB_PERSONALIZADO",
      vendedor,
      empresa: cleanText(p.client_company) ?? cleanText(p.client_name) ?? null,
      prazo_entrega: toIsoDate(p.delivery_date) ?? null,
      observacoes: [
        cleanText(p.technique) ? `Tecnica ${cleanText(p.technique)}` : null,
        cleanText(p.product_material) ? `Material ${cleanText(p.product_material)}` : null,
        cleanText(p.observations),
        `Origem Promo Design (${ev.event})`,
      ].filter(Boolean).join(" | "),
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
      "x-correlation-key": osNumber,
    },
    ctx.fetchImpl,
  );

  if (res.ok) return { outcome: "delivered", status: res.status };
  if (res.status === 409) return { outcome: "delivered", status: 409 };
  return {
    outcome: "retry",
    status: res.status,
    reason: `supply ${res.status}: ${res.body}`,
  };
}