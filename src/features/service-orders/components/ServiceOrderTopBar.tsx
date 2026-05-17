import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle2, Copy, Eye, Download, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { STATUS_CONFIG, type OsStatus } from "@/features/service-orders";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ServiceOrderTopBarProps {
  osNumber: string;
  editId: string | null;
  currentStatus: OsStatus;
  setCurrentStatus: (s: OsStatus) => void;
  saved: boolean;
  setSaved: (s: boolean) => void;
  onSave: () => void;
  onPreviewPdf: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onDownloadFinalArt?: () => void;
}

const ServiceOrderTopBar = ({
  osNumber, editId, currentStatus, setCurrentStatus,
  saved, setSaved, onSave, onPreviewPdf, onPrint, onDownloadPdf, onDownloadFinalArt,
}: ServiceOrderTopBarProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyOs = () => {
    navigator.clipboard.writeText(osNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Número da OS copiado!");
  };

  return (
    <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-base font-display font-bold text-foreground">Ordem de Serviço</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{osNumber}</span>
            <button onClick={handleCopyOs} className="hover:text-primary transition-colors">
              {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {editId && (
          <Select value={currentStatus} onValueChange={(v) => { setCurrentStatus(v as OsStatus); setSaved(false); }}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_CONFIG) as [OsStatus, { label: string }][]).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={onSave} disabled={saved}>
          <CheckCircle2 className="w-3.5 h-3.5" /> {saved ? "Salvo" : "Salvar"}
        </Button>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={onPreviewPdf}>
          <Eye className="w-3.5 h-3.5" /> Preview
        </Button>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={onPrint}>
          <Printer className="w-3.5 h-3.5" /> Imprimir
        </Button>
        <Button size="sm" className="gap-2 text-xs" onClick={onDownloadPdf}>
          <Download className="w-3.5 h-3.5" /> Preview + Baixar
        </Button>
      </div>
    </div>
  );
};

export default ServiceOrderTopBar;
