import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ImageOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAssetSignedUrl, useAssetVersions, type Asset } from "../hooks/use-assets";

interface QuickVersionCompareDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function VersionPane({ asset, label }: { asset: Asset | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isImage = (asset?.mime_type ?? "").startsWith("image/");

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (!asset) return;
    setLoading(true);
    getAssetSignedUrl(asset.file_path, 3600)
      .then((u) => {
        if (active) setUrl(u);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asset]);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">{label}</Badge>
        {asset && (
          <span className="text-[11px] text-muted-foreground">
            v{asset.version} · {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        )}
      </div>
      <div className="rounded-md border bg-muted aspect-square relative overflow-hidden flex items-center justify-center">
        {!asset ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
            <ImageOff className="w-6 h-6" />
            Nenhuma versão anterior
          </div>
        ) : loading || !url ? (
          <Skeleton className="absolute inset-0 w-full h-full" />
        ) : isImage ? (
          <img src={url} alt={asset.name} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs p-3 text-center">
            <ImageOff className="w-6 h-6" />
            Pré-visualização não suportada para este tipo de arquivo
          </div>
        )}
      </div>
      {asset && (
        <p className="text-[11px] text-muted-foreground truncate" title={asset.name}>
          {asset.name}
        </p>
      )}
    </div>
  );
}

/**
 * Lightweight side-by-side comparison between the current asset version and
 * the immediately previous one in the same version chain. Avoids opening the
 * heavier asset detail drawer.
 */
export function QuickVersionCompareDialog({ asset, open, onOpenChange }: QuickVersionCompareDialogProps) {
  const versionsQuery = useAssetVersions(open ? asset : null);
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);

  const { current, previous } = useMemo(() => {
    if (!asset || versions.length === 0) return { current: asset, previous: null as Asset | null };
    const sorted = [...versions].sort((a, b) => b.version - a.version);
    const idx = sorted.findIndex((v) => v.id === asset.id);
    const cur = idx >= 0 ? sorted[idx] : sorted[0];
    const prev = sorted[(idx >= 0 ? idx : 0) + 1] ?? null;
    return { current: cur, previous: prev };
  }, [asset, versions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comparar versões</DialogTitle>
          <DialogDescription>
            Compare visualmente a versão atual com a anterior do mesmo asset.
          </DialogDescription>
        </DialogHeader>

        {versionsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando versões…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <VersionPane asset={previous} label="Anterior" />
            <VersionPane asset={current ?? null} label="Atual" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}