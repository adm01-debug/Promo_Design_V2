import { useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AuditAction } from "../hooks/use-audit-log";

export interface AuditFilterState {
  from?: Date;
  to?: Date;
  actions: AuditAction[];
  tableName?: string;
  userId?: string;
  recordIdQuery: string;
  valueKey: string;
  valueQuery: string;
  ipQuery: string;
  userAgentQuery: string;
}

interface MemberOpt {
  user_id: string;
  label: string;
}

interface Props {
  state: AuditFilterState;
  onChange: (s: AuditFilterState) => void;
  tables: string[];
  members: MemberOpt[];
}

const ALL_ACTIONS: AuditAction[] = ["INSERT", "UPDATE", "DELETE"];
const SENTINEL_ALL = "__all__";

export function AuditFilters({ state, onChange, tables, members }: Props) {
  const setPreset = (days: number | "today") => {
    const to = new Date();
    const from = new Date();
    if (days === "today") {
      from.setHours(0, 0, 0, 0);
    } else {
      from.setDate(from.getDate() - days);
    }
    onChange({ ...state, from, to });
  };

  const hasAny = useMemo(
    () =>
      !!state.from ||
      !!state.to ||
      state.actions.length > 0 ||
      !!state.tableName ||
      !!state.userId ||
      state.recordIdQuery.length > 0 ||
      state.valueKey.length > 0 ||
      state.valueQuery.length > 0 ||
      state.ipQuery.length > 0 ||
      state.userAgentQuery.length > 0,
    [state],
  );

  const toggleAction = (a: AuditAction) => {
    const next = state.actions.includes(a)
      ? state.actions.filter((x) => x !== a)
      : [...state.actions, a];
    onChange({ ...state, actions: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Period presets */}
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setPreset("today")}>Hoje</Button>
          <Button size="sm" variant="outline" onClick={() => setPreset(7)}>7d</Button>
          <Button size="sm" variant="outline" onClick={() => setPreset(30)}>30d</Button>
          <Button size="sm" variant="outline" onClick={() => setPreset(90)}>90d</Button>
        </div>

        {/* From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className={cn(!state.from && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />
              {state.from ? format(state.from, "dd/MM/yy") : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={state.from}
              onSelect={(d) => onChange({ ...state, from: d ?? undefined })}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className={cn(!state.to && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />
              {state.to ? format(state.to, "dd/MM/yy") : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={state.to}
              onSelect={(d) => onChange({ ...state, to: d ?? undefined })}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Actions multi-select */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Ação{state.actions.length > 0 ? ` (${state.actions.length})` : ""}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ALL_ACTIONS.map((a) => (
              <DropdownMenuCheckboxItem
                key={a}
                checked={state.actions.includes(a)}
                onCheckedChange={() => toggleAction(a)}
              >
                {a}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Table */}
        <Select
          value={state.tableName ?? SENTINEL_ALL}
          onValueChange={(v) => onChange({ ...state, tableName: v === SENTINEL_ALL ? undefined : v })}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Tabela" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL_ALL}>Todas as tabelas</SelectItem>
            {tables.map((t) => (
              <SelectItem key={t} value={t} className="font-mono text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User */}
        <Select
          value={state.userId ?? SENTINEL_ALL}
          onValueChange={(v) => onChange({ ...state, userId: v === SENTINEL_ALL ? undefined : v })}
        >
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL_ALL}>Todos os usuários</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id} className="font-mono text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Record ID search */}
        <Input
          placeholder="ID do registro (mín. 4)"
          value={state.recordIdQuery}
          onChange={(e) => onChange({ ...state, recordIdQuery: e.target.value })}
          className="h-9 w-[200px] font-mono text-xs"
        />

        {/* Value search inside old_values/new_values */}
        <Input
          placeholder="Chave (ex: status)"
          value={state.valueKey}
          onChange={(e) => onChange({ ...state, valueKey: e.target.value })}
          className="h-9 w-[160px] font-mono text-xs"
          aria-label="Chave dentro de old_values/new_values"
        />
        <Input
          placeholder="Valor contém…"
          value={state.valueQuery}
          onChange={(e) => onChange({ ...state, valueQuery: e.target.value })}
          className="h-9 w-[200px] font-mono text-xs"
          aria-label="Texto a procurar nos valores"
        />

        {/* IP address */}
        <Input
          placeholder="IP contém (ex: 192.168)"
          value={state.ipQuery}
          onChange={(e) => onChange({ ...state, ipQuery: e.target.value })}
          className="h-9 w-[180px] font-mono text-xs"
          aria-label="IP address contém"
        />

        {/* User agent */}
        <Input
          placeholder="User agent (ex: Chrome)"
          value={state.userAgentQuery}
          onChange={(e) => onChange({ ...state, userAgentQuery: e.target.value })}
          className="h-9 w-[200px] font-mono text-xs"
          aria-label="User agent contém"
        />

        {hasAny && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onChange({
                actions: [],
                recordIdQuery: "",
                from: undefined,
                to: undefined,
                tableName: undefined,
                userId: undefined,
                valueKey: "",
                valueQuery: "",
                ipQuery: "",
                userAgentQuery: "",
              })
            }
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Hint when only value text is provided without key */}
      {state.valueQuery.length > 0 && state.valueKey.trim().length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sem uma <span className="font-mono">chave</span>, o filtro de valor é aplicado localmente apenas na página atual.
          Informe uma chave (ex: <span className="font-mono">status</span>) para buscar em todo o histórico.
        </p>
      )}

      {/* Active chips */}
      {hasAny && (
        <div className="flex flex-wrap gap-1.5">
          {state.from && (
            <Chip label={`De: ${format(state.from, "dd/MM/yy")}`} onRemove={() => onChange({ ...state, from: undefined })} />
          )}
          {state.to && (
            <Chip label={`Até: ${format(state.to, "dd/MM/yy")}`} onRemove={() => onChange({ ...state, to: undefined })} />
          )}
          {state.actions.map((a) => (
            <Chip key={a} label={a} onRemove={() => toggleAction(a)} />
          ))}
          {state.tableName && (
            <Chip label={`Tabela: ${state.tableName}`} onRemove={() => onChange({ ...state, tableName: undefined })} />
          )}
          {state.userId && (
            <Chip
              label={`Usuário: ${members.find((m) => m.user_id === state.userId)?.label ?? state.userId.slice(0, 8)}`}
              onRemove={() => onChange({ ...state, userId: undefined })}
            />
          )}
          {state.recordIdQuery && (
            <Chip label={`ID: ${state.recordIdQuery}`} onRemove={() => onChange({ ...state, recordIdQuery: "" })} />
          )}
          {state.valueKey && (
            <Chip label={`Chave: ${state.valueKey}`} onRemove={() => onChange({ ...state, valueKey: "" })} />
          )}
          {state.valueQuery && (
            <Chip label={`Valor: ${state.valueQuery}`} onRemove={() => onChange({ ...state, valueQuery: "" })} />
          )}
          {state.ipQuery && (
            <Chip label={`IP: ${state.ipQuery}`} onRemove={() => onChange({ ...state, ipQuery: "" })} />
          )}
          {state.userAgentQuery && (
            <Chip label={`UA: ${state.userAgentQuery}`} onRemove={() => onChange({ ...state, userAgentQuery: "" })} />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <span>{label}</span>
      <button onClick={onRemove} className="rounded hover:bg-background/50 p-0.5" aria-label="Remover">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}