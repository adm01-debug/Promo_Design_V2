import { Undo2, Redo2, Save, FileText, Download, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MockupTopBarProps {
  step: "product" | "area" | "canvas";
  setStep: (s: "product" | "area" | "canvas") => void;
  hasProduct: boolean;
  hasArea: boolean;
  historyIdx: number;
  historyLength: number;
  undo: () => void;
  redo: () => void;
  isSaving: boolean;
  draftId: string | null;
  onSave: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  isExporting: boolean;
}

const MockupTopBar = ({
  step, setStep, hasProduct, hasArea,
  historyIdx, historyLength, undo, redo,
  isSaving, draftId, onSave, onExportPdf, onExportPng, isExporting,
}: MockupTopBarProps) => (
  <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
    <div className="flex items-center gap-3">
      <h1 className="text-sm font-semibold text-foreground">Mockup Studio</h1>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {(["product", "area", "canvas"] as const).map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <ChevronDown className="w-3 h-3 rotate-[-90deg]" />}
            <button
              onClick={() => {
                if (s === "product") setStep(s);
                else if (s === "area" && hasProduct) setStep(s);
                else if (s === "canvas" && hasArea) setStep(s);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                step === s ? "bg-primary/20 text-primary font-medium" : "hover:text-foreground"
              }`}
            >
              {i + 1}. {s === "product" ? "Produto" : s === "area" ? "Área" : "Canvas"}
            </button>
          </span>
        ))}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {step === "canvas" && (
        <>
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8" onClick={undo} disabled={historyIdx <= 0}>
            <Undo2 className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8" onClick={redo} disabled={historyIdx >= historyLength - 1}>
            <Redo2 className="w-3 h-3" />
          </Button>
          <div className="w-px h-5 bg-border" />
        </>
      )}
      <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8" onClick={onSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {draftId ? "Atualizar" : "Salvar"}
      </Button>
      <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={onExportPdf}>
        <FileText className="w-3.5 h-3.5" /> PDF
      </Button>
      <Button size="sm" className="text-xs gap-1.5 h-8" onClick={onExportPng} disabled={isExporting}>
        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG HD
      </Button>
    </div>
  </div>
);

export default MockupTopBar;
