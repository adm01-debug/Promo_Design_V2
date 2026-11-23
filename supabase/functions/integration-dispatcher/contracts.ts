/**
 * Contratos do integration-dispatcher.
 *
 * Nao existe "ERP" generico: cada destino tem seu proprio contrato e cada
 * adapter traduz o evento interno do Promo Design para o formato que aquele
 * sistema aceita. Manter os contratos aqui (e nao espalhados nos adapters)
 * deixa a divergencia com os repos de destino visivel em um unico lugar.
 */

export const DESTINATIONS = ["champions", "fast_gravacoes", "supply"] as const;
export type Destination = (typeof DESTINATIONS)[number];

export interface QueuedEvent {
  event_id: string;
  entity: "service_order" | "design";
  entity_id: string;
  event: string;
  destination: Destination;
  payload: Record<string, unknown>;
  attempts: number;
}

/** O que um adapter devolve para o dispatcher. */
export interface AdapterResult {
  /** delivered = aceito pelo destino; skipped = nao se aplica; retry = falhou */
  outcome: "delivered" | "skipped" | "retry";
  reason?: string;
  status?: number;
}

export interface AdapterContext {
  fetchImpl: typeof fetch;
  /** Config do destino (URL + credencial), resolvida do env da function. */
  config: DestinationConfig;
}

export interface DestinationConfig {
  url: string;
  secret: string;
}

/** Snapshot de OS que chega em `payload` para os eventos os.closed/os.completed. */
export interface OsPayload extends Record<string, unknown> {
  os_id: string;
  os_number: string;
  status: string;
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  product_name: string | null;
  product_sku: string | null;
  product_material: string | null;
  technique: string | null;
  fg_technique_id: string | null;
  quantity: number | null;
  delivery_date: string | null;
  observations: string | null;
  owner_email: string | null;
}

/** Snapshot de design que chega em `payload` para design.created/design.updated. */
export interface DesignPayload extends Record<string, unknown> {
  design_id: string;
  name: string;
  product_name: string | null;
  product_sku: string | null;
  thumbnail_url: string | null;
  owner_email: string | null;
  updated_at: string | null;
}
