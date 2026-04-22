import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAssetUpload, UPLOAD_PHASE_LABELS, type UploadPhase } from "../hooks/use-asset-upload";
import { useAssets, type Asset, type AssetType } from "../hooks/use-assets";
import { useClients } from "@/features/clients/hooks/use-clients";
import { Upload, X, FileImage, History, RotateCw, FileType, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TagChipsInput } from "./TagChipsInput";
import { cn } from "@/lib/utils";
import {
  detectFileKind,
  buildSvgPreviewUrl,
  rasterizePdfFirstPage,
  type FileKind,
} from "../lib/file-preview";

const MAX_FILES = 10;
const MAX_SIZE_MB = 20;
const ACCEPTED = "image/*,application/pdf,.svg,.ai,.psd";
const DRAFT_PREFIX = "asset-upload-draft:";

interface UploadDraft {
  tags: string[];
  tagError: string | null;
  assetType: AssetType;
  clientId: string | null;
}

function draftKey(orgId: string, isVersionMode: boolean): string | null {
  // Don't persist drafts for "new version" mode — it's tied to a specific parent asset.
  if (isVersionMode) return null;
  return `${DRAFT_PREFIX}${orgId}`;
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
  const persistKey = draftKey(organizationId, isVersionMode);
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

  // Clear stale tag validation errors when switching asset type (e.g., arte final ↔ mockup),
  // so an old error doesn't keep blocking submission after the user changed modes.
  useEffect(() => {
    setTagError(null);
  }, [assetType]);

  // Reset / restore on open. In version mode we always pull from parentAsset; otherwise
  // we restore the persisted draft (tags + last validation error + last selections) so
  // the user doesn't lose work when they close and reopen the dialog.
  useEffect(() => {
    if (!open) {
      setDraftHydrated(false);
      return;
    }
    setEntries([]);
    if (isVersionMode) {
      setClientId(parentAsset?.client_id ?? defaultClientId);
      setAssetType(parentAsset?.asset_type ?? defaultAssetType);
      setTags(parentAsset?.tags ?? []);
      setTagError(null);
      setDraftHydrated(true);
      return;
    }
    const draft = readDraft(persistKey);
    setClientId(draft?.clientId ?? defaultClientId);
    setAssetType(draft?.assetType ?? defaultAssetType);
    setTags(draft?.tags ?? []);
    setTagError(draft?.tagError ?? null);
    setDraftHydrated(true);
  }, [open, parentAsset, defaultClientId, defaultAssetType, isVersionMode, persistKey]);

  // Persist draft whenever tags / error / type / client change while the dialog is open.
  useEffect(() => {
    if (!open || !draftHydrated || isVersionMode) return;
    writeDraft(persistKey, { tags, tagError, assetType, clientId });
  }, [open, draftHydrated, isVersionMode, persistKey, tags, tagError, assetType, clientId]);

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
        rasterizePdfFirstPage(entry.file, 256)
          .then((r) => updatePreview(entry.id, r?.url ?? null))
          .catch(() => updatePreview(entry.id, null));
      }
    });
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
                    {e.status === "error" && e.error && (
                      <div className="text-[11px] text-destructive truncate mt-0.5" title={e.error}>{e.error}</div>
                    )}
                    {e.status === "uploading" && <Progress value={e.progress} className="h-1 mt-1" />}
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
              <span
                className={cn(
                  "text-[11px] tabular-nums font-mono transition-colors",
                  tags.length >= 20
                    ? "text-destructive font-semibold"
                    : tags.length >= 16
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
                aria-live="polite"
                aria-label={`${tags.length} de 20 tags utilizadas`}
              >
                {tags.length}/20
              </span>
            </div>
            <TagChipsInput
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              onValidationChange={setTagError}
            />
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
            <Button variant="outline" onClick={handleRetry} disabled={!!tagError}>
              <RotateCw className="w-4 h-4" />
              Tentar novamente ({errorCount})
            </Button>
          )}
          {allDone && errorCount === 0 ? (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isUploading || entries.length === 0 || !!tagError || (doneCount > 0 && errorCount === 0)}>
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
