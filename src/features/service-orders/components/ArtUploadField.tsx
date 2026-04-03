import { useRef } from "react";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ArtUploadFieldProps {
  artFile: string;
  artFileDataUrl: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  uploading?: boolean;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ArtUploadField = ({ artFile, artFileDataUrl, onUpload, onRemove, uploading }: ArtUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Use uma arte de até 2MB.");
        return;
      }
      onUpload(f);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error("Arquivo muito grande. Use uma arte de até 2MB.");
        return;
      }
      onUpload(f);
    }
  };

  return (
    <div className="col-span-2">
      <Label className="text-xs text-muted-foreground mb-2 block">Arquivo da Arte</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.ai,.pdf,.svg,.eps,.cdr"
        className="hidden"
        onChange={handleFileChange}
      />
      {artFileDataUrl ? (
        <div className="relative rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start gap-4">
            <div className="w-32 h-32 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
              <img src={artFileDataUrl} alt="Arte" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{artFile}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Preview da arte carregada</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => inputRef.current?.click()}>
                  <Upload className="w-3 h-3" /> Trocar
                </Button>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive" onClick={onRemove}>
                  <X className="w-3 h-3" /> Remover
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : artFile ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
          <FileImage className="w-8 h-8 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{artFile}</p>
            <p className="text-[10px] text-muted-foreground">Arquivo sem preview (formato não-imagem)</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive" onClick={onRemove}>
            <X className="w-3 h-3" /> Remover
          </Button>
        </div>
      ) : uploading ? (
        <div className="rounded-lg border-2 border-dashed border-primary/50 bg-muted/20 p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Enviando arte para a nuvem...</p>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group"
        >
          <Upload className="w-8 h-8 text-muted-foreground/40 group-hover:text-primary/60 transition-colors mb-2" />
          <p className="text-sm text-muted-foreground">Arraste a arte ou clique para selecionar</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, SVG, AI, PDF, EPS — upload na nuvem ☁️</p>
        </div>
      )}
    </div>
  );
};

export default ArtUploadField;
