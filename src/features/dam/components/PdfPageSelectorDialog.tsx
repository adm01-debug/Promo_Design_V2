import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { rasterizePdfFirstPage } from "../lib/file-preview";
import { parsePagesString, formatPagesString, MAX_PDF_PAGES_PER_ASSET } from "../lib/pdf-pages";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  file: File;
  totalPages: number | null;
  initialPages: number[];
  onConfirm: (pages: number[]) => void;
}

/**
 * Modal for selecting one or more PDF pages to use as thumbnails.
 *
 * Shows a text field ("1, 3, 5-7") and a thumbnail grid kept in sync.
 * The first page in the resulting list is treated as the primary thumb;
 * additional pages create extra assets when the upload runs.
 */
export function PdfPageSelectorDialog({
  open,
  onOpenChange,
  file,
  totalPages,
  initialPages,
  onConfirm,
}: Props) {
  const [text, setText] = useState(formatPagesString(initialPages));
  const [selected, setSelected] = useState<number[]>(initialPages);
  const [textError, setTextError] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, string | null>>({});
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const cancelledRef = useRef(false);

  // Reset state every open
  useEffect(() => {
    if (!open) return;
    setText(formatPagesString(initialPages));
    setSelected(initialPages);
    setTextError(null);
  }, [open, initialPages]);

  // Lazy-render thumbnails for the page grid.
  useEffect(() => {
    if (!open || !totalPages) return;
    cancelledRef.current = false;
    setThumbs({});
    setThumbsLoading(true);
    let current = 1;
    const next: Record<number, string | null> = {};
    const renderNext = async () => {
      if (cancelledRef.current) return;
      if (current > totalPages) {
        setThumbsLoading(false);
        return;
      }
      const page = current++;
      try {
        const r = await rasterizePdfFirstPage(file, 140, "image/jpeg", 0.7, page);
        if (cancelledRef.current) return;
        next[page] = r?.url ?? null;
        setThumbs({ ...next });
      } catch {
        next[page] = null;
        setThumbs({ ...next });
      }
      // Yield so the UI updates between renders.
      setTimeout(renderNext, 0);
    };
    renderNext();
    return () => {
      cancelledRef.current = true;
      // Revoke object URLs created for the grid.
      Object.values(next).forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [open, file, totalPages]);

  const applyText = (raw: string) => {
    setText(raw);
    const parsed = parsePagesString(raw, totalPages ?? undefined);
    if (parsed.error) {
      setTextError(parsed.error);
      return;
    }
    setTextError(null);
    setSelected(parsed.pages);
  };

  const togglePage = (page: number) => {
    setSelected((prev) => {
      const has = prev.includes(page);
      let next: number[];
      if (has) {
        next = prev.filter((p) => p !== page);
      } else {
        if (prev.length >= MAX_PDF_PAGES_PER_ASSET) {
          toast.error(`Máximo de ${MAX_PDF_PAGES_PER_ASSET} páginas por PDF.`);
          return prev;
        }
        next = [...prev, page];
      }
      setText(formatPagesString(next));
      setTextError(null);
      return next;
    });
  };

  const handleConfirm = () => {
    if (textError) {
      toast.error(textError);
      return;
    }
    if (selected.length === 0) {
      toast.error("Selecione pelo menos 1 página.");
      return;
    }
    onConfirm(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar páginas — {file.name}</DialogTitle>
          <DialogDescription>
            A primeira página marcada será a thumb principal. As demais geram
            assets adicionais (uma cópia por página).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pages-input" className="text-xs">
              Páginas (ex.: 1, 3, 5-7)
            </Label>
            <Input
              id="pages-input"
              value={text}
              onChange={(e) => applyText(e.target.value)}
              placeholder="1, 3, 5-7"
              className={cn(textError && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={textError ? true : undefined}
              aria-describedby={textError ? "pages-input-err" : undefined}
            />
            {textError ? (
              <div id="pages-input-err" role="alert" className="text-[11px] text-destructive">
                {textError}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                {selected.length} página(s) selecionada(s)
                {totalPages ? ` · total ${totalPages}` : ""}
                {selected.length > 0 && (
                  <> · primária: pág. {selected[0]}</>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-md p-2 max-h-[50vh] overflow-y-auto">
            {!totalPages ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Lendo PDF…
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isSel = selected.includes(p);
                  const isPrimary = isSel && selected[0] === p;
                  const url = thumbs[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePage(p)}
                      className={cn(
                        "relative group border rounded-md overflow-hidden bg-muted aspect-[3/4] flex items-center justify-center text-xs",
                        isSel ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50",
                      )}
                      aria-pressed={isSel}
                      aria-label={`Página ${p}${isSel ? " (selecionada)" : ""}`}
                    >
                      {url ? (
                        <img src={url} alt={`Pág. ${p}`} className="w-full h-full object-contain" />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      )}
                      <span className="absolute bottom-0 left-0 right-0 bg-background/80 text-[10px] px-1 py-0.5 text-center tabular-nums">
                        {p}
                        {isPrimary && " ★"}
                      </span>
                      {isSel && (
                        <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {thumbsLoading && totalPages && (
              <div className="text-[11px] text-muted-foreground text-center pt-2">
                Renderizando previews…
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!!textError || selected.length === 0}>
            Confirmar ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}