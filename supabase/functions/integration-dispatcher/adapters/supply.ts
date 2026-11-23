/**
 * Adapter Promo Supply (compras).
 *
 * Destino: `receive-os-sync`. Envelope {event, correlation_key, payload} com
 * HMAC hex em `x-webhook-signature: sha256=<hex>` — mesmo padrao dos outros
 * destinos, para o validador de assinatura do destino ser um so.
 *
 * Regras de negocio do destino que este payload precisa respeitar (lidas do
 * schema vivo, `20251220181110_*.sql:90-125`):
 *  - `solicitacoes.tipo` so aceita material|servico|equipamento|urgente|
 *    contrato. Quem grava 'material' e o receptor, nao este adapter: a OS de
 *    personalizacao consome material, e inventar um vocabulario novo aqui
 *    quebraria o CHECK e o filtro da tela de compras.
 *  - `solicitacoes.tenant_id` e NOT NULL e o trigger fill_tenant_id_from_profile
 *    nao age sob service_role (nao ha auth.uid()), entao mandamos
 *    `solicitante_email` para o receptor resolver o tenant pelo perfil.
 *  - Nao existe coluna `vendedor`: o CRM de vendedor e o Promo Champions. Aqui
 *    o que importa e qual material comprar e para quando.
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

  const body = JSON.stringify({
    event: ev.event,
    correlation_key: osNumber,
    payload: {
      os_id: p.os_id,
      os_number: osNumber,
      produto,
      produto_sku: cleanText(p.product_sku) ?? null,
      quantidade,
      unidade: "un",
      tecnica: cleanText(p.technique) ?? null,
      material: cleanText(p.product_material) ?? null,
      empresa: cleanText(p.client_company) ?? cleanText(p.client_name) ?? null,
      prazo_entrega: toIsoDate(p.delivery_date) ?? null,
      observacoes: cleanText(p.observations) ?? null,
      // Usado pelo receptor para resolver tenant_id (service_role nao dispara
      // fill_tenant_id_from_profile). Nao cria usuario nem vendedor: e so o
      // dono da OS, quando conhecido.
      solicitante_email: cleanText(p.owner_email) ?? cleanText(p.client_email) ?? null,
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
  // 422 = payload recusado pelo destino (ex.: nenhum tenant cadastrado la).
  // Nao adianta retentar o mesmo dado: vira skipped e aparece na fila como
  // lacuna de cadastro, sem queimar tentativa nem virar dead-letter.
  if (res.status === 422) {
    return { outcome: "skipped", status: 422, reason: `supply 422: ${res.body}` };
  }
  return {
    outcome: "retry",
    status: res.status,
    reason: `supply ${res.status}: ${res.body}`,
  };
}
