import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2, ZoomIn, ZoomOut } from "lucide-react";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  fileName: string;
}

const ZOOM_LEVELS = [50, 75, 100, 150, 200];

const PdfPreviewDialog = ({ open, onOpenChange, pdfBlob, fileName }: PdfPreviewDialogProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2); // default 100%

  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfUrl(null);
  }, [pdfBlob]);

  useEffect(() => {
    if (open) setZoomIndex(2);
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
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-display">Preview do PDF — {fileName}</DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-mono text-muted-foreground w-10 text-center select-none">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30 overflow-auto">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              className="border-0 origin-top-left"
              style={{
                width: `${(100 / zoom) * 100}%`,
                height: `${(100 / zoom) * 100}%`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left",
              }}
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border shrink-0 flex-row gap-2 sm:gap-2">
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
