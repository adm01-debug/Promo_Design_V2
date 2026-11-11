import { useState } from "react";
import { Check, Copy, RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GeneratedPromptPanelProps {
  /** Prompt derivado das seleções atuais. */
  generated: string;
  /** Override manual do usuário; `null` significa "usar o gerado". */
  override: string | null;
  onOverrideChange: (value: string | null) => void;
}

/** Mostra o prompt final montado, permitindo edição manual e reset. */
export function GeneratedPromptPanel({
  generated,
  override,
  onOverrideChange,
}: GeneratedPromptPanelProps) {
  const [copied, setCopied] = useState(false);
  const value = override ?? generated;
  const isEdited = override !== null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden />
          Prompt gerado
        </p>
        <div className="flex items-center gap-1">
          {isEdited && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[10px]"
              onClick={() => onOverrideChange(null)}
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Restaurar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={handleCopy}
            aria-label="Copiar prompt"
          >
            {copied ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <Copy className="h-3 w-3" aria-hidden />
            )}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onOverrideChange(e.target.value)}
        aria-label="Prompt final de geração de vídeo"
        className="h-32 w-full resize-none rounded-lg border border-border bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-foreground focus:border-primary focus:outline-none"
      />

      <p className="text-[10px] text-muted-foreground">
        {isEdited
          ? "Prompt editado manualmente — as seleções acima não o atualizam mais."
          : "Atualizado automaticamente conforme suas escolhas. Edite para assumir o controle."}
      </p>
    </div>
  );
}

export default GeneratedPromptPanel;
