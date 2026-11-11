import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LibraryActivityAction = "INSERT" | "UPDATE" | "DELETE";

export interface LibraryActivityEntry {
  id: string;
  asset_id: string | null;
  action: LibraryActivityAction;
  user_id: string;
  created_at: string;
  asset_name: string | null;
  version: number | null;
  is_archive_change: boolean;
  is_restore: boolean;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function useLibraryActivity(organizationId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["dam-library-activity", organizationId, limit],
    enabled: !!organizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<LibraryActivityEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, record_id, action, user_id, created_at, old_values, new_values")
        .eq("organization_id", organizationId!)
        .eq("table_name", "assets")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((l) => {
        const oldV = isObj(l.old_values) ? l.old_values : null;
        const newV = isObj(l.new_values) ? l.new_values : null;
        const ref = newV ?? oldV;
        const name = ref && typeof ref.name === "string" ? (ref.name as string) : null;
        const version =
          newV && typeof newV.version === "number"
            ? (newV.version as number)
            : oldV && typeof oldV.version === "number"
              ? (oldV.version as number)
              : null;
        const archChanged =
          l.action === "UPDATE" && !!oldV && !!newV && oldV.is_archived !== newV.is_archived;
        const isRestore = archChanged && newV?.is_archived === false;
        return {
          id: l.id,
          asset_id: l.record_id ?? null,
          action: l.action as LibraryActivityAction,
          user_id: l.user_id,
          created_at: l.created_at,
          asset_name: name,
          version,
          is_archive_change: archChanged,
          is_restore: isRestore,
        };
      });
    },
  });
}
