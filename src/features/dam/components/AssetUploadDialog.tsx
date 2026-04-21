import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAssetUpload } from "../hooks/use-asset-upload";
import { useAssets, type Asset, type AssetType } from "../hooks/use-assets";
import { useClients } from "@/features/clients/hooks/use-clients";
import { Upload, X, FileImage, History, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { TagChipsInput } from "./TagChipsInput";

const MAX_FILES = 10;
const MAX_SIZE_MB = 20;
const ACCEPTED = "image/*,application/pdf,.svg,.ai,.psd";

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
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
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

  // Reset when re-opening or switching parent
  useEffect(() => {
    if (open) {
      setEntries([]);
      setClientId(parentAsset?.client_id ?? defaultClientId);
      setAssetType(parentAsset?.asset_type ?? defaultAssetType);
      setTags(parentAsset?.tags ?? []);
    }
  }, [open, parentAsset, defaultClientId, defaultAssetType]);

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
      next.push({
        id: crypto.randomUUID(),
        file: f,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
        progress: 0,
        status: "pending",
      });
    }
    setEntries((prev) => (isVersionMode ? next : [...prev, ...next]));
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

  const handleSubmit = async () => {
    if (entries.length === 0) return;
    if (tagError) {
      toast.error("Corrija as tags antes de enviar");
      return;
    }
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
    let lastUploaded: Asset | null = null;
    for (const entry of entries) {
      if (entry.status === "done") { okCount++; continue; }
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "uploading", progress: 10 } : e));
      try {
        const created = await uploadFile(entry.file, {
          organizationId,
          clientId,
          assetType,
          tags: cleanTags,
          parentAsset: parentAsset ?? undefined,
        });
        lastUploaded = created ?? null;
        setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "done", progress: 100 } : e));
        okCount++;
      } catch (err) {
        const msg = (err as Error).message;
        setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: "error", error: msg } : e));
        toast.error(`${entry.file.name}: ${msg}`);
      }
    }
    setIsUploading(false);
    if (okCount > 0) {
      toast.success(
        isVersionMode
          ? `Nova versão criada (v${(parentAsset?.version ?? 1) + 1})`
          : `${okCount} asset(s) enviado(s)`
      );
      if (lastUploaded) onUploaded?.(lastUploaded);
      onOpenChange(false);
    }
  };

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
                    <img src={e.preview} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <FileImage className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate flex items-center gap-2">
                      {e.file.name}
                      {e.status === "done" && <Badge variant="secondary" className="text-[10px]">ok</Badge>}
                      {e.status === "error" && <Badge variant="destructive" className="text-[10px]">erro</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(e.file.size / 1024).toFixed(1)} KB
                    </div>
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
            <Label className="mb-1.5 block">Tags</Label>
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || entries.length === 0 || !!tagError}>
            {isUploading
              ? "Enviando..."
              : isVersionMode
                ? `Criar versão v${(parentAsset?.version ?? 1) + 1}`
                : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
