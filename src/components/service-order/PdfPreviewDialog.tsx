import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2 } from "lucide-react";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  fileName: string;
}

const PdfPreviewDialog = ({ open, onOpenChange, pdfBlob, fileName }: PdfPreviewDialogProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfUrl(null);
  }, [pdfBlob]);

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
          <DialogTitle className="text-sm font-display">Preview do PDF — {fileName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-0"
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
