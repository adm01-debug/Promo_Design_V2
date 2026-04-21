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
  page: number;
  pageSize: number;
}

function applyFilters(query: any, f: AuditFilters) {
  query = query.eq("organization_id", f.organizationId!);
  if (f.from) query = query.gte("created_at", f.from);
  if (f.to) query = query.lte("created_at", f.to);
  if (f.actions && f.actions.length > 0 && f.actions.length < 3) {
    query = query.in("action", f.actions);
  }
  if (f.tableName) query = query.eq("table_name", f.tableName);
  if (f.userId) query = query.eq("user_id", f.userId);
  if (f.recordIdQuery && f.recordIdQuery.length >= 4) {
    query = query.ilike("record_id", `%${f.recordIdQuery}%`);
  }
  return query;
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