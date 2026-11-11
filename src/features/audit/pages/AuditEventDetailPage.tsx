import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  ScrollText,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useOrganizations, useOrgMembers } from "@/hooks/use-organization";
import {
  type AuditAction,
  useAuditEvent,
  useAuditRecordHistory,
} from "../hooks/use-audit-log";
import { AuditDiffView } from "../components/AuditDiffView";
import { cn } from "@/lib/utils";

const ACTION_VARIANT: Record<AuditAction, "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

function MetaRow({
  label,
  value,
  copyable,
  mono,
  truncate,
}: {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
  mono?: boolean;
  truncate?: boolean;
}) {
  const { toast } = useToast();
  const display = value ?? "—";
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copiado", description: value });
    } catch {
      /* noop */
    }
  };
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {truncate && value ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-sm truncate", mono && "font-mono text-xs")}>{display}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md break-all">{value}</TooltipContent>
          </Tooltip>
        ) : (
          <span className={cn("text-sm break-all", mono && "font-mono text-xs")}>{display}</span>
        )}
        {copyable && value && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            aria-label={`Copiar ${label}`}
            onClick={copy}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(value ?? null, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      toast({ title: "JSON copiado", description: title });
    } catch {
      /* noop */
    }
  };
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 px-2">
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
            <span className="text-xs font-medium">{title}</span>
          </Button>
        </CollapsibleTrigger>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 ml-auto"
          onClick={copy}
          aria-label={`Copiar JSON ${title}`}
        >
          <Copy className="h-3 w-3" />
          <span className="text-xs">Copiar</span>
        </Button>
      </div>
      <CollapsibleContent>
        <pre className="mt-2 max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap break-all">
          {json}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

const AuditEventDetailPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [onlyChanged, setOnlyChanged] = useState(false);

  const { data: event, isLoading, isError, error } = useAuditEvent(eventId);
  const { currentOrgId } = useOrganizations();
  const { members } = useOrgMembers(currentOrgId);
  const { data: history = [] } = useAuditRecordHistory(event?.table_name, event?.record_id);

  const userLabel = useMemo(() => {
    if (!event) return "";
    const m = members.find((mb) => mb.user_id === event.user_id);
    return m ? `${m.user_id.slice(0, 8)}… (${m.role})` : (event.user_id ?? "").slice(0, 8) + "…";
  }, [members, event]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/audit");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-xl font-semibold">Evento não encontrado</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {(error as Error | undefined)?.message ??
                  "O evento não existe ou você não tem permissão para visualizá-lo."}
              </p>
            </div>
            <Button asChild>
              <Link to="/audit">
                <ArrowLeft className="h-4 w-4" />
                Voltar para auditoria
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={goBack} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              <ScrollText className="h-6 w-6" />
              <span>Evento de auditoria</span>
              <Badge variant={ACTION_VARIANT[event.action]} role="status">
                {event.action}
              </Badge>
              <span className="font-mono text-base text-muted-foreground">{event.table_name}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(event.created_at), "dd/MM/yyyy HH:mm:ss")}{" "}
              <span className="ml-2">
                ({formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })})
              </span>
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Metadados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetaRow label="ID do evento" value={event.id} mono copyable />
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Record ID
            </span>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-mono text-xs break-all">{event.record_id ?? "—"}</span>
              {event.record_id && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    aria-label="Copiar record id"
                    onClick={() => navigator.clipboard.writeText(event.record_id!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-7 px-2">
                    <Link to={`/audit?q=${event.record_id}`}>
                      <ExternalLink className="h-3 w-3" />
                      Ver outros eventos
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <MetaRow label="Tabela" value={event.table_name} mono />
          <MetaRow label="Usuário" value={`${userLabel} — ${event.user_id}`} mono truncate />
          <MetaRow label="Organização" value={event.organization_id} mono copyable />
          <MetaRow label="IP address" value={event.ip_address} mono />
          <MetaRow label="User agent" value={event.user_agent} truncate />
          <MetaRow
            label="Data/hora (ISO)"
            value={new Date(event.created_at).toISOString()}
            mono
            copyable
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Diff visual</CardTitle>
          {event.action === "UPDATE" && (
            <div className="flex items-center gap-2">
              <Switch
                id="only-changed"
                checked={onlyChanged}
                onCheckedChange={setOnlyChanged}
              />
              <Label htmlFor="only-changed" className="text-xs cursor-pointer">
                Apenas campos alterados
              </Label>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <AuditDiffView
            oldValues={event.old_values}
            newValues={event.new_values}
            action={event.action}
            showOnlyChanged={onlyChanged}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">JSON cru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <JsonBlock title="old_values" value={event.old_values} />
          <JsonBlock title="new_values" value={event.new_values} />
        </CardContent>
      </Card>

      {event.record_id && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Histórico do registro{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({history.length} eventos)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum outro evento.</p>
            ) : (
              <ul className="divide-y">
                {history.map((h) => {
                  const isCurrent = h.id === event.id;
                  return (
                    <li key={h.id}>
                      <Link
                        to={`/audit/event/${h.id}`}
                        className={cn(
                          "flex items-center gap-3 py-2 px-2 -mx-2 rounded hover:bg-accent transition-colors",
                          isCurrent && "bg-accent/50 pointer-events-none",
                        )}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        <Badge
                          variant={ACTION_VARIANT[h.action]}
                          className="shrink-0"
                        >
                          {h.action}
                        </Badge>
                        <span className="text-sm tabular-nums">
                          {format(new Date(h.created_at), "dd/MM/yy HH:mm:ss")}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {(h.user_id ?? "").slice(0, 8)}…
                        </span>
                        {isCurrent && (
                          <span className="text-xs ml-auto text-primary font-medium">atual</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AuditEventDetailPage;