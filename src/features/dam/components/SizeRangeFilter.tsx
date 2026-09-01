import { useEffect, useState } from "react";
import { z } from "zod";
import { HardDrive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import { type CustomSizeRange, type SizeUnit } from "../lib/dam-constants";
export { type CustomSizeRange };

const numberSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), { message: "Use apenas números" });

function unitToBytes(value: string, unit: SizeUnit): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const factor = unit === "KB" ? 1024 : 1024 * 1024;
  return Math.round(n * factor);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes % 1024 === 0 ? 0 : 1)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb % 1 === 0 ? 0 : 1)} MB`;
}

/** Builds a short label like "1–5 MB" / "≥ 500 KB" / "≤ 2 MB". */
export function formatCustomSizeLabel(range: CustomSizeRange | null): string {
  if (!range) return "";
  const { minBytes, maxBytes } = range;
  if (minBytes != null && maxBytes != null) return `${formatBytes(minBytes)} – ${formatBytes(maxBytes)}`;
  if (minBytes != null) return `≥ ${formatBytes(minBytes)}`;
  if (maxBytes != null) return `≤ ${formatBytes(maxBytes)}`;
  return "";
}

interface Props {
  /** Currently active custom range (null when not in custom mode). */
  value: CustomSizeRange | null;
  /** Called when the user applies a new custom range, or clears it (null). */
  onChange: (next: CustomSizeRange | null) => void;
  /** Optional className applied to the trigger button. */
  className?: string;
}

/**
 * Popover trigger that lets the user define an arbitrary file-size range using
 * KB or MB. Validates input client-side with zod, prevents min > max, and
 * exposes a single `CustomSizeRange` (in bytes) to the parent for query usage.
 */
export function SizeRangeFilter({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<SizeUnit>(value?.unit ?? "MB");
  const [minRaw, setMinRaw] = useState<string>(value?.minRaw ?? "");
  const [maxRaw, setMaxRaw] = useState<string>(value?.maxRaw ?? "");
  const [error, setError] = useState<string | null>(null);

  // Re-hydrate local state when popover opens or value changes externally.
  useEffect(() => {
    if (open) {
      setUnit(value?.unit ?? "MB");
      setMinRaw(value?.minRaw ?? "");
      setMaxRaw(value?.maxRaw ?? "");
      setError(null);
    }
  }, [open, value]);

  const apply = () => {
    const minParsed = numberSchema.safeParse(minRaw);
    const maxParsed = numberSchema.safeParse(maxRaw);
    if (!minParsed.success) {
      setError(minParsed.error.issues[0]?.message ?? "Valor mínimo inválido");
      return;
    }
    if (!maxParsed.success) {
      setError(maxParsed.error.issues[0]?.message ?? "Valor máximo inválido");
      return;
    }
    const minBytes = unitToBytes(minRaw, unit);
    const maxBytes = unitToBytes(maxRaw, unit);
    if (minBytes == null && maxBytes == null) {
      // Empty range: clear instead.
      onChange(null);
      setOpen(false);
      return;
    }
    if (minBytes != null && maxBytes != null && minBytes > maxBytes) {
      setError("O valor mínimo deve ser menor ou igual ao máximo.");
      return;
    }
    setError(null);
    onChange({ minBytes, maxBytes, unit, minRaw: minRaw.trim(), maxRaw: maxRaw.trim() });
    setOpen(false);
  };

  const clear = () => {
    setMinRaw("");
    setMaxRaw("");
    setError(null);
    onChange(null);
    setOpen(false);
  };

  const activeLabel = formatCustomSizeLabel(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value ? "default" : "outline"}
          size="sm"
          className={className}
          aria-label={value ? `Tamanho personalizado: ${activeLabel}` : "Definir tamanho personalizado"}
        >
          <HardDrive className="w-3.5 h-3.5 mr-1.5" />
          {value ? (
            <span className="flex items-center gap-1.5">
              <span className="text-xs">{activeLabel}</span>
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">custom</Badge>
            </span>
          ) : (
            <span className="text-xs">Personalizado…</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Tamanho do arquivo</h4>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={clear}
                aria-label="Limpar filtro de tamanho"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="size-min" className="text-xs text-muted-foreground">Mínimo</Label>
              <Input
                id="size-min"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={minRaw}
                onChange={(e) => setMinRaw(e.target.value)}
                className="h-9"
                aria-invalid={!!error}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="size-max" className="text-xs text-muted-foreground">Máximo</Label>
              <Input
                id="size-max"
                type="text"
                inputMode="decimal"
                placeholder="∞"
                value={maxRaw}
                onChange={(e) => setMaxRaw(e.target.value)}
                className="h-9"
                aria-invalid={!!error}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unidade</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as SizeUnit)}>
              <SelectTrigger className="h-9" aria-label="Unidade de medida">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KB">Kilobytes (KB)</SelectItem>
                <SelectItem value="MB">Megabytes (MB)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={apply}>
              Aplicar
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground leading-snug pt-1">
            Deixe um campo vazio para criar um limite aberto (ex.: somente máximo = "menor que").
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}