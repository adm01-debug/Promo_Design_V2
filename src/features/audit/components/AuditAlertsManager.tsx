import { useState } from "react";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useAuditAlertRules,
  useDeleteAuditAlertRule,
  useUpdateAuditAlertRule,
  type AuditAlertRule,
} from "../hooks/use-audit-alerts";
import { AuditAlertRuleForm } from "./AuditAlertRuleForm";
import type { AuditFilterState } from "./AuditFilters";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  currentUserId: string | undefined;
  tables: string[];
  members: { user_id: string; label: string }[];
  prefill?: Partial<AuditFilterState>;
}

export function AuditAlertsManager({
  open,
  onOpenChange,
  organizationId,
  currentUserId,
  tables,
  members,
  prefill,
}: Props) {
  const { toast } = useToast();
  const { data: rules = [], isLoading } = useAuditAlertRules(organizationId);
  const update = useUpdateAuditAlertRule();
  const remove = useDeleteAuditAlertRule();
  const [formOpen, setFormOpen] = useState(false);

  const ownRules = rules.filter((r) => r.user_id === currentUserId);
  const teamRules = rules.filter((r) => r.user_id !== currentUserId);

  const handleToggle = async (rule: AuditAlertRule, value: boolean) => {
    try {
      await update.mutateAsync({ id: rule.id, patch: { is_active: value } });
    } catch (err) {
      toast({
        title: "Erro ao alterar regra",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: "Regra removida" });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="w-full sm:max-w-md overflow-y-auto"
          data-testid="audit-alerts-sheet"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Alertas de auditoria
            </SheetTitle>
            <SheetDescription>
              Crie regras para receber notificações quando eventos específicos acontecerem na sua organização.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <Button
              onClick={() => setFormOpen(true)}
              className="w-full"
              data-testid="audit-alerts-new-rule"
            >
              <Plus className="h-4 w-4" />
              Nova regra {prefill && Object.keys(prefill).length > 0 ? "(a partir dos filtros)" : ""}
            </Button>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : (
              <>
                <RuleSection
                  title="Suas regras"
                  rules={ownRules}
                  isOwner
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  pendingUpdate={update.isPending}
                />
                <RuleSection
                  title="Regras da equipe"
                  rules={teamRules}
                  isOwner={false}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  pendingUpdate={update.isPending}
                />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AuditAlertRuleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        organizationId={organizationId}
        tables={tables}
        members={members}
        prefill={prefill}
      />
    </>
  );
}

function RuleSection({
  title,
  rules,
  isOwner,
  onToggle,
  onDelete,
  pendingUpdate,
}: {
  title: string;
  rules: AuditAlertRule[];
  isOwner: boolean;
  onToggle: (r: AuditAlertRule, v: boolean) => void;
  onDelete: (id: string) => void;
  pendingUpdate: boolean;
}) {
  if (rules.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">
        {rules.map((r) => (
          <div
            key={r.id}
            data-testid={`audit-alert-rule-${r.id}`}
            className="rounded-lg border bg-card p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug flex-1">{r.name}</p>
              {isOwner && (
                <Switch
                  checked={r.is_active}
                  onCheckedChange={(v) => onToggle(r, v)}
                  disabled={pendingUpdate}
                  data-testid={`audit-alert-rule-toggle-${r.id}`}
                  aria-label={`Ativar regra ${r.name}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {(r.actions.length === 0 ? ["qualquer ação"] : r.actions).map((a) => (
                <Badge key={a} variant="secondary" className="text-[10px]">
                  {a}
                </Badge>
              ))}
              {r.table_names.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
              {r.value_key && (
                <Badge variant="outline" className="text-[10px]">
                  {r.value_key} ⊃ {r.value_query}
                </Badge>
              )}
            </div>
            {isOwner && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(r.id)}
                  data-testid={`audit-alert-rule-delete-${r.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}