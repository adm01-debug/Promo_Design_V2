import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Copy, Archive, Trash2, GitBranch } from "lucide-react";
import { getAssetSignedUrl, useAssets, type Asset } from "../hooks/use-assets";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AssetVersionHistory } from "./AssetVersionHistory";
import { AssetUploadDialog } from "./AssetUploadDialog";

interface Props {
  asset: Asset | null;
  onClose: () => void;
  onSelectAsset?: (a: Asset) => void;
}

export function AssetDetailDrawer({ asset, onClose, onSelectAsset }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const { currentOrgId, can } = useOrganizations();
  const { archive, remove } = useAssets(currentOrgId);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  useEffect(() => {
    if (!asset) return;
    getAssetSignedUrl(asset.file_path, 3600).then(setUrl);
  }, [asset]);

  if (!asset) return null;

  const isImage = (asset.mime_type ?? "").startsWith("image/");
  const sizeKb = asset.file_size ? (asset.file_size / 1024).toFixed(1) : "—";

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  return (
    <Sheet open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="truncate flex items-center gap-2">
            <span className="truncate">{asset.name}</span>
            <Badge variant="secondary" className="shrink-0 text-[10px]">v{asset.version}</Badge>
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
              <Badge variant="secondary" className="capitalize">{asset.asset_type}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Versão</div>
              <div>v{asset.version}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Dimensões</div>
              <div>{asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tamanho</div>
              <div>{sizeKb} KB</div>
            </div>
          </div>

          {asset.tags.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {asset.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
              </div>
            </div>
          )}

          {asset.dominant_colors.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Cores dominantes</div>
              <div className="flex gap-2">
                {asset.dominant_colors.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded border border-border" style={{ backgroundColor: c }} />
                    <span className="text-[10px] font-mono">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            {url && (
              <Button variant="outline" size="sm" asChild>
                <a href={url} download={asset.name}>
                  <Download className="w-4 h-4 mr-2" />Baixar
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!url}>
              <Copy className="w-4 h-4 mr-2" />Copiar URL
            </Button>
            {can(["owner", "admin", "designer"]) && (
              <Button variant="outline" size="sm" onClick={() => setVersionDialogOpen(true)}>
                <GitBranch className="w-4 h-4 mr-2" />Nova versão
              </Button>
            )}
            {can(["owner", "admin", "designer"]) && !asset.is_archived && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await archive.mutateAsync(asset.id);
                  toast.success("Asset arquivado");
                  onClose();
                }}
              >
                <Archive className="w-4 h-4 mr-2" />Arquivar
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
                <Trash2 className="w-4 h-4 mr-2" />Excluir
              </Button>
            )}
          </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-4">
            <AssetVersionHistory
              asset={asset}
              onSelect={(a) => onSelectAsset?.(a)}
            />
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