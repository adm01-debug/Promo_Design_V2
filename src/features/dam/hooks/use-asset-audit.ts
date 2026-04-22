import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Asset } from "./use-assets";

const TRACKED_FIELDS = [
  "name",
  "tags",
  "description",
  "dominant_colors",
  "asset_type",
  "client_id",
  "metadata",
] as const;

export type TrackedField = (typeof TRACKED_FIELDS)[number];

export interface AssetAuditEntry {
  id: string;
  asset_id: string;
  version: number | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  user_id: string;
  created_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: TrackedField[];
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Deep-equal check that walks plain objects/arrays. Primitive comparison via
 * `Object.is` (so NaN === NaN). Used to detect nested mutations inside
 * `metadata` without producing false positives from key reordering.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (isObj(a) && isObj(b)) {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

function diffFields(
  oldV: Record<string, unknown> | null,
  newV: Record<string, unknown> | null,
): TrackedField[] {
  if (!oldV || !newV) return [];
  const changed: TrackedField[] = [];
  for (const k of TRACKED_FIELDS) {
    if (k === "metadata") {
      // Walk nested metadata so we catch changes inside any sub-key
      // (e.g. metadata.exif.iso) but only flag when something truly differs.
      if (!deepEqual(oldV[k], newV[k])) changed.push(k);
    } else if (!deepEqual(oldV[k], newV[k])) {
      changed.push(k);
    }
  }
  return changed;
}

export function useAssetAudit(asset: Asset | null) {
  const rootId = asset?.parent_asset_id ?? asset?.id ?? null;

  return useQuery({
    queryKey: ["asset-audit", rootId],
    enabled: !!rootId,
    queryFn: async (): Promise<AssetAuditEntry[]> => {
      if (!rootId) return [];

      // Fetch full version chain
      const { data: chain, error: chainErr } = await supabase
        .from("assets")
        .select("id")
        .or(`id.eq.${rootId},parent_asset_id.eq.${rootId}`);
      if (chainErr) throw chainErr;
      const ids = (chain ?? []).map((r) => r.id);
      if (ids.length === 0) return [];

      const { data: logs, error: logsErr } = await supabase
        .from("audit_log")
        .select("*")
        .eq("table_name", "assets")
        .in("record_id", ids)
        .order("created_at", { ascending: true });
      if (logsErr) throw logsErr;

      return (logs ?? []).map((l) => {
        const oldV = isObj(l.old_values) ? (l.old_values as Record<string, unknown>) : null;
        const newV = isObj(l.new_values) ? (l.new_values as Record<string, unknown>) : null;
        const action = l.action as AssetAuditEntry["action"];
        const version =
          newV && typeof newV.version === "number"
            ? (newV.version as number)
            : oldV && typeof oldV.version === "number"
              ? (oldV.version as number)
              : null;
        const changed_fields = action === "UPDATE" ? diffFields(oldV, newV) : [];
        return {
          id: l.id,
          asset_id: l.record_id ?? "",
          version,
          action,
          user_id: l.user_id,
          created_at: l.created_at,
          old_values: oldV,
          new_values: newV,
          changed_fields,
        };
      });
    },
  });
}

export const FIELD_LABELS: Record<TrackedField, string> = {
  name: "nome",
  tags: "tags",
  description: "descrição",
  dominant_colors: "cores",
  asset_type: "tipo",
  client_id: "cliente",
  metadata: "metadados",
};

export { TRACKED_FIELDS };