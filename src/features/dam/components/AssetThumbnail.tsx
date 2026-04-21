import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { getAssetSignedUrl, type Asset } from "../hooks/use-assets";

export function AssetThumbnail({ asset, className = "" }: { asset: Asset; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const path = asset.thumbnail_path ?? asset.file_path;
  const isImage = (asset.mime_type ?? "").startsWith("image/");

  useEffect(() => {
    let active = true;
    if (!isImage) return;
    getAssetSignedUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path, isImage]);

  if (!isImage) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <FileText className="w-8 h-8" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <ImageIcon className="w-8 h-8 animate-pulse" />
      </div>
    );
  }
  return <img src={url} alt={asset.name} className={`object-cover ${className}`} loading="lazy" />;
}