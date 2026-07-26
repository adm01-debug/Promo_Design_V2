import { useId } from "react";
import { ImageOff, Flag, FlagOff, Sparkles } from "lucide-react";

/** Uma URL só é aceita como âncora se for http(s) — espelha o trigger do banco. */
export function isValidFrameUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export interface FrameAnchorsPickerProps {
  startFrameUrl: string;
  endFrameUrl: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  /** Imagem do produto selecionado, usada no atalho "usar produto". */
  suggestedUrl?: string | null;
  className?: string;
}

interface FrameFieldProps {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  suggestedUrl?: string | null;
  icon: typeof Flag;
}

const FrameField = ({ label, hint, value, onChange, suggestedUrl, icon: Icon }: FrameFieldProps) => {
  const inputId = useId();
  const trimmed = value.trim();
  const invalid = trimmed.length > 0 && !isValidFrameUrl(trimmed);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Icon className="h-3 w-3 text-primary" aria-hidden="true" />
          {label}
        </label>
        <div className="flex items-center gap-2">
          {suggestedUrl && (
            <button
              type="button"
              onClick={() => onChange(suggestedUrl)}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" /> usar produto
            </button>
          )}
          {trimmed && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
            >
              <FlagOff className="h-3 w-3" aria-hidden="true" /> limpar
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 flex items-center justify-center">
          {trimmed && !invalid ? (
            <img src={trimmed} alt="" className="h-full w-full object-contain" loading="lazy" />
          ) : (
            <ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <input
          id={inputId}
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          aria-invalid={invalid}
          className={`w-full rounded-lg border bg-surface-2 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none ${
            invalid ? "border-destructive" : "border-border focus:border-primary"
          }`}
        />
      </div>
      <p className={`text-[10px] ${invalid ? "text-destructive" : "text-muted-foreground"}`}>
        {invalid ? "Informe uma URL http(s) válida." : hint}
      </p>
    </div>
  );
};

/**
 * Âncoras de primeiro/último frame. As URLs são apenas referências visuais
 * enviadas ao provedor — a validação aqui espelha a do banco para evitar
 * viagens de rede que falhariam no trigger.
 */
const FrameAnchorsPicker = ({
  startFrameUrl,
  endFrameUrl,
  onStartChange,
  onEndChange,
  suggestedUrl,
  className,
}: FrameAnchorsPickerProps) => (
  <div className={className}>
    <p className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
      Âncoras de Frame
    </p>
    <div className="space-y-3 rounded-xl border border-border bg-surface-2/40 p-3">
      <FrameField
        label="Primeiro frame"
        hint="Imagem que define como o vídeo começa."
        value={startFrameUrl}
        onChange={onStartChange}
        suggestedUrl={suggestedUrl}
        icon={Flag}
      />
      <FrameField
        label="Último frame"
        hint="Imagem que define como o vídeo termina."
        value={endFrameUrl}
        onChange={onEndChange}
        suggestedUrl={suggestedUrl}
        icon={Flag}
      />
    </div>
  </div>
);

export default FrameAnchorsPicker;
