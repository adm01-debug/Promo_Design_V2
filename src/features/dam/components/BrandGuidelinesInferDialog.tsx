import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Wand2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeHex, isValidHex } from "../lib/color-contrast";
import type { InferredGuidelines } from "../hooks/use-brand-guidelines-infer";
import type { ColorEntry, FontEntry } from "../hooks/use-brand-guidelines";

export interface BrandGuidelinesInferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  proposal: InferredGuidelines | null;
  current: {
    primary_colors: ColorEntry[];
    secondary_colors: ColorEntry[];
    fonts: FontEntry[];
    do_rules: string[];
    dont_rules: string[];
  };
  assetsUsed?: number;
  onApply: (selected: InferredGuidelines) => void;
  onRegenerate?: () => void;
}

type SectionKey = "primary_colors" | "secondary_colors" | "fonts" | "do_rules" | "dont_rules";

function ColorSwatch({ hex, name }: { hex: string; name?: string }) {
  const valid = isValidHex(normalizeHex(hex));
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className={cn("w-6 h-6 rounded border border-border shrink-0", !valid && "bg-muted")}
        style={valid ? { backgroundColor: normalizeHex(hex) } : undefined}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {name && <div className="text-xs font-medium truncate">{name}</div>}
        <div className="text-[10px] font-mono uppercase text-muted-foreground">{hex}</div>
      </div>
    </div>
  );
}

export function BrandGuidelinesInferDialog({
  open,
  onOpenChange,
  loading,
  proposal,
  current,
  assetsUsed,
  onApply,
  onRegenerate,
}: BrandGuidelinesInferDialogProps) {
  // Track which items from the proposal are selected (by index per section).
  const [selection, setSelection] = useState<Record<SectionKey, boolean[]>>({
    primary_colors: [],
    secondary_colors: [],
    fonts: [],
    do_rules: [],
    dont_rules: [],
  });

  // Reset selection when a new proposal arrives — default: select all.
  useMemo(() => {
    if (!proposal) return;
    setSelection({
      primary_colors: proposal.primary_colors.map(() => true),
      secondary_colors: proposal.secondary_colors.map(() => true),
      fonts: proposal.fonts.map(() => true),
      do_rules: proposal.do_rules.map(() => true),
      dont_rules: proposal.dont_rules.map(() => true),
    });
  }, [proposal]);

  const toggle = (section: SectionKey, index: number) => {
    setSelection((prev) => {
      const next = { ...prev, [section]: [...prev[section]] };
      next[section][index] = !next[section][index];
      return next;
    });
  };

  const setAll = (section: SectionKey, value: boolean) => {
    setSelection((prev) => ({
      ...prev,
      [section]: prev[section].map(() => value),
    }));
  };

  const handleApply = () => {
    if (!proposal) return;
    const filtered: InferredGuidelines = {
      primary_colors: proposal.primary_colors.filter((_, i) => selection.primary_colors[i]),
      secondary_colors: proposal.secondary_colors.filter((_, i) => selection.secondary_colors[i]),
      fonts: proposal.fonts.filter((_, i) => selection.fonts[i]),
      do_rules: proposal.do_rules.filter((_, i) => selection.do_rules[i]),
      dont_rules: proposal.dont_rules.filter((_, i) => selection.dont_rules[i]),
    };
    onApply(filtered);
  };

  const totalSelected = Object.values(selection).reduce(
    (acc, arr) => acc + arr.filter(Boolean).length,
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Revisar proposta da IA
          </DialogTitle>
          <DialogDescription>
            Compare a sua identidade atual com a proposta gerada. Marque apenas os itens que deseja
            aplicar — os demais serão descartados.
            {typeof assetsUsed === "number" && assetsUsed > 0 && (
              <span className="ml-1 text-xs">
                (analisados <strong>{assetsUsed}</strong> asset{assetsUsed > 1 ? "s" : ""})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && !proposal && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-sm">Analisando assets do cliente com IA…</div>
            <div className="text-xs">Isso pode levar alguns segundos.</div>
          </div>
        )}

        {proposal && (
          <ScrollArea className="flex-1 pr-2 -mr-2">
            <div className="space-y-6">
              {/* Cores primárias */}
              <DiffSection
                title="Cores primárias"
                sectionKey="primary_colors"
                selection={selection}
                onToggle={toggle}
                onSelectAll={setAll}
                currentCount={current.primary_colors.length}
                proposalCount={proposal.primary_colors.length}
                currentRender={
                  <div className="grid grid-cols-2 gap-2">
                    {current.primary_colors.length === 0 && <Empty />}
                    {current.primary_colors.map((c, i) => (
                      <ColorSwatch key={i} hex={c.hex} name={c.name} />
                    ))}
                  </div>
                }
                proposalRender={
                  <div className="grid grid-cols-1 gap-2">
                    {proposal.primary_colors.map((c, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selection.primary_colors[i] ?? false}
                          onCheckedChange={() => toggle("primary_colors", i)}
                        />
                        <ColorSwatch hex={c.hex} name={c.name} />
                      </label>
                    ))}
                    {proposal.primary_colors.length === 0 && <Empty />}
                  </div>
                }
              />

              <Separator />

              {/* Cores secundárias */}
              <DiffSection
                title="Cores secundárias"
                sectionKey="secondary_colors"
                selection={selection}
                onToggle={toggle}
                onSelectAll={setAll}
                currentCount={current.secondary_colors.length}
                proposalCount={proposal.secondary_colors.length}
                currentRender={
                  <div className="grid grid-cols-2 gap-2">
                    {current.secondary_colors.length === 0 && <Empty />}
                    {current.secondary_colors.map((c, i) => (
                      <ColorSwatch key={i} hex={c.hex} name={c.name} />
                    ))}
                  </div>
                }
                proposalRender={
                  <div className="grid grid-cols-1 gap-2">
                    {proposal.secondary_colors.map((c, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selection.secondary_colors[i] ?? false}
                          onCheckedChange={() => toggle("secondary_colors", i)}
                        />
                        <ColorSwatch hex={c.hex} name={c.name} />
                      </label>
                    ))}
                    {proposal.secondary_colors.length === 0 && <Empty />}
                  </div>
                }
              />

              <Separator />

              {/* Fontes */}
              <DiffSection
                title="Fontes"
                sectionKey="fonts"
                selection={selection}
                onToggle={toggle}
                onSelectAll={setAll}
                currentCount={current.fonts.length}
                proposalCount={proposal.fonts.length}
                currentRender={
                  <ul className="space-y-1 text-xs">
                    {current.fonts.length === 0 && <Empty />}
                    {current.fonts.map((f, i) => (
                      <li key={i} className="flex flex-col">
                        <span className="text-sm" style={{ fontFamily: `"${f.name}", sans-serif` }}>
                          {f.name || "—"}
                        </span>
                        {f.usage && <span className="text-muted-foreground">{f.usage}</span>}
                      </li>
                    ))}
                  </ul>
                }
                proposalRender={
                  <div className="space-y-1">
                    {proposal.fonts.map((f, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selection.fonts[i] ?? false}
                          onCheckedChange={() => toggle("fonts", i)}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col text-xs">
                          <span
                            className="text-sm"
                            style={{ fontFamily: `"${f.name}", sans-serif` }}
                          >
                            {f.name}
                          </span>
                          {f.usage && <span className="text-muted-foreground">{f.usage}</span>}
                          {f.source && (
                            <span className="text-[10px] text-muted-foreground/80">{f.source}</span>
                          )}
                        </div>
                      </label>
                    ))}
                    {proposal.fonts.length === 0 && <Empty />}
                  </div>
                }
              />

              <Separator />

              {/* Do */}
              <DiffSection
                title="Regras ✓ Do"
                sectionKey="do_rules"
                selection={selection}
                onToggle={toggle}
                onSelectAll={setAll}
                currentCount={current.do_rules.length}
                proposalCount={proposal.do_rules.length}
                currentRender={<RuleList rules={current.do_rules} tone="success" />}
                proposalRender={
                  <div className="space-y-1">
                    {proposal.do_rules.map((r, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <Checkbox
                          checked={selection.do_rules[i] ?? false}
                          onCheckedChange={() => toggle("do_rules", i)}
                          className="mt-0.5"
                        />
                        <span className="text-success">✓ {r}</span>
                      </label>
                    ))}
                    {proposal.do_rules.length === 0 && <Empty />}
                  </div>
                }
              />

              <Separator />

              {/* Don't */}
              <DiffSection
                title="Regras ✗ Don't"
                sectionKey="dont_rules"
                selection={selection}
                onToggle={toggle}
                onSelectAll={setAll}
                currentCount={current.dont_rules.length}
                proposalCount={proposal.dont_rules.length}
                currentRender={<RuleList rules={current.dont_rules} tone="destructive" />}
                proposalRender={
                  <div className="space-y-1">
                    {proposal.dont_rules.map((r, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <Checkbox
                          checked={selection.dont_rules[i] ?? false}
                          onCheckedChange={() => toggle("dont_rules", i)}
                          className="mt-0.5"
                        />
                        <span className="text-destructive">✗ {r}</span>
                      </label>
                    ))}
                    {proposal.dont_rules.length === 0 && <Empty />}
                  </div>
                }
              />
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 flex-row sm:justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {proposal && (
              <>
                <strong>{totalSelected}</strong> item{totalSelected === 1 ? "" : "s"} selecionado
                {totalSelected === 1 ? "" : "s"} para aplicar
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            {onRegenerate && (
              <Button variant="outline" onClick={onRegenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Gerar novamente
              </Button>
            )}
            <Button onClick={handleApply} disabled={!proposal || totalSelected === 0 || loading}>
              Aplicar seleção
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffSection({
  title,
  sectionKey,
  selection,
  onSelectAll,
  currentCount,
  proposalCount,
  currentRender,
  proposalRender,
}: {
  title: string;
  sectionKey: SectionKey;
  selection: Record<SectionKey, boolean[]>;
  onToggle: (section: SectionKey, index: number) => void;
  onSelectAll: (section: SectionKey, value: boolean) => void;
  currentCount: number;
  proposalCount: number;
  currentRender: React.ReactNode;
  proposalRender: React.ReactNode;
}) {
  const selectedCount = selection[sectionKey].filter(Boolean).length;
  const allSelected = selectedCount === proposalCount && proposalCount > 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{title}</h4>
          <Badge variant="secondary" className="text-[10px]">
            {selectedCount}/{proposalCount}
          </Badge>
        </div>
        {proposalCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px]"
            onClick={() => onSelectAll(sectionKey, !allSelected)}
          >
            {allSelected ? "Desmarcar todos" : "Marcar todos"}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-md border border-border/60 bg-muted/20 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
            Atual ({currentCount})
          </div>
          {currentRender}
        </div>
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-primary mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Proposta ({proposalCount})
          </div>
          {proposalRender}
        </div>
      </div>
    </div>
  );
}

function RuleList({ rules, tone }: { rules: string[]; tone: "success" | "destructive" }) {
  if (rules.length === 0) return <Empty />;
  return (
    <ul className="space-y-0.5 text-xs">
      {rules.map((r, i) => (
        <li key={i} className={tone === "success" ? "text-success" : "text-destructive"}>
          {tone === "success" ? "✓" : "✗"} {r}
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return <div className="text-[11px] text-muted-foreground italic">Nada cadastrado.</div>;
}
