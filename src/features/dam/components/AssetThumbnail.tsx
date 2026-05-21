import { useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { getAssetSignedUrl, type Asset } from "../hooks/use-assets";

export function AssetThumbnail({
  asset,
  className = "",
  eager = false,
}: {
  asset: Asset;
  className?: string;
  /** When true, fetches the signed URL on mount. Otherwise waits for the element to enter the viewport. */
  eager?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(eager);
  const containerRef = useRef<HTMLDivElement>(null);
  const path = asset.thumbnail_path ?? asset.file_path;
  const isImage = (asset.mime_type ?? "").startsWith("image/");

  // Observe visibility when not eager. Stops observing once visible.
  useEffect(() => {
    if (eager || visible || !isImage) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, visible, isImage]);

  useEffect(() => {
    let active = true;
    if (!isImage || !visible) return;
    getAssetSignedUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path, isImage, visible]);

  if (!isImage) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        <FileText className="w-8 h-8" />
      </div>
    );
  }
  if (!url) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
      >
        <ImageIcon className="w-8 h-8 animate-pulse" />
      </div>
    );
  }
  return <img src={url} alt={asset.name} className={`object-cover ${className}`} loading="lazy" />;
}
