import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  Info,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getAssetSignedUrl, type Asset } from "../hooks/use-assets";

interface Props {
  asset: Asset | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenDetails: () => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

export function PreviewStage({ asset, index, total, onPrev, onNext, onOpenDetails }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<"fit" | "actual">("fit");

  useEffect(() => {
    if (!asset) {
      setUrl(null);
      return;
    }
    let active = true;
    setLoading(true);
    setUrl(null);
    setZoom("fit");
    getAssetSignedUrl(asset.file_path, 3600).then((u) => {
      if (active) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [asset]);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const handleDownload = () => {
    if (!url || !asset) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = asset.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!asset) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
        Nenhum asset selecionado
      </div>
    );
  }

  const isImage = (asset.mime_type ?? "").startsWith("image/");

  return (
    <div className="flex-1 flex flex-col bg-muted/10 relative min-w-0">
      {/* Top bar with metadata */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-3 pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 max-w-md pointer-events-auto shadow-md">
          <div className="font-semibold text-sm truncate" title={asset.name}>
            {asset.name}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="capitalize text-[10px]">
              {asset.asset_type}
            </Badge>
            {asset.version > 1 && (
              <Badge variant="outline" className="text-[10px]">
                v{asset.version}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">
              {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
              {formatBytes(asset.file_size)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 pointer-events-auto shadow-md">
          {isImage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((z) => (z === "fit" ? "actual" : "fit"))}
              title={zoom === "fit" ? "Tamanho real (100%)" : "Ajustar à tela"}
            >
              {zoom === "fit" ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!url} title="Copiar URL">
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!url} title="Download">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenDetails} title="Detalhes (Enter)">
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-12">
        {loading ? (
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        ) : !isImage ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <FileText className="w-16 h-16" />
            <span className="text-sm">Pré-visualização indisponível</span>
          </div>
        ) : url ? (
          <img
            src={url}
            alt={asset.name}
            className={
              zoom === "fit"
                ? "max-w-full max-h-full object-contain"
                : "max-w-none"
            }
            style={zoom === "actual" ? { width: "auto", height: "auto" } : undefined}
          />
        ) : (
          <div className="text-sm text-muted-foreground">Falha ao carregar</div>
        )}
      </div>

      {/* Nav arrows */}
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={total <= 1}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-background/90 backdrop-blur-sm shadow-md"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={total <= 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-background/90 backdrop-blur-sm shadow-md"
        aria-label="Próximo"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      {/* Counter */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs shadow-md">
        {index + 1} de {total}
      </div>
    </div>
  );
}