import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetVersions, type Asset, getAssetSignedUrl } from "../hooks/use-assets";
import { History } from "lucide-react";

interface Props {
  asset: Asset;
  onSelect: (a: Asset) => void;
}

function VersionThumb({ asset }: { asset: Asset }) {
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

export function AssetVersionHistory({ asset, onSelect }: Props) {
  const { data, isLoading } = useAssetVersions(asset);
  const versions = data ?? [];
  const maxVersion = versions.reduce((m, v) => Math.max(m, v.version), 0);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (versions.length <= 1) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2 py-3">
        <History className="w-4 h-4" />
        Nenhuma versão anterior. Use "Nova versão" para criar uma.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {versions.map((v) => {
        const isCurrent = v.version === maxVersion;
        const isSelected = v.id === asset.id;
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelect(v)}
              className={`w-full flex items-center gap-3 p-2 rounded-md border text-left transition-colors hover:bg-accent ${
                isSelected
                  ? "border-primary ring-2 ring-primary/40 bg-accent/50"
                  : "border-border"
              }`}
            >
              <VersionThumb asset={v} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{v.name}</span>
                  {isCurrent && <Badge variant="default" className="text-[10px]">atual</Badge>}
                  {isSelected && !isCurrent && (
                    <Badge variant="outline" className="text-[10px]">aberta</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  v{v.version} · {new Date(v.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}