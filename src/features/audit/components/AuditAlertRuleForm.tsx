import { useState } from "react";
import { Loader2, Plus, Trash2, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useCreateAuditAlertRule } from "../hooks/use-audit-alerts";
import type { AuditAdvancedCondition, AuditAdvancedOp } from "../hooks/use-audit-alerts";
import type { AuditAction } from "../hooks/use-audit-log";
import type { AuditFilterState } from "./AuditFilters";

const ALL_ACTIONS: AuditAction[] = ["INSERT", "UPDATE", "DELETE"];
const SENTINEL_ANY = "__any__";

type RecipientsMode = "owner" | "organization" | "users";

const OP_LABEL: Record<AuditAdvancedOp, string> = {
  contains: "contém",
  equals: "é igual a",
  not_equals: "diferente de",
  starts_with: "começa com",
  ends_with: "termina com",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  tables: string[];
  members: { user_id: string; label: string }[];
  prefill?: Partial<AuditFilterState>;
}

export function AuditAlertRuleForm({
  open,
  onOpenChange,
  organizationId,
  tables,
  members,
  prefill,
}: Props) {
  const { toast } = useToast();
  const create = useCreateAuditAlertRule();

  const [name, setName] = useState("");
  const [actions, setActions] = useState<AuditAction[]>(prefill?.actions ?? []);
  const [tableName, setTableName] = useState<string | undefined>(prefill?.tableName);
  const [targetUserId, setTargetUserId] = useState<string | undefined>(prefill?.userId);
  const [valueKey, setValueKey] = useState<string>(prefill?.valueKey ?? "");
  const [valueQuery, setValueQuery] = useState<string>(prefill?.valueQuery ?? "");
  const [recipientsMode, setRecipientsMode] = useState<RecipientsMode>("owner");
  const [recipientUserIds, setRecipientUserIds] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedConditions, setAdvancedConditions] = useState<AuditAdvancedCondition[]>([]);

  const reset = () => {
    setName("");
    setActions([]);
    setTableName(undefined);
    setTargetUserId(undefined);
    setValueKey("");
    setValueQuery("");
    setRecipientsMode("owner");
    setRecipientUserIds([]);
    setAdvancedConditions([]);
    setAdvancedOpen(false);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Dê um nome para a regra", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        organization_id: organizationId,
        name: trimmed,
        actions,
        table_names: tableName ? [tableName] : [],
        target_user_id: targetUserId ?? null,
        value_key: valueKey.trim() || null,
        value_query: valueQuery.trim() || null,
        recipients_mode: recipientsMode,
        recipient_user_ids: recipientsMode === "users" ? recipientUserIds : [],
        advanced_conditions: advancedConditions
          .map((c) => ({ ...c, key: c.key.trim(), value: c.value.trim() }))
          .filter((c) => c.key.length > 0),
      });
      toast({ title: "Regra criada", description: trimmed });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Erro ao criar regra",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const toggleAction = (a: AuditAction) =>
    setActions((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="audit-alert-rule-dialog">
        <DialogHeader>
          <DialogTitle>Nova regra de alerta</DialogTitle>
          <DialogDescription>
            Receba uma notificação quando um evento da auditoria casar com esses critérios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="alert-name">Nome</Label>
            <Input
              id="alert-name"
              data-testid="audit-alert-rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Deleções em service_orders"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ações</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                    data-testid="audit-alert-rule-actions"
                  >
                    {actions.length === 0 ? "Qualquer" : actions.join(", ")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {ALL_ACTIONS.map((a) => (
                    <DropdownMenuCheckboxItem
                      key={a}
                      checked={actions.includes(a)}
                      onCheckedChange={() => toggleAction(a)}
                    >
                      {a}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1.5">
              <Label>Tabela</Label>
              <Select
                value={tableName ?? SENTINEL_ANY}
                onValueChange={(v) => setTableName(v === SENTINEL_ANY ? undefined : v)}
              >
                <SelectTrigger data-testid="audit-alert-rule-table">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_ANY}>Qualquer</SelectItem>
                  {tables.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Usuário-alvo (opcional)</Label>
            <Select
              value={targetUserId ?? SENTINEL_ANY}
              onValueChange={(v) => setTargetUserId(v === SENTINEL_ANY ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SENTINEL_ANY}>Qualquer</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="alert-vk">Chave JSON (opcional)</Label>
              <Input
                id="alert-vk"
                value={valueKey}
                onChange={(e) => setValueKey(e.target.value)}
                placeholder="Ex.: status"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert-vq">Valor contém</Label>
              <Input
                id="alert-vq"
                value={valueQuery}
                onChange={(e) => setValueQuery(e.target.value)}
                placeholder="Ex.: aprovada"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Quem recebe a notificação</Label>
            <Select
              value={recipientsMode}
              onValueChange={(v) => setRecipientsMode(v as RecipientsMode)}
            >
              <SelectTrigger data-testid="audit-alert-rule-recipients-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Apenas eu (dono da regra)</SelectItem>
                <SelectItem value="organization">Toda a organização</SelectItem>
                <SelectItem value="users">Usuários específicos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientsMode === "users" && (
            <div className="space-y-1.5">
              <Label>Selecione os usuários</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start font-normal"
                    data-testid="audit-alert-rule-recipient-users"
                  >
                    {recipientUserIds.length === 0
                      ? "Nenhum selecionado"
                      : `${recipientUserIds.length} usuário(s)`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 overflow-y-auto">
                  {members.map((m) => (
                    <DropdownMenuCheckboxItem
                      key={m.user_id}
                      checked={recipientUserIds.includes(m.user_id)}
                      onCheckedChange={(checked) =>
                        setRecipientUserIds((prev) =>
                          checked
                            ? Array.from(new Set([...prev, m.user_id]))
                            : prev.filter((id) => id !== m.user_id),
                        )
                      }
                    >
                      {m.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-[11px] text-muted-foreground">
                Você sempre receberá suas próprias regras, mesmo que não esteja na lista.
              </p>
            </div>
          )}

          {(actions.length > 0 || tableName || targetUserId) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {actions.map((a) => (
                <Badge key={a} variant="secondary">
                  {a}
                </Badge>
              ))}
              {tableName && <Badge variant="outline">tabela: {tableName}</Badge>}
              {targetUserId && (
                <Badge variant="outline">
                  por: {members.find((m) => m.user_id === targetUserId)?.label ?? targetUserId}
                </Badge>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending}
            data-testid="audit-alert-rule-submit"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar regra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}