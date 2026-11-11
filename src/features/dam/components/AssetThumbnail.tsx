import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { getAssetSignedUrl, type Asset } from "../hooks/use-assets";

/**
 * Builds a LQIP (Low-Quality Image Placeholder) style gradient from the
 * asset's precomputed dominant colors. Falls back to muted when empty.
 */
function useDominantGradient(colors: string[] | null | undefined): string | null {
  return useMemo(() => {
    if (!colors || colors.length === 0) return null;
    const valid = colors.filter((c) => /^#[0-9a-fA-F]{3,8}$/.test(c)).slice(0, 4);
    if (valid.length === 0) return null;
    if (valid.length === 1) return valid[0];
    const stops = valid.map((c, i) => `${c} ${(i / (valid.length - 1)) * 100}%`).join(", ");
    return `linear-gradient(135deg, ${stops})`;
  }, [colors]);
}

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
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(eager);
  const containerRef = useRef<HTMLDivElement>(null);
  const path = asset.thumbnail_path ?? asset.file_path;
  const isImage = (asset.mime_type ?? "").startsWith("image/");
  const gradient = useDominantGradient(asset.dominant_colors);

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

  // Placeholder: gradient built from dominant colors, otherwise animated icon.
  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-muted ${className}`}
      style={gradient ? { background: gradient } : undefined}
      aria-busy={!loaded}
    >
      {!gradient && !loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <ImageIcon className="w-8 h-8 animate-pulse" aria-hidden="true" />
        </div>
      )}
      {url && (
        <img
          src={url}
          alt={asset.name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
