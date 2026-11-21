import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BrandGuidelines } from "./use-brand-guidelines";

export interface BrandHistoryRow {
  id: string;
  brand_guideline_id: string;
  organization_id: string;
  client_id: string;
  snapshot: Json;
  change_summary: string | null;
  version: number;
  created_at: string;
}

export interface BrandHistoryDiff {
  primary_colors: boolean;
  secondary_colors: boolean;
  fonts: boolean;
  do_rules: boolean;
  dont_rules: boolean;
  logo_asset_id: boolean;
  notes: boolean;
}

export function parseSnapshot(raw: Json): BrandGuidelines {
  const s = (raw ?? {}) as Record<string, Json>;
  return {
    id: String(s.id ?? ""),
    organization_id: String(s.organization_id ?? ""),
    client_id: String(s.client_id ?? ""),
    primary_colors: Array.isArray(s.primary_colors)
      ? (s.primary_colors as unknown as BrandGuidelines["primary_colors"])
      : [],
    secondary_colors: Array.isArray(s.secondary_colors)
      ? (s.secondary_colors as unknown as BrandGuidelines["secondary_colors"])
      : [],
    fonts: Array.isArray(s.fonts) ? (s.fonts as unknown as BrandGuidelines["fonts"]) : [],
    do_rules: Array.isArray(s.do_rules) ? (s.do_rules as string[]) : [],
    dont_rules: Array.isArray(s.dont_rules) ? (s.dont_rules as string[]) : [],
    logo_asset_id: typeof s.logo_asset_id === "string" ? s.logo_asset_id : null,
    notes: typeof s.notes === "string" ? s.notes : null,
    created_at: String(s.created_at ?? new Date().toISOString()),
    updated_at: String(s.updated_at ?? new Date().toISOString()),
  };
}

/**
 * Compare two snapshots and return which blocks changed (used by the UI to
 * render a diff table between any two revisions).
 */
export function diffSnapshots(a: BrandGuidelines, b: BrandGuidelines): BrandHistoryDiff {
  const json = (x: unknown) => JSON.stringify(x ?? null);
  return {
    primary_colors: json(a.primary_colors) !== json(b.primary_colors),
    secondary_colors: json(a.secondary_colors) !== json(b.secondary_colors),
    fonts: json(a.fonts) !== json(b.fonts),
    do_rules: json(a.do_rules) !== json(b.do_rules),
    dont_rules: json(a.dont_rules) !== json(b.dont_rules),
    logo_asset_id: a.logo_asset_id !== b.logo_asset_id,
    notes: a.notes !== b.notes,
  };
}

export function useBrandGuidelinesHistory(organizationId: string | null, clientId: string | null) {
  const qc = useQueryClient();

  const history = useQuery({
    queryKey: ["brand_history", clientId],
    enabled: !!organizationId && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_guidelines_history")
        .select(
          "id, brand_guideline_id, organization_id, client_id, snapshot, change_summary, version, created_at",
        )
        .eq("client_id", clientId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, guidelines: parseSnapshot(r.snapshot) }));
    },
  });

  const restore = useMutation({
    mutationFn: async (version: number) => {
      if (!organizationId || !clientId) throw new Error("requer org/client");
      // Fetch the version snapshot and re-apply it on top of the current row.
      const { data: rows, error: readErr } = await supabase
        .from("brand_guidelines_history")
        .select("snapshot")
        .eq("client_id", clientId!)
        .eq("version", version)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!rows) throw new Error("Versão não encontrada");
      const snap = parseSnapshot(rows.snapshot);
      const { error } = await supabase
        .from("brand_guidelines")
        .update({
          primary_colors: snap.primary_colors as unknown as Json,
          secondary_colors: snap.secondary_colors as unknown as Json,
          fonts: snap.fonts as unknown as Json,
          do_rules: snap.do_rules,
          dont_rules: snap.dont_rules,
          logo_asset_id: snap.logo_asset_id,
          notes: snap.notes,
        })
        .eq("client_id", clientId!)
        .eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand_history", clientId] });
      qc.invalidateQueries({ queryKey: ["brand_guidelines", clientId] });
    },
  });

  return { history: history.data ?? [], isLoading: history.isLoading, restore };
}
