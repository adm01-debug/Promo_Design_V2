import { Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/features/clients/hooks/use-clients";

export interface ClientSelectorProps {
  organizationId: string | null;
  value: string | null;
  onChange: (clientId: string | null) => void;
  className?: string;
}

const NONE_VALUE = "__none__";

/**
 * Seletor compacto de cliente para o editor de mockup.
 * Alimenta a recomendação de padrões de design por cliente
 * (com fallback automático para a organização quando vazio).
 */
export function ClientSelector({
  organizationId,
  value,
  onChange,
  className,
}: ClientSelectorProps) {
  const { clients, isLoading } = useClients(organizationId);

  return (
    <div className={className}>
      <label
        htmlFor="mockup-editor-client-selector"
        className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"
      >
        <Users className="h-3 w-3" aria-hidden="true" />
        Cliente
      </label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
        disabled={!organizationId || isLoading}
      >
        <SelectTrigger
          id="mockup-editor-client-selector"
          className="h-8 text-xs"
          aria-label="Selecionar cliente para recomendações"
        >
          <SelectValue placeholder={isLoading ? "Carregando…" : "Sem cliente"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE} className="text-xs">
            Sem cliente (usar padrão da organização)
          </SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground/70 mt-1">
        Determina qual padrão histórico é recomendado.
      </p>
    </div>
  );
}
