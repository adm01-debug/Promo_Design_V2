import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditAdvancedOp =
  | "contains"
  | "equals"
  | "not_equals"
  | "starts_with"
  | "ends_with";

export interface AuditAdvancedCondition {
  key: string;
  op: AuditAdvancedOp;
  value: string;
}

export interface AuditAlertRule {
  id: string;
  organization_id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  actions: string[];
  table_names: string[];
  target_user_id: string | null;
  value_key: string | null;
  value_query: string | null;
  recipients_mode: "owner" | "organization" | "users";
  recipient_user_ids: string[];
  advanced_conditions: AuditAdvancedCondition[];
  created_at: string;
  updated_at: string;
}

export interface CreateAuditAlertRuleInput {
  organization_id: string;
  name: string;
  actions?: string[];
  table_names?: string[];
  target_user_id?: string | null;
  value_key?: string | null;
  value_query?: string | null;
  is_active?: boolean;
  recipients_mode?: "owner" | "organization" | "users";
  recipient_user_ids?: string[];
  advanced_conditions?: AuditAdvancedCondition[];
}

export function useAuditAlertRules(organizationId: string | null) {
  return useQuery({
    queryKey: ["audit-alert-rules", organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<AuditAlertRule[]> => {
      const { data, error } = await supabase
        .from("audit_alert_rules" as never)
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuditAlertRule[];
    },
  });
}

export function useCreateAuditAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAuditAlertRuleInput): Promise<AuditAlertRule> => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Não autenticado");
      const payload = {
        organization_id: input.organization_id,
        user_id: userId,
        name: input.name,
        is_active: input.is_active ?? true,
        actions: input.actions ?? [],
        table_names: input.table_names ?? [],
        target_user_id: input.target_user_id ?? null,
        value_key: input.value_key ?? null,
        value_query: input.value_query ?? null,
        recipients_mode: input.recipients_mode ?? "owner",
        recipient_user_ids: input.recipient_user_ids ?? [],
      };
      const { data, error } = await supabase
        .from("audit_alert_rules" as never)
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as AuditAlertRule;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["audit-alert-rules", vars.organization_id] });
    },
  });
}

export function useUpdateAuditAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AuditAlertRule> }) => {
      const { error } = await supabase
        .from("audit_alert_rules" as never)
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-alert-rules"] });
    },
  });
}

export function useDeleteAuditAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("audit_alert_rules" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-alert-rules"] });
    },
  });
}