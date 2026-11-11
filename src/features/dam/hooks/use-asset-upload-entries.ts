import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  detectFileKind,
  buildSvgPreviewUrl,
  rasterizePdfFirstPage,
  getPdfPageCount,
  type FileKind,
} from "../lib/file-preview";
import { clampPages } from "../lib/pdf-pages";
import { usePdfPageMemory } from "./use-pdf-page-memory";
import type { UploadPhase } from "./use-asset-upload";

export interface FileEntry {
  id: string;
  file: File;
  preview: string | null;
  kind: FileKind;
  previewLoading: boolean;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  phase?: UploadPhase;
  pdfPage?: number;
  pdfPages?: number[];
  pdfPageCount?: number | null;
  pdfPageError?: string | null;
}

export function useAssetUploadEntries(isVersionMode: boolean, maxFiles: number, maxSizeMb: number) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const { getRememberedPdfPages, rememberPdfPages } = usePdfPageMemory();

  const updatePreview = useCallback((id: string, url: string | null) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (e.preview && e.preview !== url) URL.revokeObjectURL(e.preview);
        return { ...e, preview: url, previewLoading: false };
      }),
    );
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id);
      if (e?.preview) URL.revokeObjectURL(e.preview);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      if (isVersionMode && files.length > 1) {
        toast.error("Em modo versão, selecione apenas 1 arquivo");
        files = files.slice(0, 1);
      }
      const slotsLeft = (isVersionMode ? 1 : maxFiles) - entries.length;
      if (slotsLeft <= 0) {
        toast.error(`Máximo de ${isVersionMode ? 1 : maxFiles} arquivo(s)`);
        return;
      }

      const next: FileEntry[] = [];
      for (const f of files.slice(0, slotsLeft)) {
        if (f.size > maxSizeMb * 1024 * 1024) {
          toast.error(`${f.name}: Arquivo > ${maxSizeMb}MB`);
          continue;
        }
        const kind = detectFileKind(f);
        const isRasterImage = kind === "image" && (f.type || "").startsWith("image/");
        const rememberedPages = kind === "pdf" ? getRememberedPdfPages(f) : null;
        const initialPdfPages = kind === "pdf" ? (rememberedPages ?? [1]) : undefined;

        next.push({
          id: crypto.randomUUID(),
          file: f,
          kind,
          preview: isRasterImage ? URL.createObjectURL(f) : null,
          previewLoading: kind === "pdf" || kind === "svg",
          progress: 0,
          status: "pending",
          pdfPage: initialPdfPages?.[0],
          pdfPages: initialPdfPages,
          pdfPageCount: kind === "pdf" ? null : undefined,
        });
      }

      setEntries((prev) => (isVersionMode ? next : [...prev, ...next]));

      next.forEach((entry) => {
        if (entry.kind === "svg") {
          buildSvgPreviewUrl(entry.file)
            .then((url) => updatePreview(entry.id, url))
            .catch(() => updatePreview(entry.id, null));
        } else if (entry.kind === "pdf") {
          const page = entry.pdfPage ?? 1;
          rasterizePdfFirstPage(entry.file, 256, "image/jpeg", 0.85, page)
            .then((r) => updatePreview(entry.id, r?.url ?? null))
            .catch(() => updatePreview(entry.id, null));

          getPdfPageCount(entry.file)
            .then((count) => {
              const safeCount = typeof count === "number" && count > 0 ? count : null;
              setEntries((prev) =>
                prev.map((e) => {
                  if (e.id !== entry.id) return e;
                  const current = e.pdfPage ?? 1;
                  if (safeCount === null) return { ...e, pdfPageCount: count };
                  const clampedList = clampPages(e.pdfPages ?? [current], safeCount);
                  const finalPages = clampedList.length ? clampedList : [1];
                  return {
                    ...e,
                    pdfPageCount: count,
                    pdfPage: finalPages[0],
                    pdfPages: finalPages,
                    previewLoading: finalPages[0] !== current,
                  };
                }),
              );
            })
            .catch(() => undefined);
        }
      });
    },
    [isVersionMode, maxFiles, maxSizeMb, entries.length, getRememberedPdfPages, updatePreview],
  );

  const changePdfPage = useCallback(
    (id: string, page: number) => {
      setEntries((prev) => {
        const entry = prev.find((e) => e.id === id);
        if (!entry || entry.kind !== "pdf") return prev;
        const requested = Math.max(1, Math.floor(page || 1));
        const total = entry.pdfPageCount ?? null;

        if (total !== null && requested > total) {
          const message = `Página ${requested} fora do intervalo (1–${total}).`;
          toast.error(`${entry.file.name}: ${message}`);
          return prev.map((e) => (e.id === id ? { ...e, pdfPageError: message } : e));
        }

        if (requested === entry.pdfPage && !entry.pdfPageError) return prev;

        const restPages = (entry.pdfPages ?? []).filter((p) => p !== requested);
        const nextPages = [requested, ...restPages];
        rememberPdfPages(entry.file, nextPages);

        rasterizePdfFirstPage(entry.file, 256, "image/jpeg", 0.85, requested)
          .then((r) => updatePreview(id, r?.url ?? null))
          .catch(() => updatePreview(id, null));

        return prev.map((e) =>
          e.id === id
            ? {
                ...e,
                pdfPage: requested,
                pdfPages: nextPages,
                pdfPageError: null,
                previewLoading: true,
              }
            : e,
        );
      });
    },
    [rememberPdfPages, updatePreview],
  );

  useEffect(() => {
    return () => entries.forEach((e) => e.preview && URL.revokeObjectURL(e.preview));
  }, [entries]);

  return {
    entries,
    setEntries,
    addFiles,
    removeEntry,
    changePdfPage,
    updatePreview,
  };
}
