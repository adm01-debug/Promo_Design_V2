import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, MessageSquareDashed, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { type Asset, getAssetSignedUrl } from "../../hooks/use-assets";

export function VersionThumb({ asset }: { asset: Asset }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const path = asset.thumbnail_path ?? asset.file_path;
    if (!(asset.mime_type ?? "").startsWith("image/")) return;
    getAssetSignedUrl(path, 3600).then((u) => !cancelled && setUrl(u));
    return () => { cancelled = true; };
  }, [asset]);
  if (!url) return <div className="w-12 h-12 rounded bg-muted" />;
  return <img src={url} alt={asset.name} className="w-12 h-12 rounded object-cover bg-muted" />;
}

export function CopyVersionLinkButton({ asset }: { asset: Asset }) {
  const [copied, setCopied] = useState(false);

  const buildShareValue = () => {
    const identifier = `asset:${asset.id}@v${asset.version}`;
    if (typeof window === "undefined") return identifier;
    const url = new URL(window.location.href);
    url.searchParams.set("asset", asset.id);
    url.searchParams.set("v", String(asset.version));
    return url.toString();
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const value = buildShareValue();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Link da v${asset.version} copiado`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100"
            onClick={handleCopy}
            aria-label={`Copiar link da versão ${asset.version}`}
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="end">
          {copied ? "Copiado!" : `Copiar link da v${asset.version}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function VersionDescription({ description }: { description: string | null }) {
  const text = (description ?? "").trim();
  const hasText = text.length > 0;
  const Icon = hasText ? MessageSquare : MessageSquareDashed;
  const label = hasText ? text : "Sem comentário";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`mt-1 flex items-start gap-1.5 text-xs ${
              hasText ? "text-foreground/80" : "text-muted-foreground italic"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
            <span className="truncate">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs whitespace-pre-wrap">
          {hasText ? text : "Nenhuma descrição foi adicionada para esta versão."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VersionNodePreview({ asset, isCurrent }: { asset: Asset; isCurrent: boolean }) {
  const text = (asset.description ?? "").trim();
  const hasText = text.length > 0;
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-1.5 font-medium">
        <span>v{asset.version}</span>
        {isCurrent && <span className="text-[10px] uppercase tracking-wide opacity-80">atual</span>}
      </div>
      <div className="opacity-80">{formatDateTime(asset.created_at)}</div>
      <div className={hasText ? "whitespace-pre-wrap" : "italic opacity-70"}>
        {hasText ? text : "Sem comentário"}
      </div>
    </div>
  );
}
