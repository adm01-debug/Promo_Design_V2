import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOTION_PRESETS,
  MOTION_PRESET_GROUP_LABELS,
  groupMotionPresets,
  type MotionPreset,
} from "@/features/video/lib/motion-presets";

export interface MotionPresetPickerProps {
  /** Ids selecionados. */
  value: readonly string[];
  onChange: (ids: string[]) => void;
  /** Limite de presets simultâneos (evita prompts contraditórios). */
  maxSelected?: number;
  className?: string;
}

function matches(preset: MotionPreset, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    preset.label.toLowerCase().includes(q) ||
    preset.description.toLowerCase().includes(q) ||
    preset.promptFragment.toLowerCase().includes(q)
  );
}

/** Catálogo de movimentos cinematográficos com busca e seleção múltipla. */
export function MotionPresetPicker({
  value,
  onChange,
  maxSelected = 4,
  className,
}: MotionPresetPickerProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () => groupMotionPresets(MOTION_PRESETS.filter((p) => matches(p, query))),
    [query],
  );

  const selected = new Set(value);
  const atLimit = selected.size >= maxSelected;

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (atLimit) return;
    onChange([...value, id]);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Movimentos
        </p>
        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
          {selected.size}/{maxSelected}
        </span>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar movimento, lente ou ambiente..."
          aria-label="Buscar movimento cinematográfico"
          className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" aria-hidden />
          Limpar seleção
        </button>
      )}

      <div className="max-h-[320px] space-y-4 overflow-y-auto pr-1">
        {groups.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nenhum movimento encontrado.
          </p>
        )}
        {groups.map(({ group, presets }) => (
          <div key={group}>
            <p className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {MOTION_PRESET_GROUP_LABELS[group]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => {
                const isSelected = selected.has(preset.id);
                const disabled = !isSelected && atLimit;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => toggle(preset.id)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    title={preset.description}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border-2 p-2 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <preset.icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-foreground">
                        {preset.label}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {preset.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MotionPresetPicker;
