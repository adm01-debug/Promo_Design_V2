import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssetUpload } from "../hooks/use-asset-upload";
import { useAssets, type Asset, type AssetType } from "../hooks/use-assets";
import { useClients } from "@/features/clients/hooks/use-clients";
import { Upload, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TagChipsInput } from "./TagChipsInput";
import { TagCounter } from "@/components/ui/tag-counter";
import { buildAutoSuggestions } from "../lib/tag-suggestions";
import { useAssetUploadDraft, clearDraft } from "../hooks/use-asset-upload-draft";
import { useAssetUploadEntries } from "../hooks/use-asset-upload-entries";
import { AssetUploadList } from "./AssetUploadList";
import { AssetUploadAutoSuggestions } from "./AssetUploadAutoSuggestions";
import { PdfPageSelectorDialog } from "./PdfPageSelectorDialog";

const MAX_FILES = 10;
const MAX_SIZE_MB = 20;
const ACCEPTED = "image/*,application/pdf,.svg,.ai,.psd";
const MAX_TAGS = 20;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  defaultClientId?: string | null;
  defaultAssetType?: AssetType;
  parentAsset?: Asset | null;
  onUploaded?: (asset: Asset) => void;
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

  const { entries, setEntries, addFiles, removeEntry, changePdfPage } = useAssetUploadEntries(
    isVersionMode,
    MAX_FILES,
    MAX_SIZE_MB,
  );

  const { clientId, setClientId, assetType, setAssetType, tags, setTags, tagError, persistKey } =
    useAssetUploadDraft(
      organizationId,
      parentAsset?.client_id ?? defaultClientId,
      parentAsset?.asset_type ?? defaultAssetType,
      parentAsset?.tags ?? [],
      parentAsset?.id ?? null,
      open,
    );

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pageSelectorEntryId, setPageSelectorEntryId] = useState<string | null>(null);

  const pageSelectorEntry = useMemo(
    () =>
      pageSelectorEntryId ? (entries.find((e) => e.id === pageSelectorEntryId) ?? null) : null,
    [pageSelectorEntryId, entries],
  );

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
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  const uploadEntries = async (targets: any[]) => {
    const cleanTags = Array.from(
      new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)),
    );
    setIsUploading(true);
    let okCount = 0;
    let errCount = 0;

    for (const entry of targets) {
      if (entry.status === "done") {
        okCount++;
        continue;
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: "uploading", progress: 10, phase: "analyzing" } : e,
        ),
      );

      const pages =
        !isVersionMode && entry.kind === "pdf" && (entry.pdfPages?.length ?? 0) > 1
          ? entry.pdfPages!
          : [entry.pdfPage ?? 1];

      try {
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const isMulti = pages.length > 1;
          const overrideName = isMulti
            ? `${entry.file.name.replace(/\.[^.]+$/, "")} — pág. ${page}${entry.file.name.match(/\.[^.]+$/)?.[0] || ""}`
            : undefined;

          const created = await uploadFile(entry.file, {
            organizationId,
            clientId,
            assetType,
            tags: cleanTags,
            parentAsset: parentAsset ?? undefined,
            pdfPage: page,
            name: overrideName,
            onPhase: (phase) => {
              const phaseProgress: any = {
                analyzing: 10,
                "rendering-pdf": 25,
                "rasterizing-svg": 25,
                "processing-image": 25,
                "uploading-file": 55,
                "uploading-thumb": 80,
                "saving-record": 92,
                done: 100,
              };
              const scaled = Math.round(
                ((i + (phaseProgress[phase] || 0) / 100) / pages.length) * 100,
              );
              setEntries((prev) =>
                prev.map((e) =>
                  e.id === entry.id
                    ? { ...e, phase, pdfPage: page, progress: Math.max(e.progress, scaled) }
                    : e,
                ),
              );
            },
          });
          if (created) onUploaded?.(created);
        }
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, status: "done", progress: 100, phase: "done" } : e,
          ),
        );
        okCount++;
      } catch (err: any) {
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: "error", error: err.message } : e)),
        );
        toast.error(`${entry.file.name}: ${err.message}`);
        errCount++;
      }
    }

    setIsUploading(false);
    if (okCount > 0 && errCount === 0) {
      toast.success(`${okCount} asset(s) enviado(s)`);
      clearDraft(persistKey);
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (entries.length === 0 || isUploading) return;
    if (tags.length > MAX_TAGS || tagError) {
      toast.error("Corrija as tags antes de enviar");
      return;
    }
    await uploadEntries(entries);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) =>
          !isUploading && (v ? onOpenChange(v) : (clearDraft(persistKey), onOpenChange(false)))
        }
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isVersionMode ? (
                <>
                  <History className="w-5 h-5" /> Nova versão
                </>
              ) : (
                "Novo asset"
              )}
            </DialogTitle>
            {isVersionMode && parentAsset && (
              <DialogDescription>
                Versão de <span className="font-medium text-foreground">{parentAsset.name}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) =>
                !e.currentTarget.contains(e.relatedTarget as Node) && setIsDragging(false)
              }
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
            >
              <Upload
                className={`w-8 h-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="text-sm text-center">
                {isDragging ? "Solte para adicionar" : "Arraste arquivos ou clique para selecionar"}
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

            <AssetUploadList
              entries={entries}
              isUploading={isUploading}
              onRemove={removeEntry}
              onChangePdfPage={changePdfPage}
              onOpenPdfSelector={setPageSelectorEntryId}
              onResetAllPdfs={() =>
                entries.forEach((e) => e.kind === "pdf" && changePdfPage(e.id, 1))
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Tipo de asset</Label>
                <Select
                  value={assetType}
                  onValueChange={(v) => setAssetType(v as AssetType)}
                  disabled={isUploading || isVersionMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="art">Arte Final</SelectItem>
                    <SelectItem value="mockup">Mockup</SelectItem>
                    <SelectItem value="photo">Foto / Referência</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente / Projeto (opcional)</Label>
                <Select
                  value={clientId || "none"}
                  onValueChange={(v) => setClientId(v === "none" ? null : v)}
                  disabled={isUploading || isVersionMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Tags <TagCounter count={tags.length} max={MAX_TAGS} />
                </Label>
              </div>
              <TagChipsInput
                value={tags}
                onChange={setTags}
                suggestions={tagSuggestions}
                maxTags={MAX_TAGS}
              />
              <AssetUploadAutoSuggestions
                suggestions={autoSuggestions}
                onAddTag={addAutoTag}
                onAddAll={addAllAutoTags}
                remainingSlots={remainingSlots}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => (clearDraft(persistKey), onOpenChange(false))}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || entries.length === 0 || !!tagError}
              className="min-w-32 bg-gradient-primary"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                `Enviar ${entries.length} arquivo(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pageSelectorEntry && (
        <PdfPageSelectorDialog
          open={!!pageSelectorEntryId}
          onOpenChange={(v) => !v && setPageSelectorEntryId(null)}
          file={pageSelectorEntry.file}
          totalPages={pageSelectorEntry.pdfPageCount ?? null}
          initialPages={pageSelectorEntry.pdfPages ?? [pageSelectorEntry.pdfPage ?? 1]}
          onConfirm={(pages: number[]) => {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === pageSelectorEntryId ? { ...e, pdfPages: pages, pdfPage: pages[0] } : e,
              ),
            );
            setPageSelectorEntryId(null);
          }}
        />
      )}
    </>
  );
}
