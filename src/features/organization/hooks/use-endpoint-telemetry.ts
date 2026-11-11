import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/use-organization";

export interface EndpointTelemetryRow {
  endpoint: string;
  calls: number;
  unique_users: number;
  tokens_in: number;
  tokens_out: number;
  cost_estimate: number;
  last_call: string;
}

export interface ComplianceEventRow {
  event: string;
  table_name: string;
  events: number;
  last_event: string;
}

export interface EndpointTelemetry {
  window_days: number;
  totals: { total_calls: number; total_cost: number; endpoints: number };
  endpoints: EndpointTelemetryRow[];
  compliance: ComplianceEventRow[];
}

/** Telemetria agregada por endpoint + eventos de conformidade da organização. */
export function useEndpointTelemetry(days = 30) {
  const { currentOrgId } = useOrganizations();

  return useQuery({
    queryKey: ["endpoint-telemetry", currentOrgId, days],
    enabled: !!currentOrgId,
    staleTime: 60_000,
    queryFn: async (): Promise<EndpointTelemetry | null> => {
      if (!currentOrgId) return null;
      const { data, error } = await supabase.rpc("get_endpoint_telemetry", {
        _org_id: currentOrgId,
        _days: days,
      });
      if (error) throw error;
      return data as unknown as EndpointTelemetry;
    },
  });
}

export interface TelemetryDelta {
  /** Valor da janela atual. */
  current: number;
  /** Valor da janela imediatamente anterior, de mesma duração. */
  previous: number;
  /** Variação percentual; `null` quando não há base de comparação (previous = 0). */
  percent: number | null;
}

export interface EndpointTelemetryComparison {
  totals: {
    total_calls: TelemetryDelta;
    total_cost: TelemetryDelta;
    endpoints: TelemetryDelta;
  };
  /** Delta de chamadas por endpoint (união das duas janelas). */
  byEndpoint: Record<string, TelemetryDelta>;
  /** Delta de eventos de conformidade por tipo de evento. */
  byComplianceEvent: Record<string, TelemetryDelta>;
}

function delta(current: number, previous: number): TelemetryDelta {
  const percent = previous === 0 ? null : ((current - previous) / previous) * 100;
  return { current, previous, percent };
}

/**
 * Compara a janela atual (`days`) com a janela anterior de mesma duração.
 *
 * A RPC só aceita janelas ancoradas em `now()`, então derivamos a janela
 * anterior por diferença: `anterior = agregado(2 * days) - agregado(days)`.
 * Isso é exato para métricas aditivas (chamadas, custo, tokens, eventos) e
 * por isso `endpoints` (contagem distinta) é comparado por cardinalidade das
 * listas, nunca por subtração.
 */
export function useEndpointTelemetryComparison(days = 30): {
  comparison: EndpointTelemetryComparison | null;
  isLoading: boolean;
} {
  const current = useEndpointTelemetry(days);
  const doubled = useEndpointTelemetry(days * 2);

  const comparison = useMemo<EndpointTelemetryComparison | null>(() => {
    if (!current.data || !doubled.data) return null;

    const curEndpoints = new Map(current.data.endpoints.map((e) => [e.endpoint, e]));
    const allEndpoints = new Map(doubled.data.endpoints.map((e) => [e.endpoint, e]));

    const byEndpoint: Record<string, TelemetryDelta> = {};
    const endpointNames = new Set([...curEndpoints.keys(), ...allEndpoints.keys()]);
    let previousEndpointCount = 0;
    for (const name of endpointNames) {
      const cur = curEndpoints.get(name)?.calls ?? 0;
      const total = allEndpoints.get(name)?.calls ?? 0;
      const prev = Math.max(0, total - cur);
      if (prev > 0) previousEndpointCount += 1;
      byEndpoint[name] = delta(cur, prev);
    }

    const curCompliance = new Map(current.data.compliance.map((c) => [c.event, c]));
    const allCompliance = new Map(doubled.data.compliance.map((c) => [c.event, c]));
    const byComplianceEvent: Record<string, TelemetryDelta> = {};
    for (const name of new Set([...curCompliance.keys(), ...allCompliance.keys()])) {
      const cur = curCompliance.get(name)?.events ?? 0;
      const total = allCompliance.get(name)?.events ?? 0;
      byComplianceEvent[name] = delta(cur, Math.max(0, total - cur));
    }

    const curCalls = current.data.totals.total_calls;
    const curCost = Number(current.data.totals.total_cost ?? 0);

    return {
      totals: {
        total_calls: delta(curCalls, Math.max(0, doubled.data.totals.total_calls - curCalls)),
        total_cost: delta(
          curCost,
          Math.max(0, Number(doubled.data.totals.total_cost ?? 0) - curCost),
        ),
        endpoints: delta(current.data.totals.endpoints, previousEndpointCount),
      },
      byEndpoint,
      byComplianceEvent,
    };
  }, [current.data, doubled.data]);

  return { comparison, isLoading: current.isLoading || doubled.isLoading };
}
