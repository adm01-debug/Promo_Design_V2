import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

const savedViewFilters = (filters: Json): AuditSavedViewFilters =>
  filters as unknown as AuditSavedViewFilters;

const savedViewRow = (
  row: Database["public"]["Tables"]["audit_saved_views"]["Row"],
): AuditSavedView => ({
  ...row,
  filters: savedViewFilters(row.filters),
});

export interface AuditSavedViewFilters {
  from?: string;
  to?: string;
  actions?: string[];
  tableName?: string;
  userId?: string;
  recordIdQuery?: string;
  valueKey?: string;
  valueQuery?: string;
  ipQuery?: string;
  userAgentQuery?: string;
  /** Pagination state — restored when applying the view. */
  page?: number;
  pageSize?: number;
}

export interface AuditSavedView {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  filters: AuditSavedViewFilters;
  created_at: string;
  updated_at: string;
}

export function useAuditSavedViews(organizationId: string | null) {
  return useQuery({
    queryKey: ["audit-saved-views", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<AuditSavedView[]> => {
      const { data, error } = await supabase
        .from("audit_saved_views")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(savedViewRow);
    },
  });
}

export function useCreateAuditSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      organization_id: string;
      name: string;
      filters: AuditSavedViewFilters;
    }): Promise<AuditSavedView> => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("audit_saved_views")
        .insert({
          organization_id: input.organization_id,
          user_id: userId,
          name: input.name.trim(),
          filters: input.filters as unknown as Json,
        })
        .select("*")
        .single();
      if (error) throw error;
      return savedViewRow(data);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["audit-saved-views", vars.organization_id] });
    },
  });
}

export function useDeleteAuditSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("audit_saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-saved-views"] });
    },
  });
}

export function useUpdateAuditSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<AuditSavedView, "name" | "filters">>;
    }) => {
      const { error } = await supabase
        .from("audit_saved_views")
        .update({
          name: patch.name,
          filters: patch.filters as unknown as Json | undefined,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-saved-views"] });
    },
  });
}
