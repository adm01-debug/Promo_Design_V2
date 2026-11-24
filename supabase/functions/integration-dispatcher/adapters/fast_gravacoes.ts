/**
 * Adapter Fast Gravacoes (personalizacao/producao).
 *
 * Destino: `erp-api` POST /jobs  (ja existe e funciona; insere em `jobs`
 * com status 'queue').
 * Auth: header `x-api-key` validado contra `erp_api_keys.key_hash`.
 *
 * Duas armadilhas reais medidas no repo de destino:
 *  1. `techniques.id` e TEXT e `jobs.technique_id` tem FK para ela: enviar um
 *     id que nao existe em producao viola a FK (23503) e o erp-api devolvia
 *     500, o que prendia o evento em retry para sempre. A producao do Fast
 *     Gravacoes usa ids curtos (`laser`, `sublimacao`, `tampografia`...), nao
 *     os slugs da migration antiga. O mapa `integration_technique_map` foi
 *     corrigido para esses ids (migration 20261125180000) e o erp-api passou
 *     a responder 400 em dado invalido (Fast_Gravacoes_V2#280).
 *  2. `quantity` exige numero positivo; OS sem quantidade nao vira job.
 *  3. O `erp-api` e publicado com `verify_jwt = true`: o gateway do projeto do
 *     Fast Gravacoes responde 401 `UNAUTHORIZED_NO_AUTH_HEADER` antes do
 *     handler quando a chamada nao leva JWT — mesmo com x-api-key correta.
 *     Por isso o adapter manda tambem `Authorization: Bearer <anon key do
 *     destino>` (env FAST_GRAVACOES_ANON_KEY) e, se o gateway ainda barrar,
 *     devolve 'skipped' com a instrucao exata em vez de retry infinito.
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

  const headers: Record<string, string> = { "x-api-key": ctx.config.secret };
  // O `erp-api` roda com verify_jwt = true: o gateway do projeto deles recusa
  // qualquer chamada sem `Authorization: Bearer <jwt>` valido, mesmo com
  // x-api-key correto. O JWT publico do destino e so a porta de entrada; quem
  // autoriza continua sendo a x-api-key validada dentro do handler.
  const gatewayJwt = cleanText(ctx.config.anonKey);
  if (gatewayJwt) headers["Authorization"] = `Bearer ${gatewayJwt}`;

  const res = await postJson(
    `${ctx.config.url.replace(/\/+$/, "")}/jobs`,
    body,
    headers,
    ctx.fetchImpl,
  );

  if (res.ok) return { outcome: "delivered", status: res.status };
  // 409/23505 = job ja existe para essa OS: idempotencia satisfeita.
  if (res.status === 409) return { outcome: "delivered", status: 409 };
  // 401 do gateway (antes do handler): falta FAST_GRAVACOES_ANON_KEY no env.
  // Nao e falha do destino nem do evento — e configuracao incompleta, entao
  // nao queima tentativa nem vira dead-letter.
  if (res.status === 401 && res.body.includes("UNAUTHORIZED_NO_AUTH_HEADER")) {
    return {
      outcome: "skipped",
      status: 401,
      reason: "gateway JWT: definir FAST_GRAVACOES_ANON_KEY no env da function",
    };
  }
  return {
    outcome: "retry",
    status: res.status,
    reason: `erp-api ${res.status}: ${res.body}`,
  };
}
