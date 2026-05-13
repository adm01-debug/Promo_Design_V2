import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { Asset } from "../hooks/use-assets";

export function usePreviewShare({
  activeAsset,
  searchParams,
  compareMode,
  compare
}: {
  activeAsset: Asset | null;
  searchParams: URLSearchParams;
  compareMode: boolean;
  compare: any;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const buildShareableUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    if (!activeAsset) return null;
    const params = new URLSearchParams(searchParams);
    params.set("asset", activeAsset.id);
    if (compareMode && compare.selectedIds.length >= 2) {
      params.set("compare", compare.selectedIds.join(","));
    } else {
      params.delete("compare");
    }
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
  };

  const handleCopyShareLink = async () => {
    const url = buildShareableUrl();
    if (!url) return;
    
    const showSuccess = () => {
      setCopied(true);
      if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
      toast.success("Link copiado", {
        description: compareMode && compare.selectedIds.length >= 2
          ? "Quem abrir verá a mesma comparação e filtros."
          : "Quem abrir verá o mesmo asset e filtros.",
        duration: 2500,
      });
    };

    try {
      await navigator.clipboard.writeText(url);
      showSuccess();
      return;
    } catch { /* fallback below */ }

    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) { showSuccess(); return; }
      throw new Error("execCommand failed");
    } catch {
      toast.error("Não foi possível copiar", { description: url, duration: 6000 });
    }
  };

  useEffect(() => () => {
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
  }, []);

  return { copied, handleCopyShareLink };
}
