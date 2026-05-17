import { Check, Download, FileText, Loader2, ChevronLeft, FileDown, PlusCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";


interface EditorTopBarProps {
  productName: string;
  allApproved: boolean;
  onExportPdf: () => void;
  onExportPng: () => void;
  onExportArt: () => void;
  onOpenServiceOrder: () => void;
  isExporting: boolean;
  isSaving?: boolean;
}

const EditorTopBar = ({ productName, allApproved, onExportPdf, onExportPng, onExportArt, onOpenServiceOrder, isExporting, isSaving }: EditorTopBarProps) => {

  const navigate = useNavigate();
  return (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0" role="banner">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => navigate(-1)} aria-label="Voltar para página anterior">
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> Voltar
        </Button>
        <div className="w-px h-5 bg-border" aria-hidden="true" />
        <h1 className="text-sm font-semibold text-foreground">Editor Multivistas</h1>
        <span className="text-xs text-muted-foreground font-mono" aria-label={`Produto: ${productName}`}>{productName}</span>
        {isSaving !== undefined && (
          <div className="flex items-center gap-1.5 ml-2">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Salvando...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-[10px] text-green-500 font-medium">Salvo na nuvem</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {allApproved && (
          <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-md flex items-center gap-1">
            <Check className="w-3 h-3" /> Todas as vistas aprovadas
          </span>
        )}
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 border-green-200 hover:bg-green-50 text-green-700" onClick={onOpenServiceOrder}>
          <PlusCircle className="w-3.5 h-3.5" /> CRIAR O.S.
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={onExportPdf}>
          <FileText className="w-3.5 h-3.5" /> PDF APROVAÇÃO
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={onExportArt}>
          <FileDown className="w-3.5 h-3.5" /> ARTE FINAL
        </Button>
        <Button size="sm" className="text-xs gap-1.5 h-8" onClick={onExportPng} disabled={isExporting}>
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG HD
        </Button>

      </div>
    </div>
  );
};

export default EditorTopBar;
