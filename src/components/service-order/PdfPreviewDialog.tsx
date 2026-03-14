import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2, X } from "lucide-react";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  fileName: string;
}

const ZOOM_LEVELS = [50, 100, 150] as const;

const PdfPreviewDialog = ({ open, onOpenChange, pdfBlob, fileName }: PdfPreviewDialogProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<(typeof ZOOM_LEVELS)[number]>(100);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIframeLoading(true);
      return () => URL.revokeObjectURL(url);
    }
    setPdfUrl(null);
  }, [pdfBlob]);

  useEffect(() => {
    if (open) {
      setZoom(100);
      setIframeLoading(true);
    }
  }, [open]);

  const handleDownload = useCallback(() => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfBlob, fileName]);

  const handlePrint = useCallback(() => {
    if (!pdfUrl) return;
    const w = window.open(pdfUrl);
    if (w) w.onload = () => w.print();
  }, [pdfUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="text-sm font-display truncate">Preview do PDF — {fileName}</DialogTitle>
            <div className="flex items-center gap-1">
              {ZOOM_LEVELS.map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={zoom === level ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => { setZoom(level); setIframeLoading(true); }}
                >
                  {level}%
                </Button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Pressione <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">ESC</kbd> para fechar</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30 relative">
          {iframeLoading && pdfUrl && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Carregando PDF…</span>
              </div>
            </div>
          )}
          {pdfUrl ? (
            <iframe
              key={zoom}
              src={`${pdfUrl}#toolbar=0&navpanes=0&zoom=${zoom}`}
              className="w-full h-full border-0"
              title="PDF Preview"
              onLoad={() => setIframeLoading(false)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border shrink-0 flex-row gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" className="gap-2 mr-auto" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5" /> Fechar
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
          <Button size="sm" className="gap-2" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfPreviewDialog;
