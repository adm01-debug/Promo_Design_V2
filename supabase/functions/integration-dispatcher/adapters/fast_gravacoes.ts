/**
 * Adapter Fast Gravacoes (personalizacao/producao).
 *
 * Destino: `erp-api` POST /jobs  (ja existe e funciona; insere em `jobs`
 * com status 'queue').
 * Auth: header `x-api-key` validado contra `erp_api_keys.key_hash`.
 *
 * Duas armadilhas reais medidas no repo de destino:
 *  1. `ERPJobRequestSchema.technique_id` exige UUID, mas `techniques.id` e
 *     TEXT ("laser-co2"). O proprio erp-api rejeita qualquer job real com
 *     400 enquanto isso nao for corrigido la. Este adapter envia o TEXT
 *     correto (o que o schema deveria aceitar) e, se o destino responder 400
 *     por causa disso, o evento fica 'retry' com o motivo auditavel em vez de
 *     virar 'delivered' mentiroso.
 *  2. `quantity` exige numero positivo; OS sem quantidade nao vira job.
 */
import type { AdapterContext, AdapterResult, OsPayload, QueuedEvent } from "../contracts.ts";
import { cleanText, positiveNumber, postJson, toIsoDate } from "../lib.ts";

export async function deliverToFastGravacoes(
  ev: QueuedEvent,
  ctx: AdapterContext,
): Promise<AdapterResult> {
  const p = ev.payload as unknown as OsPayload;

  const techniqueId = cleanText(p.fg_technique_id);
  if (!techniqueId) {
    // Tecnica da OS sem correspondencia no Fast Gravacoes: nao e falha de
    // rede, e lacuna de cadastro. Vira 'skipped' com motivo para o admin
    // popular integration_technique_map.
    return {
      outcome: "skipped",
      reason: `tecnica sem mapeamento: "${p.technique ?? ""}"`,
    };
  }

  const quantity = positiveNumber(p.quantity);
  if (!quantity) {
    return { outcome: "skipped", reason: "quantity ausente ou nao positiva" };
  }

  const osNumber = cleanText(p.os_number);
  const product = cleanText(p.product_name);
  if (!osNumber || !product) {
    return { outcome: "skipped", reason: "os_number/product_name ausentes" };
  }

  const body = JSON.stringify({
    order_number: osNumber,
    client: cleanText(p.client_company) ?? cleanText(p.client_name) ?? "Cliente",
    product,
    quantity,
    technique_id: techniqueId,
    priority: "high",
    scheduled_date: toIsoDate(p.delivery_date),
    // Chave de idempotencia: o erp-api devolve o job existente em vez de
    // duplicar quando o Promo Design reenvia o mesmo evento.
    external_ref: ev.entity_id,
    notes: [
      cleanText(p.product_sku) ? `SKU ${cleanText(p.product_sku)}` : null,
      cleanText(p.product_material) ? `Material ${cleanText(p.product_material)}` : null,
      cleanText(p.observations),
      `Promo Design ${ev.event}`,
    ]
      .filter(Boolean)
      .join(" | "),
  });

  const res = await postJson(
    `${ctx.config.url.replace(/\/+$/, "")}/jobs`,
    body,
    { "x-api-key": ctx.config.secret },
    ctx.fetchImpl,
  );

  if (res.ok) return { outcome: "delivered", status: res.status };
  // 409/23505 = job ja existe para essa OS: idempotencia satisfeita.
  if (res.status === 409) return { outcome: "delivered", status: 409 };
  return {
    outcome: "retry",
    status: res.status,
    reason: `erp-api ${res.status}: ${res.body}`,
  };
}
