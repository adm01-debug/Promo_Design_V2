import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAssetUpload, UPLOAD_PHASE_LABELS, type UploadPhase } from "../hooks/use-asset-upload";
import { useAssets, type Asset, type AssetType } from "../hooks/use-assets";
import { useClients } from "@/features/clients/hooks/use-clients";
import { Upload, X, FileImage, History, RotateCw, FileType, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TagChipsInput } from "./TagChipsInput";
import { TagCounter } from "@/components/ui/tag-counter";
import { cn } from "@/lib/utils";
import {
  detectFileKind,
  buildSvgPreviewUrl,
  rasterizePdfFirstPage,
  getPdfPageCount,
  type FileKind,
} from "../lib/file-preview";

const MAX_FILES = 10;
const MAX_SIZE_MB = 20;
const ACCEPTED = "image/*,application/pdf,.svg,.ai,.psd";
const DRAFT_PREFIX = "asset-upload-draft:";
const MAX_TAGS = 20;

const TAG_REGEX = /^[a-z0-9\-_ ]{1,30}$/;
const normalizeTag = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, " ");

// Stopwords PT/EN comuns + extensões — descartadas das sugestões automáticas.
const STOPWORDS = new Set<string>([
  "de", "da", "do", "das", "dos", "e", "ou", "para", "com", "sem", "em", "um", "uma",
  "the", "a", "an", "of", "and", "or", "for", "with", "to", "in",
  "final", "v1", "v2", "v3", "rev", "copy", "copia", "cópia",
  "jpg", "jpeg", "png", "gif", "webp", "svg", "pdf", "ai", "psd", "tif", "tiff",
]);

function tagsFromFileName(name: string): string[] {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .split(/[\s_\-.()[\]{},]+/g)
    .map((t) => normalizeTag(t))
    .filter((t) => t.length >= 3 && t.length <= 30 && !STOPWORDS.has(t) && TAG_REGEX.test(t) && !/^\d+$/.test(t));
}

function buildAutoSuggestions(entries: { file: File }[], assetType: AssetType, currentTags: string[]): string[] {
  const current = new Set(currentTags.map(normalizeTag));
  const seen = new Set<string>();
  const out: string[] = [];
  // Asset type primeiro — sempre relevante.
  if (!current.has(assetType)) {
    out.push(assetType);
    seen.add(assetType);
  }
  for (const e of entries) {
    for (const t of tagsFromFileName(e.file.name)) {
      if (current.has(t) || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= 12) return out;
    }
  }
  return out;
}

interface UploadDraft {
  tags: string[];
  tagError: string | null;
  assetType: AssetType;
  clientId: string | null;
}

/**
 * Build a scoped draft key so different upload contexts don't share state.
 *
 * Scopes:
 *  - new asset, no client selected            → org-level draft
 *  - new asset, with client (project)         → org+client draft
 *  - new version of an existing parent asset  → org+parent draft (independent of client)
 *
 * The key is recomputed when context changes; switching project or parent loads
 * the appropriate draft and never mixes tags/errors between uploads.
 */
function draftKey(orgId: string, clientId: string | null, parentAssetId: string | null): string | null {
  if (!orgId) return null;
  if (parentAssetId) return `${DRAFT_PREFIX}${orgId}:parent:${parentAssetId}`;
  if (clientId) return `${DRAFT_PREFIX}${orgId}:client:${clientId}`;
  return `${DRAFT_PREFIX}${orgId}:org`;
}

function readDraft(key: string | null): UploadDraft | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UploadDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === "string") : [],
      tagError: typeof parsed.tagError === "string" ? parsed.tagError : null,
      assetType: (typeof parsed.assetType === "string" ? parsed.assetType : "art") as AssetType,
      clientId: typeof parsed.clientId === "string" ? parsed.clientId : null,
    };
  } catch {
    return null;
  }
}

function writeDraft(key: string | null, draft: UploadDraft) {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* ignore quota / serialization errors */
  }
}

function clearDraft(key: string | null) {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  defaultClientId?: string | null;
  defaultAssetType?: AssetType;
  /** When provided, the dialog operates in "new version" mode for this asset. */
  parentAsset?: Asset | null;
  /** Called once a successful upload completes. Receives the newly created asset. */
  onUploaded?: (asset: Asset) => void;
}

interface FileEntry {
  id: string;
  file: File;
  preview: string | null;
  kind: FileKind;
  previewLoading: boolean;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  phase?: UploadPhase;
  /** For PDFs: which page is rendered as thumb (1-indexed). */
  pdfPage?: number;
  /** Detected total pages for PDFs (null while loading). */
  pdfPageCount?: number | null;
}

export function AssetUploadDialog({
  open,
  onOpenChange,
  organizationId,
  defaultClientId = null,
  defaultAssetType = "art",
  parentAsset = null,
  onUploaded,
}: Props) {
  const isVersionMode = !!parentAsset;
  const { uploadFile } = useAssetUpload(organizationId);
  const { clients } = useClients(organizationId);
  const { assets } = useAssets(organizationId, {});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [clientId, setClientId] = useState<string | null>(parentAsset?.client_id ?? defaultClientId);
  const [assetType, setAssetType] = useState<AssetType>(parentAsset?.asset_type ?? defaultAssetType);
  const [tags, setTags] = useState<string[]>(parentAsset?.tags ?? []);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);

  // Scope draft persistence by org + (parent asset OR selected client/project),
  // so switching project or editing a different parent never mixes tag drafts
  // or stale validation errors between uploads.
  const persistKey = useMemo(
    () => draftKey(organizationId, clientId, parentAsset?.id ?? null),
    [organizationId, clientId, parentAsset?.id],
  );

  // Clear stale tag validation errors when switching asset type (e.g., arte final ↔ mockup),
  // so an old error doesn't keep blocking submission after the user changed modes.
  useEffect(() => {
    setTagError(null);
  }, [assetType]);

  // Reset / restore on open. Version mode seeds from parent first, then layers any
  // saved draft for that specific parent on top so re-opening the dialog restores
  // exactly what was being typed for THAT parent (not a sibling upload).
  useEffect(() => {
    if (!open) {
      setDraftHydrated(false);
      return;
    }
    setEntries([]);
    if (isVersionMode) {
      const parentDraftKey = draftKey(organizationId, parentAsset?.client_id ?? null, parentAsset?.id ?? null);
      const draft = readDraft(parentDraftKey);
      setClientId(parentAsset?.client_id ?? defaultClientId);
      setAssetType(draft?.assetType ?? parentAsset?.asset_type ?? defaultAssetType);
      setTags(draft?.tags ?? parentAsset?.tags ?? []);
      setTagError(draft?.tagError ?? null);
      setDraftHydrated(true);
      return;
    }
    // For new assets, hydrate from the org/client-scoped draft.
    const initialKey = draftKey(organizationId, defaultClientId, null);
    const draft = readDraft(initialKey);
    setClientId(draft?.clientId ?? defaultClientId);
    setAssetType(draft?.assetType ?? defaultAssetType);
    setTags(draft?.tags ?? []);
    setTagError(draft?.tagError ?? null);
    setDraftHydrated(true);
    // Intentionally NOT depending on persistKey: we want hydration to run only when
    // the dialog opens, not whenever the user changes the project mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parentAsset, defaultClientId, defaultAssetType, isVersionMode, organizationId]);

  // Persist draft on every relevant change. The key is scoped, so each
  // (org, client/project) or (org, parent) combination gets its own slot.
  useEffect(() => {
    if (!open || !draftHydrated) return;
    writeDraft(persistKey, { tags, tagError, assetType, clientId });
  }, [open, draftHydrated, persistKey, tags, tagError, assetType, clientId]);

  // Cleanup object URLs
  useEffect(() => {
    return () => entries.forEach((e) => e.preview && URL.revokeObjectURL(e.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagSuggestions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [assets]);

  const autoSuggestions = useMemo(
    () => buildAutoSuggestions(entries, assetType, tags),
    [entries, assetType, tags],
  );
  const remainingSlots = Math.max(0, MAX_TAGS - tags.length);

  const addAutoTag = (t: string) => {
    if (tags.length >= MAX_TAGS) {
      toast.error(`Máximo de ${MAX_TAGS} tags atingido`);
      return;
    }
    if (tags.includes(t)) return;
    setTags([...tags, t]);
  };

  const addAllAutoTags = () => {
    if (autoSuggestions.length === 0) return;
    const slots = MAX_TAGS - tags.length;
    if (slots <= 0) {
      toast.error(`Máximo de ${MAX_TAGS} tags atingido`);
      return;
    }
    const toAdd = autoSuggestions.slice(0, slots);
    setTags([...tags, ...toAdd]);
    if (autoSuggestions.length > slots) {
      toast.info(`Adicionadas ${toAdd.length} tags. ${autoSuggestions.length - slots} ignoradas (limite ${MAX_TAGS}).`);
    }
  };

  const validateFile = (f: File): string | null => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `Arquivo > ${MAX_SIZE_MB}MB`;
    return null;
  };

  const addFiles = (files: File[]) => {
    if (isVersionMode && files.length > 1) {
      toast.error("Em modo versão, selecione apenas 1 arquivo");
      files = files.slice(0, 1);
    }
    const slotsLeft = (isVersionMode ? 1 : MAX_FILES) - entries.length;
    if (slotsLeft <= 0) {
      toast.error(`Máximo de ${isVersionMode ? 1 : MAX_FILES} arquivo(s)`);
      return;
    }
    const next: FileEntry[] = [];
    for (const f of files.slice(0, slotsLeft)) {
      const err = validateFile(f);
      if (err) {
        toast.error(`${f.name}: ${err}`);
        continue;
      }
      const kind = detectFileKind(f);
      const isRasterImage =
        kind === "image" && (f.type || "").startsWith("image/");
      next.push({
        id: crypto.randomUUID(),
        file: f,
        kind,
        preview: isRasterImage ? URL.createObjectURL(f) : null,
        previewLoading: kind === "pdf" || kind === "svg",
        progress: 0,
        status: "pending",
        pdfPage: kind === "pdf" ? 1 : undefined,
        pdfPageCount: kind === "pdf" ? null : undefined,
      });
    }
    setEntries((prev) => (isVersionMode ? next : [...prev, ...next]));
    // Async preview generation for PDF/SVG (does not block UI)
    next.forEach((entry) => {
      if (entry.kind === "svg") {
        buildSvgPreviewUrl(entry.file)
          .then((url) => updatePreview(entry.id, url))
          .catch(() => updatePreview(entry.id, null));
      } else if (entry.kind === "pdf") {
        rasterizePdfFirstPage(entry.file, 256, "image/jpeg", 0.85, 1)
          .then((r) => updatePreview(entry.id, r?.url ?? null))
          .catch(() => updatePreview(entry.id, null));
        getPdfPageCount(entry.file)
          .then((count) =>
            setEntries((prev) =>
              prev.map((e) => (e.id === entry.id ? { ...e, pdfPageCount: count } : e)),
            ),
          )
          .catch(() => undefined);
      }
    });
  };

  const changePdfPage = (id: string, page: number) => {
    setEntries((prev) => {
      const target = prev.find((e) => e.id === id);
      if (!target || target.kind !== "pdf") return prev;
      const max = target.pdfPageCount ?? page;
      const safe = Math.min(Math.max(1, Math.floor(page || 1)), Math.max(1, max));
      if (safe === target.pdfPage) return prev;
      return prev.map((e) =>
        e.id === id ? { ...e, pdfPage: safe, previewLoading: true } : e,
      );
    });
    const entry = entries.find((e) => e.id === id);
    if (!entry || entry.kind !== "pdf") return;
    const max = entry.pdfPageCount ?? page;
    const safe = Math.min(Math.max(1, Math.floor(page || 1)), Math.max(1, max));
    rasterizePdfFirstPage(entry.file, 256, "image/jpeg", 0.85, safe)
      .then((r) => updatePreview(id, r?.url ?? null))
      .catch(() => updatePreview(id, null));
  };

  const updatePreview = (id: string, url: string | null) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        // Revoke any prior url that we own (raster image used file URL too)
        if (e.preview && e.preview !== url) URL.revokeObjectURL(e.preview);
        return { ...e, preview: url, previewLoading: false };
      })
    );
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id);
      if (e?.preview) URL.revokeObjectURL(e.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  const uploadEntries = async (targets: FileEntry[]) => {
    // Defensive normalization + dedupe
    const cleanTags = Array.from(
      new Set(
        tags
          .map((t) => t.trim().toLowerCase().replace(/\s+/g, " "))
          .filter((t) => t.length > 0)
      )
    );
    setIsUploading(true);
    let okCount = 0;
    let errCount = 0;
    let lastUploaded: Asset | null = null;
    for (const entry of targets) {
      if (entry.status === "done") { okCount++; continue; }
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "uploading", progress: 10, error: undefined, phase: "analyzing" } : e));
      try {
        const created = await uploadFile(entry.file, {
          organizationId,
          clientId,
          assetType,
          tags: cleanTags,
          parentAsset: parentAsset ?? undefined,
          pdfPage: entry.pdfPage,
          onPhase: (phase) => {
            // Map qualitative phase to a coarse progress percentage so the bar
            // also moves while the user reads the label.
            const phaseProgress: Record<UploadPhase, number> = {
              "analyzing": 10,
              "rendering-pdf": 25,
              "rasterizing-svg": 25,
              "processing-image": 25,
              "uploading-file": 55,
              "uploading-thumb": 80,
              "saving-record": 92,
              "done": 100,
            };
            setEntries((prev) =>
              prev.map((e) =>
                e.id === entry.id
                  ? { ...e, phase, progress: Math.max(e.progress, phaseProgress[phase] ?? e.progress) }
                  : e,
              ),
            );
          },
        });
        lastUploaded = created ?? null;
        if (created) onUploaded?.(created);
        setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "done", progress: 100, phase: "done" } : e));
        okCount++;
      } catch (err) {
        const msg = (err as Error).message;
        setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "error", error: msg } : e));
        toast.error(`${entry.file.name}: ${msg}`);
        errCount++;
      }
    }
    setIsUploading(false);

    if (okCount > 0 && errCount === 0) {
      toast.success(
        isVersionMode
          ? `Nova versão criada (v${(parentAsset?.version ?? 1) + 1})`
          : `${okCount} asset(s) enviado(s)`
      );
      clearDraft(persistKey);
      onOpenChange(false);
    } else if (okCount > 0 && errCount > 0) {
      toast.success(`${okCount} enviado(s) · ${errCount} com erro`);
    }
    return { okCount, errCount, lastUploaded };
  };

  const handleSubmit = async () => {
    if (entries.length === 0) return;
    if (tags.length > 20) {
      toast.error(`Limite de tags excedido: ${tags.length}/20. Remova ${tags.length - 20} tag(s) para continuar.`);
      return;
    }
    if (tagError) {
      toast.error("Corrija as tags antes de enviar");
      return;
    }
    await uploadEntries(entries);
  };

  const handleRetry = async () => {
    const failed = entries.filter((e) => e.status === "error");
    if (failed.length === 0) return;
    setEntries((prev) => prev.map((e) => e.status === "error" ? { ...e, status: "pending", error: undefined, progress: 0 } : e));
    // Use the freshly-reset entries (status pending) for upload
    const targets = failed.map((e) => ({ ...e, status: "pending" as const, error: undefined, progress: 0 }));
    await uploadEntries(targets);
  };

  const errorCount = entries.filter((e) => e.status === "error").length;
  const doneCount = entries.filter((e) => e.status === "done").length;
  const allDone = entries.length > 0 && doneCount === entries.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !isUploading && onOpenChange(v)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isVersionMode ? <><History className="w-5 h-5" /> Nova versão</> : "Novo asset"}
          </DialogTitle>
          {isVersionMode && parentAsset && (
            <DialogDescription>
              Versão de <span className="font-medium text-foreground">{parentAsset.name}</span>
              {" — "}
              v{parentAsset.version} → <span className="font-medium text-foreground">v{parentAsset.version + 1}</span>. Tipo, cliente e tags são herdados.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <Upload className={`w-8 h-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            <div className="text-sm text-center">
              {isDragging
                ? "Solte para adicionar"
                : isVersionMode
                  ? "Arraste 1 arquivo ou clique"
                  : "Arraste arquivos ou clique para selecionar"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isVersionMode ? "1 arquivo · " : `Até ${MAX_FILES} arquivos · `}máx {MAX_SIZE_MB}MB cada
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple={!isVersionMode}
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </div>

          {entries.length > 0 && (
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
                  {e.preview ? (
                    <img
                      src={e.preview}
                      alt=""
                      className="w-10 h-10 rounded object-cover bg-muted"
                    />
                  ) : e.previewLoading ? (
                    <div
                      className="w-10 h-10 rounded bg-muted flex items-center justify-center"
                      title="Gerando preview..."
                    >
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    </div>
                  ) : e.kind === "ai" || e.kind === "psd" ? (
                    <div
                      className="w-10 h-10 rounded bg-muted flex flex-col items-center justify-center"
                      title={e.kind.toUpperCase()}
                    >
                      <FileType className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider leading-none mt-0.5">
                        {e.kind}
                      </span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <FileImage className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate flex items-center gap-2">
                      {e.file.name}
                      {e.status === "done" && <Badge variant="secondary" className="text-[10px]">ok</Badge>}
                      {e.status === "error" && (
                        <Badge variant="destructive" className="text-[10px]" title={e.error}>erro</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(e.file.size / 1024).toFixed(1)} KB
                    </div>
                    {e.kind === "pdf" && e.status !== "done" && e.status !== "uploading" && (
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Label htmlFor={`pdf-page-${e.id}`} className="m-0 text-[11px]">
                          Página da thumb:
                        </Label>
                        <Input
                          id={`pdf-page-${e.id}`}
                          type="number"
                          min={1}
                          max={e.pdfPageCount ?? undefined}
                          value={e.pdfPage ?? 1}
                          onChange={(ev) => changePdfPage(e.id, Number(ev.target.value))}
                          className="h-7 w-16 text-xs"
                          disabled={isUploading}
                          aria-label="Número da página para gerar thumbnail"
                        />
                        <span className="tabular-nums">
                          {e.pdfPageCount ? `de ${e.pdfPageCount}` : "carregando…"}
                        </span>
                      </div>
                    )}
                    {e.status === "error" && e.error && (
                      <div className="text-[11px] text-destructive truncate mt-0.5" title={e.error}>{e.error}</div>
                    )}
                    {e.status === "uploading" && (
                      <div className="mt-1 space-y-1">
                        <Progress value={e.progress} className="h-1" />
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          <span className="truncate">
                            {UPLOAD_PHASE_LABELS[e.phase ?? "analyzing"]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isUploading && e.status !== "done" && (
                    <button
                      type="button"
                      onClick={() => removeEntry(e.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Remover"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isVersionMode ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                <span className="font-medium capitalize">{assetType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                <span className="font-medium">
                  {clientId
                    ? (clients.find((c) => c.id === clientId)?.name ?? "—")
                    : "Geral da organização"}
                </span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-muted-foreground">Tags:</span>
                  {tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="art">Arte</SelectItem>
                  <SelectItem value="photo">Foto</SelectItem>
                  <SelectItem value="mockup">Mockup</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente (opcional)</Label>
              <Select value={clientId ?? "none"} onValueChange={(v) => setClientId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Geral da organização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geral da organização</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Label className="m-0">Tags</Label>
              <TagCounter count={tags.length} max={MAX_TAGS} />
            </div>
            <TagChipsInput
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              onValidationChange={setTagError}
            />
            {tags.length > 20 && (
              <p className="mt-1.5 text-[11px] text-destructive font-medium" role="alert">
                Limite excedido: {tags.length}/20 tags. Remova {tags.length - 20} para enviar.
              </p>
            )}
            {autoSuggestions.length > 0 && tags.length < MAX_TAGS && (
              <div className="mt-2 rounded-md border border-dashed border-border p-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Sugestões automáticas (do nome + tipo)
                  </span>
                  <button
                    type="button"
                    onClick={addAllAutoTags}
                    className="text-[11px] text-primary hover:underline disabled:opacity-50"
                    disabled={remainingSlots === 0}
                  >
                    Adicionar todas ({Math.min(autoSuggestions.length, remainingSlots)})
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {autoSuggestions.slice(0, remainingSlots + 4).map((t) => {
                    const disabled = tags.length >= MAX_TAGS;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addAutoTag(t)}
                        disabled={disabled}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] transition-colors",
                          disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent hover:text-accent-foreground hover:border-primary/40",
                        )}
                        aria-label={`Adicionar tag ${t}`}
                      >
                        + {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center gap-2">
          {(doneCount > 0 || errorCount > 0) && (
            <div className="text-xs text-muted-foreground sm:mr-auto">
              {doneCount} enviado(s){errorCount > 0 ? ` · ${errorCount} com erro` : ""}
            </div>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          {errorCount > 0 && !isUploading && (
            <Button variant="outline" onClick={handleRetry} disabled={!!tagError || tags.length > 20}>
              <RotateCw className="w-4 h-4" />
              Tentar novamente ({errorCount})
            </Button>
          )}
          {allDone && errorCount === 0 ? (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isUploading || entries.length === 0 || !!tagError || tags.length > 20 || (doneCount > 0 && errorCount === 0)}
              title={tags.length > 20 ? `Limite de tags excedido (${tags.length}/20)` : undefined}
            >
              {isUploading
                ? "Enviando..."
                : isVersionMode
                  ? `Criar versão v${(parentAsset?.version ?? 1) + 1}`
                  : "Enviar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
