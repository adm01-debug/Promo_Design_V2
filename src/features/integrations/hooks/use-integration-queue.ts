import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IntegrationEntity = "service_order" | "design";
export type IntegrationDestination = "champions" | "fast_gravacoes" | "supply";
export type IntegrationStatus = "pending" | "delivered" | "failed" | "dead" | "skipped";

export interface IntegrationQueueEvent {
  event_id: string;
  entity: IntegrationEntity;
  entity_id: string;
  event: string;
  destination: IntegrationDestination;
  status: IntegrationStatus;
  attempts: number;
  created_at: string;
  next_attempt_at: string;
  last_error: string | null;
  delivered_at: string | null;
  /** Numero da OS ou nome do design; a fila nao tem FK, entao vem de fora. */
  reference: string | null;
  /** Cliente da OS ou SKU do design. */
  detail: string | null;
  /** Tecnica resolvida para o Fast Gravacoes; NULL = tecnica nao mapeada. */
  fg_technique_id: string | null;
}

export interface IntegrationQueueFilters {
  status?: IntegrationStatus | "all";
  destination?: IntegrationDestination | "all";
}

export const INTEGRATION_QUEUE_LIMIT = 200;

export interface IntegrationQueueSummary {
  events: IntegrationQueueEvent[];
  pending: number;
  waitingRetry: number;
  delivered: number;
  dropped: number;
  skipped: number;
  stuck: number;
  unmappedTechnique: number;
}

/**
 * Contadores exibidos no painel. Fica fora do render (o useQuery aplica em
 * select) para nao chamar Date.now() durante a renderizacao.
 */
export function summarizeIntegrationQueue(
  events: IntegrationQueueEvent[],
  now = Date.now(),
): IntegrationQueueSummary {
  const pendingEvents = events.filter((ev) => ev.status === "pending");

  return {
    events,
    pending: pendingEvents.length,
    waitingRetry: pendingEvents.filter((ev) => new Date(ev.next_attempt_at).getTime() > now).length,
    delivered: events.filter((ev) => ev.status === "delivered").length,
    dropped: events.filter((ev) => ev.status === "failed" || ev.status === "dead").length,
    skipped: events.filter((ev) => ev.status === "skipped").length,
    stuck: countStuckIntegrationEvents(events, now),
    unmappedTechnique: countUnmappedTechniqueEvents(events),
  };
}

type QueueRow = Omit<IntegrationQueueEvent, "reference" | "detail">;

/**
 * Fila multi-destino do Promo Design (integration_queue): cada evento de OS ou
 * de design que precisa chegar em Champions, Fast Gravacoes ou Supply. A policy
 * de SELECT libera o dono do registro e os membros da organizacao dele.
 */
export function useIntegrationQueue(filters: IntegrationQueueFilters = {}) {
  const status = filters.status ?? "all";
  const destination = filters.destination ?? "all";

  return useQuery({
    queryKey: ["integration-queue", status, destination],
    refetchInterval: 30_000,
    select: (events: IntegrationQueueEvent[]) => summarizeIntegrationQueue(events),
    queryFn: async (): Promise<IntegrationQueueEvent[]> => {
      let query = supabase
        .from("integration_queue")
        .select(
          "event_id, entity, entity_id, event, destination, status, attempts, created_at, next_attempt_at, last_error, delivered_at, fg_technique_id:payload->>fg_technique_id",
        )
        .order("created_at", { ascending: false })
        .limit(INTEGRATION_QUEUE_LIMIT);

      if (status !== "all") query = query.eq("status", status);
      if (destination !== "all") query = query.eq("destination", destination);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as unknown as QueueRow[];
      if (rows.length === 0) return [];

      // A fila guarda so (entity, entity_id): sem FK o PostgREST nao embute a
      // origem, entao o numero da OS e o nome do design vem em uma segunda
      // consulta por tipo de entidade.
      const osIds = uniqueIds(rows.filter((row) => row.entity === "service_order"));
      const designIds = uniqueIds(rows.filter((row) => row.entity === "design"));

      const ordersById = new Map<
        string,
        { os_number: string | null; client_name: string | null }
      >();
      if (osIds.length > 0) {
        const { data: orders, error: ordersError } = await supabase
          .from("service_orders")
          .select("id, os_number, client_name")
          .in("id", osIds);
        if (ordersError) throw ordersError;
        for (const order of orders ?? []) {
          ordersById.set(order.id as string, {
            os_number: (order.os_number as string | null) ?? null,
            client_name: (order.client_name as string | null) ?? null,
          });
        }
      }

      const designsById = new Map<string, { name: string | null; product_sku: string | null }>();
      if (designIds.length > 0) {
        const { data: designs, error: designsError } = await supabase
          .from("mockup_drafts")
          .select("id, name, product_sku")
          .in("id", designIds);
        if (designsError) throw designsError;
        for (const design of designs ?? []) {
          designsById.set(design.id as string, {
            name: (design.name as string | null) ?? null,
            product_sku: (design.product_sku as string | null) ?? null,
          });
        }
      }

      return rows.map((row) => {
        if (row.entity === "service_order") {
          const order = ordersById.get(row.entity_id);
          return {
            ...row,
            reference: order?.os_number ? `OS ${order.os_number}` : null,
            detail: order?.client_name ?? null,
          };
        }

        const design = designsById.get(row.entity_id);
        return {
          ...row,
          reference: design?.name ?? null,
          detail: design?.product_sku ?? null,
        };
      });
    },
  });
}

function uniqueIds(rows: QueueRow[]): string[] {
  return Array.from(new Set(rows.map((row) => row.entity_id)));
}

/**
 * Eventos pendentes que o dispatcher ja deveria ter drenado: a proxima
 * tentativa ja passou e o evento continua parado. E a assinatura de destino
 * sem credencial (self-disable) ou de dispatcher parado.
 */
export function countStuckIntegrationEvents(
  events: IntegrationQueueEvent[],
  now = Date.now(),
): number {
  return events.filter(
    (ev) =>
      ev.status === "pending" &&
      new Date(ev.next_attempt_at).getTime() <= now &&
      now - new Date(ev.created_at).getTime() > 15 * 60 * 1000,
  ).length;
}

/** OS indo para o Fast Gravacoes sem tecnica mapeada: o job nao nasce la. */
export function countUnmappedTechniqueEvents(events: IntegrationQueueEvent[]): number {
  return events.filter(
    (ev) => ev.destination === "fast_gravacoes" && ev.status !== "delivered" && !ev.fg_technique_id,
  ).length;
}
