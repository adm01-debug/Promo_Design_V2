import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        .from("audit_saved_views" as never)
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuditSavedView[];
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
        .from("audit_saved_views" as never)
        .insert({
          organization_id: input.organization_id,
          user_id: userId,
          name: input.name.trim(),
          filters: input.filters,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as AuditSavedView;
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
      const { error } = await supabase
        .from("audit_saved_views" as never)
        .delete()
        .eq("id", id);
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
        .from("audit_saved_views" as never)
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-saved-views"] });
    },
  });
}
