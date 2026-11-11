import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ChevronDown, Check, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useBrandGuidelinesInferHistory,
  type InferHistoryRow,
  type InferDiffSection,
} from "../hooks/use-brand-guidelines-infer";

interface Props {
  clientId: string | null;
  onReview?: (row: InferHistoryRow) => void;
}

function sectionLabel(key: keyof InferHistoryRow["diff"]): string {
  switch (key) {
    case "primary_colors":
      return "Cores primárias";
    case "secondary_colors":
      return "Cores secundárias";
    case "fonts":
      return "Fontes";
    case "do_rules":
      return "Regras (do)";
    case "dont_rules":
      return "Regras (don't)";
  }
}

function totalDiffs(diff: InferHistoryRow["diff"]): {
  added: number;
  removed: number;
  kept: number;
} {
  const acc = { added: 0, removed: 0, kept: 0 };
  (Object.values(diff) as InferDiffSection[]).forEach((s) => {
    acc.added += s.added?.length ?? 0;
    acc.removed += s.removed?.length ?? 0;
    acc.kept += s.kept?.length ?? 0;
  });
  return acc;
}

function confidenceTone(c: number | null): string {
  if (c === null) return "bg-muted text-muted-foreground";
  if (c >= 0.75) return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  if (c >= 0.5) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

export function BrandGuidelinesInferHistoryPanel({ clientId, onReview }: Props) {
  const { data, isLoading, isError } = useBrandGuidelinesInferHistory(clientId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);

  if (!clientId) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Histórico de sugestões de IA</h3>
          <Badge variant="secondary" className="text-[10px]">
            {rows.length}
          </Badge>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Carregando histórico…
        </div>
      )}

      {isError && <p className="text-xs text-destructive">Falha ao carregar histórico.</p>}

      {!isLoading && rows.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-md">
          <Sparkles className="w-5 h-5 mx-auto mb-1.5 opacity-60" />
          Nenhuma sugestão gerada ainda para este cliente.
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row) => {
          const totals = totalDiffs(row.diff);
          const confPct = row.confidence !== null ? Math.round(row.confidence * 100) : null;
          const isOpen = expandedId === row.id;
          return (
            <Collapsible
              key={row.id}
              open={isOpen}
              onOpenChange={(o) => setExpandedId(o ? row.id : null)}
            >
              <div
                className={cn(
                  "rounded-md border transition-colors",
                  row.applied ? "border-primary/40 bg-primary/5" : "border-border",
                )}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">
                          {formatDistanceToNow(new Date(row.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {row.applied && (
                          <Badge className="h-4 px-1.5 gap-1 text-[10px] bg-primary/20 text-primary border-primary/30">
                            <Check className="w-2.5 h-2.5" /> Aplicada
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          amostra: <b>{row.sample_size}</b>
                        </span>
                        <span className="text-[10px] text-emerald-500">+{totals.added}</span>
                        <span className="text-[10px] text-destructive">−{totals.removed}</span>
                        <span className="text-[10px] text-muted-foreground">={totals.kept}</span>
                      </div>
                    </div>
                    {confPct !== null && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border font-mono",
                            confidenceTone(row.confidence),
                          )}
                          title="Confiança calculada a partir da cobertura da proposta e do tamanho da amostra"
                        >
                          {confPct}%
                        </span>
                      </div>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 pt-1 space-y-3">
                  {/* Meta */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <MetaItem label="Modelo" value={row.model ?? "—"} />
                    <MetaItem label="Assets usados" value={String(row.assets_used)} />
                    <MetaItem label="Sample size" value={String(row.sample_size)} />
                    <MetaItem label="Confiança" value={confPct !== null ? `${confPct}%` : "—"} />
                  </div>

                  {/* Confidence bar */}
                  {row.confidence !== null && (
                    <Progress value={(row.confidence ?? 0) * 100} className="h-1" />
                  )}

                  {/* Inputs */}
                  <div className="text-[11px] text-muted-foreground">
                    <b className="text-foreground">Inputs:</b>{" "}
                    <code className="text-[10px] bg-muted/50 px-1 py-0.5 rounded">
                      {JSON.stringify(row.inputs)}
                    </code>
                  </div>

                  {/* Diff por seção */}
                  <div className="space-y-1.5">
                    {(Object.keys(row.diff) as Array<keyof InferHistoryRow["diff"]>).map((key) => {
                      const s = row.diff[key];
                      const total =
                        (s.added?.length ?? 0) + (s.removed?.length ?? 0) + (s.kept?.length ?? 0);
                      if (total === 0) return null;
                      return (
                        <div key={key} className="text-[11px]">
                          <div className="font-medium mb-0.5">{sectionLabel(key)}</div>
                          <div className="flex flex-wrap gap-1">
                            {s.added.map((v) => (
                              <span
                                key={`a-${v}`}
                                className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              >
                                + {v}
                              </span>
                            ))}
                            {s.removed.map((v) => (
                              <span
                                key={`r-${v}`}
                                className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 line-through"
                              >
                                − {v}
                              </span>
                            ))}
                            {s.kept.map((v) => (
                              <span
                                key={`k-${v}`}
                                className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
                              >
                                = {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {onReview && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onReview(row)}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Revisar proposta
                      </Button>
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 px-2 py-1 bg-muted/30">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[11px] font-mono truncate" title={value}>
        {value}
      </div>
    </div>
  );
}
