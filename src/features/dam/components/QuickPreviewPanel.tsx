import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Download, ExternalLink, Pin, PinOff, Sparkles, ImageIcon, Loader2, GitCompare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { AssetThumbnail } from "./AssetThumbnail";
import { getAssetSignedUrl, useLatestAssetVersion, type Asset } from "../hooks/use-assets";
import type { Client } from "@/features/clients/hooks/use-clients";
import { QuickVersionCompareDialog } from "./QuickVersionCompareDialog";

interface QuickPreviewPanelProps {
  asset: Asset | null;
  pinned: boolean;
  onTogglePin: () => void;
  onOpenDetails: () => void;
  clients: Client[];
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function PanelBody({ asset, pinned, onTogglePin, onOpenDetails, clients }: QuickPreviewPanelProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const latestQuery = useLatestAssetVersion(asset?.id ?? null);
  const hasUpdate = Boolean(latestQuery.data?.hasUpdate);
  const versionLoading = latestQuery.isLoading || latestQuery.isFetching;
  const latestVersionNum = latestQuery.data?.latest?.version ?? asset?.version ?? 1;
  const canCompare = !!asset && latestVersionNum > 1;

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!asset) {
      setUrlLoading(false);
      return;
    }
    setUrlLoading(true);
    getAssetSignedUrl(asset.file_path, 3600)
      .then((u) => {
        if (active) setUrl(u);
      })
      .finally(() => {
        if (active) setUrlLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asset]);

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground gap-2">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <ImageIcon className="w-7 h-7" />
        </div>
        <p className="text-sm font-medium">Prévia rápida</p>
        <p className="text-xs max-w-[220px]">
          Passe o mouse sobre um asset ou clique para fixar e ver os detalhes aqui.
        </p>
      </div>
    );
  }

  const clientName = asset.client_id ? clients.find((c) => c.id === asset.client_id)?.name : null;
  const isImage = (asset.mime_type ?? "").startsWith("image/");
  const visibleTags = asset.tags.slice(0, 6);
  const moreTags = asset.tags.length - visibleTags.length;

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado", description: "URL temporária válida por 1 hora." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = asset.name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="capitalize">{asset.asset_type}</Badge>
            {asset.version > 1 && <Badge variant="outline">v{asset.version}</Badge>}
            {versionLoading && (
              <Badge variant="outline" className="gap-1 text-muted-foreground" aria-label="Verificando versão">
                <Loader2 className="w-3 h-3 animate-spin" />
                Verificando…
              </Badge>
            )}
            {!versionLoading && hasUpdate && (
              <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15 border-primary/30">
                <Sparkles className="w-3 h-3" /> Nova versão
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm mt-1.5 truncate" title={asset.name}>
            {asset.name}
          </h3>
        </div>
        <Button
          variant={pinned ? "default" : "outline"}
          size="icon"
          onClick={onTogglePin}
          aria-label={pinned ? "Desafixar" : "Fixar"}
          title={pinned ? "Desafixar" : "Fixar"}
          className="h-8 w-8 shrink-0"
        >
          {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="rounded-md overflow-hidden border bg-muted aspect-square relative">
        {urlLoading && !url && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        <AssetThumbnail asset={asset} className="w-full h-full" />
      </div>

      <Separator />

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Cliente</dt>
        <dd className="text-right truncate">{clientName ?? "—"}</dd>
        <dt className="text-muted-foreground">Tamanho</dt>
        <dd className="text-right">{formatBytes(asset.file_size)}</dd>
        {isImage && (
          <>
            <dt className="text-muted-foreground">Dimensões</dt>
            <dd className="text-right">
              {asset.width && asset.height ? `${asset.width}×${asset.height}` : "—"}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Tipo MIME</dt>
        <dd className="text-right truncate" title={asset.mime_type ?? ""}>
          {asset.mime_type ?? "—"}
        </dd>
        <dt className="text-muted-foreground">Criado</dt>
        <dd className="text-right">
          {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true, locale: ptBR })}
        </dd>
        <dt className="text-muted-foreground">Versão atual</dt>
        <dd className="text-right">
          {versionLoading ? (
            <Skeleton className="inline-block h-3 w-10 align-middle" />
          ) : (
            `v${latestQuery.data?.latest?.version ?? asset.version}`
          )}
        </dd>
      </dl>

      {asset.tags.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                {t}
              </Badge>
            ))}
            {moreTags > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{moreTags}</Badge>
            )}
          </div>
        </>
      )}

      {asset.dominant_colors.length > 0 && (
        <div className="flex gap-1.5">
          {asset.dominant_colors.slice(0, 4).map((c, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded border border-border"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}

      <Separator />

      <div className="flex flex-col gap-1.5">
        <Button size="sm" onClick={onOpenDetails} className="w-full">
          <ExternalLink className="w-3.5 h-3.5 mr-2" /> Abrir detalhes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setCompareOpen(true)}
          disabled={!canCompare}
          title={canCompare ? "Comparar com versão anterior" : "Nenhuma versão anterior disponível"}
        >
          <GitCompare className="w-3.5 h-3.5 mr-2" /> Comparar versões
        </Button>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleCopy} disabled={!url}>
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar URL
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={handleDownload} disabled={!url}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar
          </Button>
        </div>
      </div>

      <QuickVersionCompareDialog
        asset={asset}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
    </div>
  );
}

/**
 * Desktop (lg+): sticky lateral card.
 * Mobile/tablet (<lg): bottom sheet that opens automatically when an asset is active.
 */
export function QuickPreviewPanel(props: QuickPreviewPanelProps) {
  return (
    <>
      {/* Desktop sticky panel */}
      <aside
        role="complementary"
        aria-label="Prévia rápida do asset"
        className="hidden lg:block w-80 shrink-0"
      >
        <Card className="sticky top-4 p-4 max-h-[calc(100vh-3rem)] overflow-auto">
          <PanelBody {...props} />
        </Card>
      </aside>

      {/* Mobile sheet */}
      <Sheet
        open={!!props.asset}
        onOpenChange={(open) => {
          if (!open && props.pinned) props.onTogglePin();
        }}
      >
        <SheetContent side="right" className="lg:hidden w-[90vw] sm:max-w-sm overflow-auto">
          <SheetHeader>
            <SheetTitle>Prévia rápida</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PanelBody {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}