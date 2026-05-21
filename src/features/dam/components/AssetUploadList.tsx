import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileImage, FileType, Loader2, X, Layers } from "lucide-react";
import type { FileEntry } from "../hooks/use-asset-upload-entries";
import { formatPagesString } from "../lib/pdf-pages";

interface Props {
  entries: FileEntry[];
  isUploading: boolean;
  onRemove: (id: string) => void;
  onChangePdfPage: (id: string, page: number) => void;
  onOpenPdfSelector: (id: string) => void;
  onResetAllPdfs: () => void;
}

export function AssetUploadList({
  entries,
  isUploading,
  onRemove,
  onChangePdfPage,
  onOpenPdfSelector,
  onResetAllPdfs,
}: Props) {
  if (entries.length === 0) return null;

  const eligiblePdfs = entries.filter(
    (e) => e.kind === "pdf" && e.status !== "done" && e.status !== "uploading",
  );
  const needsReset = eligiblePdfs.filter((e) => (e.pdfPage ?? 1) !== 1).length;

  return (
    <div className="space-y-4">
      {eligiblePdfs.length >= 2 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] text-muted-foreground">
            {eligiblePdfs.length} PDFs no lote
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onResetAllPdfs}
            disabled={needsReset === 0}
            title={
              needsReset === 0
                ? "Todos os PDFs já usam a página 1"
                : `Usar página 1 em ${needsReset} PDF(s)`
            }
          >
            Usar página 1 em todos
          </Button>
        </div>
      )}
      <ul className="space-y-2 max-h-56 overflow-y-auto">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
            {e.preview ? (
              <img src={e.preview} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
            ) : e.previewLoading ? (
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              </div>
            ) : e.kind === "ai" || e.kind === "psd" ? (
              <div className="w-10 h-10 rounded bg-muted flex flex-col items-center justify-center">
                <FileType className="w-4 h-4 text-muted-foreground" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">
                  {e.kind}
                </span>
              </div>
            ) : (
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                <FileImage className="w-5 h-5 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-sm truncate flex items-center gap-2">
                {e.file.name}
                {e.status === "done" && (
                  <Badge variant="secondary" className="text-[10px]">
                    ok
                  </Badge>
                )}
                {e.status === "error" && (
                  <Badge variant="destructive" className="text-[10px]">
                    erro
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {(e.file.size / 1024).toFixed(1)} KB
              </div>

              {e.kind === "pdf" && e.status !== "done" && e.status !== "uploading" && (
                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Label htmlFor={`pdf-page-${e.id}`} className="m-0 text-[11px]">
                      Thumb:
                    </Label>
                    <Input
                      id={`pdf-page-${e.id}`}
                      type="number"
                      min={1}
                      max={e.pdfPageCount || 9999}
                      value={e.pdfPage || ""}
                      onChange={(evt) => onChangePdfPage(e.id, parseInt(evt.target.value))}
                      className="h-5 w-12 text-[10px] px-1"
                    />
                    {e.pdfPageCount && <span>de {e.pdfPageCount}</span>}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-primary"
                      onClick={() => onOpenPdfSelector(e.id)}
                    >
                      <Layers className="w-3 h-3 mr-1" />
                      {e.pdfPages && e.pdfPages.length > 1
                        ? `${e.pdfPages.length} selecionadas`
                        : "Selecionar..."}
                    </Button>
                  </div>
                  {e.pdfPages && e.pdfPages.length > 1 && (
                    <div className="text-[9px] text-muted-foreground truncate italic">
                      Páginas: {formatPagesString(e.pdfPages)}
                    </div>
                  )}
                  {e.pdfPageError && (
                    <div className="text-[9px] text-destructive">{e.pdfPageError}</div>
                  )}
                </div>
              )}
            </div>

            {e.status !== "uploading" && e.status !== "done" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(e.id)}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
