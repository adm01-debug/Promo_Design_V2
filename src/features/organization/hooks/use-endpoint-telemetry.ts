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
