import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface AuditEntry {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string | null;
  action: AuditAction;
  created_at: string;
  old_values: unknown;
  new_values: unknown;
}

export interface AuditFilters {
  organizationId: string | null;
  from?: string; // ISO
  to?: string; // ISO
  actions?: AuditAction[];
  tableName?: string;
  userId?: string;
  recordIdQuery?: string;
  valueKey?: string;       // chave dentro de old_values/new_values (ex: "status")
  valueQuery?: string;     // texto a procurar
  ipQuery?: string;        // substring do ip_address
  userAgentQuery?: string; // substring do user_agent
  page: number;
  pageSize: number;
}

/**
 * Minimal structural type covering only the fluent builder methods we chain in
 * `applyFilters`. Using a generic `<Q extends AuditQueryBuilder>` preserves the
 * caller's concrete builder type end-to-end (including the row typing needed
 * for `.order().range()` afterwards) without leaking `any`.
 */
interface AuditQueryBuilder {
  eq: (column: string, value: unknown) => this;
  gte: (column: string, value: unknown) => this;
  lte: (column: string, value: unknown) => this;
  in: (column: string, values: readonly unknown[]) => this;
  ilike: (column: string, pattern: string) => this;
  or: (filters: string) => this;
}

function applyFilters<Q extends AuditQueryBuilder>(query: Q, f: AuditFilters): Q {
  let q = query.eq("organization_id", f.organizationId!);
  if (f.from) q = q.gte("created_at", f.from);
  if (f.to) q = q.lte("created_at", f.to);
  if (f.actions && f.actions.length > 0 && f.actions.length < 3) {
    q = q.in("action", f.actions);
  }
  if (f.tableName) q = q.eq("table_name", f.tableName);
  if (f.userId) q = q.eq("user_id", f.userId);
  if (f.recordIdQuery && f.recordIdQuery.length >= 4) {
    q = q.ilike("record_id", `%${f.recordIdQuery}%`);
  }
  if (f.ipQuery && f.ipQuery.trim().length > 0) {
    const term = f.ipQuery.trim().replace(/[,()%]/g, "");
    q = q.ilike("ip_address", `%${term}%`);
  }
  if (f.userAgentQuery && f.userAgentQuery.trim().length > 0) {
    const term = f.userAgentQuery.trim().replace(/[,()%]/g, "");
    q = q.ilike("user_agent", `%${term}%`);
  }
  // Filtro por valor dentro de old_values / new_values.
  // Server-side só funciona quando temos uma CHAVE (PostgREST suporta column->>key=ilike.*x*).
  if (f.valueKey && f.valueKey.trim().length > 0) {
    const key = f.valueKey.trim().replace(/[",()]/g, "");
    const term = (f.valueQuery ?? "").trim();
    if (term.length > 0) {
      const safeTerm = term.replace(/[,()]/g, "");
      q = q.or(
        `old_values->>${key}.ilike.%${safeTerm}%,new_values->>${key}.ilike.%${safeTerm}%`,
      );
    } else {
      // só chave: traz registros onde a chave existe em algum dos lados (não-nulo)
      q = q.or(
        `old_values->>${key}.not.is.null,new_values->>${key}.not.is.null`,
      );
    }
  }
  return q;
}

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ["audit-log", filters],
    enabled: !!filters.organizationId,
    queryFn: async (): Promise<{ rows: AuditEntry[]; count: number }> => {
      const offset = filters.page * filters.pageSize;
      let query = supabase
        .from("audit_log")
        .select("id, user_id, table_name, record_id, action, created_at, old_values, new_values", {
          count: "exact",
        });
      query = applyFilters(query, filters);
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + filters.pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as AuditEntry[], count: count ?? 0 };
    },
  });
}

export function useAuditDistinctTables(organizationId: string | null) {
  return useQuery({
    queryKey: ["audit-tables", organizationId],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("table_name")
        .eq("organization_id", organizationId!)
        .order("table_name", { ascending: true })
        .limit(2000);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of data ?? []) set.add((r as { table_name: string }).table_name);
      return Array.from(set).sort();
    },
  });
}

export async function fetchAuditExport(filters: AuditFilters, max = 5000): Promise<AuditEntry[]> {
  let query = supabase
    .from("audit_log")
    .select("id, user_id, table_name, record_id, action, created_at, old_values, new_values");
  query = applyFilters(query, filters);
  const { data, error } = await query.order("created_at", { ascending: false }).range(0, max - 1);
  if (error) throw error;
  return (data ?? []) as AuditEntry[];
}

export interface AuditEntryFull extends AuditEntry {
  ip_address: string | null;
  user_agent: string | null;
  organization_id: string | null;
}

export function useAuditEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["audit-event", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<AuditEntryFull> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select(
          "id, organization_id, user_id, table_name, record_id, action, created_at, old_values, new_values, ip_address, user_agent",
        )
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Evento não encontrado");
      return data as unknown as AuditEntryFull;
    },
  });
}

export function useAuditRecordHistory(
  tableName: string | undefined,
  recordId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["audit-record-history", tableName, recordId],
    enabled: !!tableName && !!recordId,
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, user_id, table_name, record_id, action, created_at, old_values, new_values")
        .eq("table_name", tableName!)
        .eq("record_id", recordId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as AuditEntry[];
    },
  });
}