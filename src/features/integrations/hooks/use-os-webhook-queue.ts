import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OsWebhookStatus = "pending" | "delivered" | "failed" | "dead";
export type OsWebhookEventName = "os.created" | "os.updated" | "os.status_changed" | "os.deleted";

export interface OsWebhookEvent {
  event_id: string;
  os_id: string;
  event: OsWebhookEventName;
  status: OsWebhookStatus;
  attempts: number;
  created_at: string;
  next_attempt_at: string;
  last_error: string | null;
  delivered_at: string | null;
  /** Numero da OS e cliente, buscados em service_orders (sem FK na fila). */
  os_number: string | null;
  client_name: string | null;
}

export interface OsWebhookQueueFilters {
  status?: OsWebhookStatus | "all";
  event?: OsWebhookEventName | "all";
}

export const OS_WEBHOOK_QUEUE_LIMIT = 200;

export interface OsWebhookQueueSummary {
  events: OsWebhookEvent[];
  pending: number;
  waitingRetry: number;
  delivered: number;
  dropped: number;
  stuck: number;
}

/**
 * Contadores exibidos no painel. Fica fora do render (o useQuery aplica em
 * select) para nao chamar Date.now() durante a renderizacao.
 */
export function summarizeOsWebhookQueue(
  events: OsWebhookEvent[],
  now = Date.now(),
): OsWebhookQueueSummary {
  const pendingEvents = events.filter((ev) => ev.status === "pending");

  return {
    events,
    pending: pendingEvents.length,
    waitingRetry: pendingEvents.filter((ev) => new Date(ev.next_attempt_at).getTime() > now).length,
    delivered: events.filter((ev) => ev.status === "delivered").length,
    dropped: events.filter((ev) => ev.status === "dead" || ev.status === "failed").length,
    stuck: countStuckOsWebhooks(events, now),
  };
}

type QueueRow = Omit<OsWebhookEvent, "os_number" | "client_name">;

/**
 * Fila de webhooks enviados ao ERP (os_webhook_queue). A tabela e alimentada
 * pelas triggers de service_orders e drenada pelo cron a cada minuto; a policy
 * de SELECT libera o dono da OS e os membros da organizacao dela.
 */
export function useOsWebhookQueue(filters: OsWebhookQueueFilters = {}) {
  const status = filters.status ?? "all";
  const event = filters.event ?? "all";

  return useQuery({
    queryKey: ["os-webhook-queue", status, event],
    refetchInterval: 30_000,
    select: (events: OsWebhookEvent[]) => summarizeOsWebhookQueue(events),
    queryFn: async (): Promise<OsWebhookEvent[]> => {
      let query = supabase
        .from("os_webhook_queue")
        .select(
          "event_id, os_id, event, status, attempts, created_at, next_attempt_at, last_error, delivered_at",
        )
        .order("created_at", { ascending: false })
        .limit(OS_WEBHOOK_QUEUE_LIMIT);

      if (status !== "all") query = query.eq("status", status);
      if (event !== "all") query = query.eq("event", event);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as QueueRow[];
      if (rows.length === 0) return [];

      // os_webhook_queue nao tem FK para service_orders, entao o PostgREST nao
      // consegue embutir o numero da OS: a busca vai em uma segunda consulta.
      const osIds = Array.from(new Set(rows.map((row) => row.os_id)));
      const { data: orders, error: ordersError } = await supabase
        .from("service_orders")
        .select("id, os_number, client_name")
        .in("id", osIds);

      if (ordersError) throw ordersError;

      const ordersById = new Map((orders ?? []).map((order) => [order.id as string, order]));

      return rows.map((row) => ({
        ...row,
        os_number: (ordersById.get(row.os_id)?.os_number as string | null) ?? null,
        client_name: (ordersById.get(row.os_id)?.client_name as string | null) ?? null,
      }));
    },
  });
}

/**
 * Eventos pendentes que o cron ja deveria ter drenado: a proxima tentativa
 * ja passou e o evento continua parado. E a assinatura de dispatcher parado
 * (integracao desligada por falta de credencial do ERP, por exemplo).
 */
export function countStuckOsWebhooks(events: OsWebhookEvent[], now = Date.now()): number {
  return events.filter(
    (ev) =>
      ev.status === "pending" &&
      new Date(ev.next_attempt_at).getTime() <= now &&
      now - new Date(ev.created_at).getTime() > 15 * 60 * 1000,
  ).length;
}
