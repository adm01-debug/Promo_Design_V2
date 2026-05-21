import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAssetSignedUrl, type Asset } from "../hooks/use-assets";

export function useAssetDetailActions(
  asset: Asset | null,
  {
    onClose,
    toggleFavorite,
  }: {
    onClose: () => void;
    toggleFavorite: (id: string) => boolean;
  },
) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) {
      setUrl(null);
      return;
    }
    getAssetSignedUrl(asset.file_path, 3600).then(setUrl);
  }, [asset]);

  const handleCopyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      toast.error("Erro ao copiar URL");
    }
  };

  // Keyboard shortcut: F toggles favorite
  useEffect(() => {
    if (!asset) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
      }
      e.preventDefault();
      const nowFav = toggleFavorite(asset.id);
      toast.success(nowFav ? "Adicionado aos favoritos" : "Removido dos favoritos");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [asset, toggleFavorite]);

  return {
    url,
    handleCopyUrl,
  };
}
