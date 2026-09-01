import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Asset } from "../hooks/use-assets";

export function useAssetOcr(asset: Asset | null, searchQuery?: string) {
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string>("none");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrClearing, setOcrClearing] = useState(false);

  useEffect(() => {
    if (!asset) return;
    setOcrText(asset.ocr_text ?? null);
    setOcrStatus(asset.ocr_status ?? "none");
    setOcrOpen(Boolean(asset.ocr_match && (searchQuery ?? "").trim().length >= 2));
  }, [asset, searchQuery]);

  // Poll once if OCR is pending
  useEffect(() => {
    if (!asset || ocrStatus !== "pending") return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("assets")
        .select("ocr_text, ocr_status")
        .eq("id", asset.id)
        .maybeSingle();
      if (data) {
        setOcrText((data as { ocr_text: string | null }).ocr_text);
        setOcrStatus((data as { ocr_status: string }).ocr_status);
        if ((data as { ocr_status: string }).ocr_status !== "pending") clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [asset, ocrStatus]);

  const runOcr = async () => {
    if (!asset) return;
    setOcrLoading(true);
    setOcrStatus("pending");
    const requestId = crypto.randomUUID();
    try {
      const { data, error } = await supabase.functions.invoke("asset-ocr", {
        body: { assetId: asset.id, filePath: asset.file_path, mimeType: asset.mime_type ?? "" },
        headers: { "X-Request-Id": requestId },
      });
      if (error) throw error;
      const result = data as { ok?: boolean; length?: number; hasText?: boolean; skipped?: boolean; error?: string };
      if (result?.error) throw new Error(result.error);
      
      const { data: row } = await supabase
        .from("assets")
        .select("ocr_text, ocr_status")
        .eq("id", asset.id)
        .maybeSingle();
      if (row) {
        setOcrText((row as { ocr_text: string | null }).ocr_text);
        setOcrStatus((row as { ocr_status: string }).ocr_status);
      }
      
      if (result?.skipped) {
        toast.info("Tipo de arquivo não suporta OCR");
      } else if (result?.hasText) {
        toast.success(`Texto extraído (${result.length} caracteres)`);
        setOcrOpen(true);
      } else {
        toast.info("Nenhum texto detectado na imagem");
      }
    } catch (e) {
      setOcrStatus("failed");
      toast.error(e instanceof Error ? e.message : "Falha ao extrair texto");
    } finally {
      setOcrLoading(false);
    }
  };

  const clearOcr = async () => {
    if (!asset) return;
    if (!confirm("Limpar o texto OCR deste asset? Você pode reprocessar depois.")) return;
    setOcrClearing(true);
    try {
      const { error } = await supabase
        .from("assets")
        .update({ ocr_text: null, ocr_status: "none" })
        .eq("id", asset.id);
      if (error) throw error;
      setOcrText(null);
      setOcrStatus("none");
      setOcrOpen(false);
      toast.success("OCR removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao limpar OCR");
    } finally {
      setOcrClearing(false);
    }
  };

  return {
    ocrText,
    ocrStatus,
    ocrLoading,
    ocrOpen,
    setOcrOpen,
    ocrClearing,
    runOcr,
    clearOcr
  };
}
