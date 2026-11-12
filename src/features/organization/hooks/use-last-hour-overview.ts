import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";

export interface OverviewMaintenanceError {
  id: string;
  source: string;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface OverviewAlert {
  id: string;
  event_type: string;
  os_number: string | null;
  product_name: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  read: boolean;
}

export interface OverviewTopFeature {
  feature_name: string;
  requests: number;
  cost: number;
}

export interface LastHourOverviewPayload {
  window_minutes: number;
  since: string;
  captured_at: string;
  totals: {
    maintenance_errors: number;
    alerts: number;
    ai_requests: number;
  };
  maintenance_errors: OverviewMaintenanceError[];
  maintenance_errors_by_source: Record<string, number>;
  alerts: OverviewAlert[];
  alerts_by_type: Record<string, number>;
  ai_usage: {
    requests: number;
    total_cost: number;
    tokens_in: number;
    tokens_out: number;
  };
  top_ai_features: OverviewTopFeature[];
}

/**
 * Type-safe RPC wrapper. `get_last_hour_overview` returns jsonb — we validate
 * the shape defensively so downstream components never render undefined.
 */
export function parseOverviewPayload(raw: unknown): LastHourOverviewPayload {
  const obj = (raw ?? {}) as Partial<LastHourOverviewPayload>;
  return {
    window_minutes: Number(obj.window_minutes ?? 60),
    since: String(obj.since ?? new Date().toISOString()),
    captured_at: String(obj.captured_at ?? new Date().toISOString()),
    totals: {
      maintenance_errors: Number(obj.totals?.maintenance_errors ?? 0),
      alerts: Number(obj.totals?.alerts ?? 0),
      ai_requests: Number(obj.totals?.ai_requests ?? 0),
    },
    maintenance_errors: Array.isArray(obj.maintenance_errors) ? obj.maintenance_errors : [],
    maintenance_errors_by_source: (obj.maintenance_errors_by_source ?? {}) as Record<
      string,
      number
    >,
    alerts: Array.isArray(obj.alerts) ? obj.alerts : [],
    alerts_by_type: (obj.alerts_by_type ?? {}) as Record<string, number>,
    ai_usage: {
      requests: Number(obj.ai_usage?.requests ?? 0),
      total_cost: Number(obj.ai_usage?.total_cost ?? 0),
      tokens_in: Number(obj.ai_usage?.tokens_in ?? 0),
      tokens_out: Number(obj.ai_usage?.tokens_out ?? 0),
    },
    top_ai_features: Array.isArray(obj.top_ai_features) ? obj.top_ai_features : [],
  };
}

async function fetchOverview(minutes: number): Promise<LastHourOverviewPayload> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  )("get_last_hour_overview", { _minutes: minutes });
  if (error) throw new Error(error.message);
  return parseOverviewPayload(data);
}

const POLL_MS = 30_000;

export function useLastHourOverview(minutes = 60, enabled = true) {
  const query = useQuery({
    queryKey: ["last-hour-overview", minutes],
    queryFn: () => fetchOverview(minutes),
    enabled,
    staleTime: 15_000,
  });

  useVisibilityPolling(
    () => {
      if (enabled) query.refetch();
    },
    POLL_MS,
    enabled,
    `last-hour-overview:${minutes}`,
  );

  return query;
}
