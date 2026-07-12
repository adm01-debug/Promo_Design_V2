import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Settings2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface RetentionRow {
  audit_retention_days: number;
  notifications_retention_days: number;
  status_audit_retention_days: number;
}

const DEFAULTS: RetentionRow = {
  audit_retention_days: 180,
  notifications_retention_days: 90,
  status_audit_retention_days: 365,
};

const FIELDS: Array<{
  key: keyof RetentionRow;
  label: string;
  hint: string;
  min: number;
  max: number;
}> = [
  { key: "audit_retention_days", label: "Auditoria", hint: "Logs de auditoria (30–3650 dias)", min: 30, max: 3650 },
  { key: "notifications_retention_days", label: "Notificações lidas", hint: "Notificações marcadas como lidas (7–3650 dias)", min: 7, max: 3650 },
  { key: "status_audit_retention_days", label: "Histórico de status", hint: "Alterações de status de OS (30–3650 dias)", min: 30, max: 3650 },
];

export function RetentionSettingsPanel() {
  const { currentOrgId, can } = useOrganizations();
  const qc = useQueryClient();
  const canEdit = can(["owner", "admin"]);

  const query = useQuery({
    queryKey: ["org-retention", currentOrgId],
    enabled: !!currentOrgId,
    queryFn: async (): Promise<RetentionRow> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("audit_retention_days,notifications_retention_days,status_audit_retention_days")
        .eq("id", currentOrgId!)
        .maybeSingle();
      if (error) throw error;
      return {
        audit_retention_days: data?.audit_retention_days ?? DEFAULTS.audit_retention_days,
        notifications_retention_days: data?.notifications_retention_days ?? DEFAULTS.notifications_retention_days,
        status_audit_retention_days: data?.status_audit_retention_days ?? DEFAULTS.status_audit_retention_days,
      };
    },
  });

  const [form, setForm] = useState<RetentionRow>(DEFAULTS);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: async (payload: RetentionRow) => {
      if (!currentOrgId) throw new Error("Organização não selecionada");
      const { error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", currentOrgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Retenção atualizada");
      qc.invalidateQueries({ queryKey: ["org-retention", currentOrgId] });
    },
    onError: (e: Error) => toast.error(`Falha ao salvar: ${e.message}`),
  });

  const dirty =
    !!query.data &&
    (form.audit_retention_days !== query.data.audit_retention_days ||
      form.notifications_retention_days !== query.data.notifications_retention_days ||
      form.status_audit_retention_days !== query.data.status_audit_retention_days);

  const invalid = FIELDS.some((f) => {
    const v = form[f.key];
    return !Number.isInteger(v) || v < f.min || v > f.max;
  });

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" /> Retenção por organização
        </h3>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={!query.data || mutation.isPending}
              onClick={() => setForm(DEFAULTS)}
              title="Restaurar padrões (180 / 90 / 365)"
            >
              <RotateCcw className="h-3 w-3" /> Padrões
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={!dirty || invalid || mutation.isPending}
              onClick={() => mutation.mutate(form)}
            >
              {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </Button>
          </div>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar as configurações de retenção.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FIELDS.map((f) => {
            const value = form[f.key];
            const outOfRange = !Number.isInteger(value) || value < f.min || value > f.max;
            return (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`retention-${f.key}`} className="text-xs">
                  {f.label}
                </Label>
                <Input
                  id={`retention-${f.key}`}
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  value={Number.isFinite(value) ? value : ""}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [f.key]: Number.parseInt(e.target.value, 10) }))
                  }
                  className={`h-8 text-xs font-mono ${outOfRange ? "border-destructive" : ""}`}
                />
                <p className="text-[10px] text-muted-foreground">{f.hint}</p>
              </div>
            );
          })}
        </div>
      )}
      {!canEdit && (
        <p className="text-[10px] text-muted-foreground">Apenas owners e admins podem editar a retenção.</p>
      )}
    </div>
  );
}
