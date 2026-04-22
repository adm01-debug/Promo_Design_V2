import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Check,
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
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
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

  const isImage = asset ? (asset.mime_type ?? "").startsWith("image/") : false;

  // Keyboard shortcuts: Z toggles zoom · C copy URL · D download
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        if (!isImage || !url) return;
        e.preventDefault();
        setZoom((z) => (z === "fit" ? "actual" : "fit"));
      } else if (k === "c") {
        if (!url) return;
        e.preventDefault();
        void handleCopy();
      } else if (k === "d") {
        if (!url) return;
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImage, url]);

  // After switching to actual, center scroll on container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (zoom === "fit") {
      el.scrollTo({ left: 0, top: 0 });
    }
  }, [zoom]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoom === "actual") {
      setZoom("fit");
      return;
    }
    // Compute click position ratio relative to displayed image
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    setZoom("actual");
    // After re-render, center scroll on the clicked point
    requestAnimationFrame(() => {
      const scroller = scrollRef.current;
      const newImg = imgRef.current;
      if (!scroller || !newImg) return;
      const targetX = rx * newImg.naturalWidth - scroller.clientWidth / 2;
      const targetY = ry * newImg.naturalHeight - scroller.clientHeight / 2;
      scroller.scrollTo({ left: Math.max(0, targetX), top: Math.max(0, targetY) });
    });
  };

  if (!asset) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
        Nenhum asset selecionado
      </div>
    );
  }

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
            <div className="flex items-center gap-0.5 mr-1" role="group" aria-label="Zoom">
              <Button
                variant={zoom === "fit" ? "default" : "ghost"}
                size="sm"
                onClick={() => setZoom("fit")}
                aria-pressed={zoom === "fit"}
                title="Ajustar à tela (Z)"
                className="h-8 px-2 text-xs gap-1"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Ajustar
              </Button>
              <Button
                variant={zoom === "actual" ? "default" : "ghost"}
                size="sm"
                onClick={() => setZoom("actual")}
                aria-pressed={zoom === "actual"}
                title="Tamanho real 100% (Z)"
                className="h-8 px-2 text-xs gap-1"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                100%
              </Button>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!url}
                aria-label="Copiar URL"
                className="h-8 px-2 text-xs gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
                <span className="sr-only" aria-live="polite">
                  {copied ? "URL copiada para a área de transferência" : ""}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Copiar URL <kbd className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">C</kbd>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={!url}
                aria-label="Baixar arquivo"
                className="h-8 px-2 text-xs gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Baixar arquivo <kbd className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">D</kbd>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenDetails}
                aria-label="Abrir detalhes do asset"
                className="h-8 px-2 text-xs gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                Detalhes
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Abrir detalhes <kbd className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">Enter</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Preview area */}
      <div ref={scrollRef} className="flex-1 overflow-auto flex items-center justify-center p-12">
        {loading ? (
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        ) : !isImage ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <FileText className="w-16 h-16" />
            <span className="text-sm">Pré-visualização indisponível</span>
          </div>
        ) : url ? (
          <img
            ref={imgRef}
            src={url}
            alt={asset.name}
            onClick={handleImageClick}
            className={
              zoom === "fit"
                ? "max-w-full max-h-full object-contain cursor-zoom-in"
                : "max-w-none cursor-zoom-out active:cursor-grabbing"
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