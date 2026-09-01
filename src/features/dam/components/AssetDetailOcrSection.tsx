import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScanText, Loader2, Eraser } from "lucide-react";

interface Props {
  ocrText: string | null;
  ocrStatus: string;
  ocrLoading: boolean;
  ocrOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ocrClearing: boolean;
  onRun: () => void;
  onClear: () => void;
  canEdit: boolean;
  searchQuery?: string;
  ocrMatch?: boolean;
}

export function AssetDetailOcrSection({
  ocrText, ocrStatus, ocrLoading, ocrOpen, onOpenChange, ocrClearing, onRun, onClear, canEdit, searchQuery, ocrMatch
}: Props) {
  const ocrButtonLabel =
    ocrLoading || ocrStatus === "pending"
      ? "Processando…"
      : ocrStatus === "done" || ocrStatus === "failed"
        ? "Reprocessar OCR"
        : "Extrair texto (OCR)";

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanText className="w-4 h-4" />
          Texto na imagem (OCR)
          <Badge
            variant={
              ocrStatus === "done"
                ? "default"
                : ocrStatus === "failed"
                  ? "destructive"
                  : "secondary"
            }
            className="text-[10px] capitalize"
          >
            {ocrStatus === "none" ? "não extraído" : ocrStatus}
          </Badge>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            {(ocrText || ocrStatus !== "none") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                disabled={ocrClearing || ocrLoading || ocrStatus === "pending"}
                title="Limpar OCR (texto e status)"
                aria-label="Limpar OCR"
              >
                {ocrClearing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eraser className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onRun}
              disabled={ocrLoading || ocrStatus === "pending" || ocrClearing}
            >
              {ocrLoading || ocrStatus === "pending" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ScanText className="w-4 h-4 mr-2" />
              )}
              {ocrButtonLabel}
            </Button>
          </div>
        )}
      </div>
      {ocrText && ocrText.trim().length > 0 ? (
        <>
          {ocrMatch && (searchQuery ?? "").trim().length >= 2 && (
            <OcrSnippet text={ocrText} query={(searchQuery ?? "").trim()} />
          )}
          <Collapsible open={ocrOpen} onOpenChange={onOpenChange}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                {ocrOpen ? "Ocultar" : "Mostrar"} texto extraído ({ocrText.length} caracteres)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <HighlightedPre
                text={ocrText}
                query={(searchQuery ?? "").trim()}
              />
            </CollapsibleContent>
          </Collapsible>
        </>
      ) : ocrStatus === "done" ? (
        <p className="text-xs text-muted-foreground">Nenhum texto detectado.</p>
      ) : ocrStatus === "skipped" ? (
        <p className="text-xs text-muted-foreground">Tipo de arquivo não suportado.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Extraia o texto desta imagem para encontrá-la pela busca.
        </p>
      )}
    </div>
  );
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightTokens(text: string, query: string): JSX.Element[] {
  const tokens = Array.from(
    new Set(
      query
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2),
    ),
  );
  if (tokens.length === 0) return [<span key="all">{text}</span>];
  const re = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function OcrSnippet({ text, query }: { text: string; query: string }) {
  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2);
  const lower = text.toLowerCase();
  let idx = -1;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i !== -1) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return null;
  const radius = 80;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + radius);
  const snippet =
    (start > 0 ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
  return (
    <div className="rounded bg-primary/5 border border-primary/20 p-2 text-xs leading-relaxed">
      <div className="text-[10px] uppercase tracking-wide text-primary/80 mb-1">
        Trecho com correspondência
      </div>
      <div className="whitespace-pre-wrap break-words">
        {highlightTokens(snippet, query)}
      </div>
    </div>
  );
}

export function HighlightedPre({ text, query }: { text: string; query: string }) {
  const hasQuery = query.split(/\s+/).some((t) => t.trim().length >= 2);
  return (
    <pre className="text-xs whitespace-pre-wrap bg-muted rounded p-2 max-h-40 overflow-y-auto font-mono">
      {hasQuery ? highlightTokens(text, query) : text}
    </pre>
  );
}
