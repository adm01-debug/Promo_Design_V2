import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  GitBranch,
  Loader2,
  Star,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useAssets, type Asset } from "../hooks/use-assets";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AssetVersionHistory } from "./AssetVersionHistory";
import { AssetUploadDialog } from "./AssetUploadDialog";
import { useAssetFavorites } from "../hooks/use-asset-favorites";
import { cn } from "@/lib/utils";
import { RelatedFavorites } from "./RelatedFavorites";
import { TagChipsInput } from "./TagChipsInput";
import { TagCounter } from "@/components/ui/tag-counter";
import { useAssetOcr } from "../hooks/use-asset-ocr";
import { useAssetTags } from "../hooks/use-asset-tags";
import { useAssetDetailActions } from "../hooks/use-asset-detail-actions";
import { AssetDetailOcrSection } from "./AssetDetailOcrSection";

interface Props {
  asset: Asset | null;
  onClose: () => void;
  onSelectAsset?: (a: Asset) => void;
  searchQuery?: string;
}

export function AssetDetailDrawer({ asset, onClose, onSelectAsset, searchQuery }: Props) {
  const { currentOrgId, can } = useOrganizations();
  const { archive, restore, remove, update, assets } = useAssets(currentOrgId);
  const { isFavorite, toggleFavorite } = useAssetFavorites(currentOrgId);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  const { url, handleCopyUrl } = useAssetDetailActions(asset, { toggleFavorite });
  const { ocrText, ocrStatus, ocrLoading, ocrOpen, setOcrOpen, ocrClearing, runOcr, clearOcr } =
    useAssetOcr(asset, searchQuery);

  const {
    editingTags,
    setEditingTags,
    tagsDraft,
    setTagsDraft,
    tagError,
    setTagError,
    savingTags,
    tagSuggestions,
    handleSaveTags,
  } = useAssetTags(asset, assets, update);

  if (!asset) return null;

  const isImage = (asset.mime_type ?? "").startsWith("image/");
  const sizeKb = asset.file_size ? (asset.file_size / 1024).toFixed(1) : "—";
  const canEdit = can(["owner", "admin", "designer"]);

  return (
    <Sheet open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="truncate flex items-center gap-2">
            <span className="truncate">{asset.name}</span>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              v{asset.version}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0 ml-auto"
              aria-pressed={isFavorite(asset.id)}
              aria-label={isFavorite(asset.id) ? "Desfavoritar (F)" : "Favoritar (F)"}
              onClick={() => {
                const nowFav = toggleFavorite(asset.id);
                toast.success(nowFav ? "Adicionado aos favoritos" : "Removido dos favoritos");
              }}
            >
              <Star
                className={cn(
                  "w-4 h-4 transition-colors",
                  isFavorite(asset.id) ? "fill-primary text-primary" : "text-muted-foreground",
                )}
              />
            </Button>
          </SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="versions">Versões</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {isImage && url && (
              <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center max-h-96">
                <img src={url} alt={asset.name} className="max-w-full max-h-96 object-contain" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Tipo</div>
                <Badge variant="secondary" className="capitalize">
                  {asset.asset_type}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Versão</div>
                <div>v{asset.version}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Dimensões</div>
                <div>
                  {asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tamanho</div>
                <div>{sizeKb} KB</div>
              </div>
            </div>

            {(asset.tags.length > 0 || canEdit) && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">Tags</div>
                  <div className="flex items-center gap-2">
                    {editingTags && <TagCounter count={tagsDraft.length} max={20} />}
                    {canEdit && !editingTags && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setEditingTags(true)}
                      >
                        <Pencil className="w-3 h-3 mr-1" /> Editar
                      </Button>
                    )}
                  </div>
                </div>
                {editingTags ? (
                  <div className="space-y-2">
                    <TagChipsInput
                      value={tagsDraft}
                      onChange={setTagsDraft}
                      suggestions={tagSuggestions}
                      onValidationChange={setTagError}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        disabled={savingTags}
                        onClick={() => setEditingTags(false)}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="h-7"
                        disabled={savingTags || !!tagError}
                        onClick={handleSaveTags}
                      >
                        {savingTags ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : asset.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">Sem tags</div>
                )}
              </div>
            )}

            {asset.dominant_colors.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Cores dominantes</div>
                <div className="flex gap-2">
                  {asset.dominant_colors.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded border border-border"
                        style={{ backgroundColor: c }}
                      />
                      <span className="text-[10px] font-mono">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <RelatedFavorites
              asset={asset}
              organizationId={currentOrgId}
              onSelect={(a) => onSelectAsset?.(a)}
            />

            {isImage && (
              <AssetDetailOcrSection
                ocrText={ocrText}
                ocrStatus={ocrStatus}
                ocrLoading={ocrLoading}
                ocrOpen={ocrOpen}
                onOpenChange={setOcrOpen}
                ocrClearing={ocrClearing}
                onRun={runOcr}
                onClear={clearOcr}
                canEdit={canEdit}
                searchQuery={searchQuery}
                ocrMatch={asset.ocr_match}
              />
            )}

            <Separator />

            <div className="flex flex-wrap gap-2">
              {url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={url} download={asset.name}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleCopyUrl} disabled={!url}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar URL
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setVersionDialogOpen(true)}>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Nova versão
                </Button>
              )}
              {canEdit && !asset.is_archived && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await archive.mutateAsync(asset.id);
                    toast.success("Asset arquivado");
                    onClose();
                  }}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Arquivar
                </Button>
              )}
              {canEdit && asset.is_archived && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await restore.mutateAsync(asset.id);
                    toast.success("Asset restaurado");
                    onClose();
                  }}
                  disabled={restore.isPending}
                >
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Restaurar
                </Button>
              )}
              {can(["owner", "admin"]) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Excluir definitivamente este asset?")) return;
                    await remove.mutateAsync(asset);
                    toast.success("Asset excluído");
                    onClose();
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-4">
            <AssetVersionHistory asset={asset} onSelect={(a) => onSelectAsset?.(a)} />
          </TabsContent>
        </Tabs>

        {currentOrgId && (
          <AssetUploadDialog
            open={versionDialogOpen}
            onOpenChange={setVersionDialogOpen}
            organizationId={currentOrgId}
            parentAsset={asset}
            onUploaded={(newAsset) => onSelectAsset?.(newAsset)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
