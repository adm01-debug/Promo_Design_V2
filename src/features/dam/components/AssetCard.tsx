import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AssetThumbnail } from "./AssetThumbnail";
import type { Asset } from "../hooks/use-assets";
import { cn } from "@/lib/utils";
import { ScanText, ArchiveRestore, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  isQuickActive?: boolean;
  onRestore?: (asset: Asset) => void;
}

export function AssetCard({
  asset,
  onClick,
  onHover,
  onHoverEnd,
  isQuickActive,
  onRestore,
}: AssetCardProps) {
  return (
    <Card
      role={onClick ? "button" : undefined}
      data-asset-id={asset.id}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={cn(
        "overflow-hidden cursor-pointer hover:shadow-elegant transition-all group",
        isQuickActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        asset.is_archived && "opacity-75",
      )}
    >
      <div className="relative aspect-square bg-muted">
        <AssetThumbnail asset={asset} className="w-full h-full" />
        <Badge variant="secondary" className="absolute top-2 left-2 capitalize">
          {asset.asset_type}
        </Badge>
        {asset.version > 1 && (
          <Badge variant="outline" className="absolute top-2 right-2 bg-background/80">
            v{asset.version}
          </Badge>
        )}
        {asset.is_archived && (
          <Badge
            variant="outline"
            className="absolute bottom-2 right-2 gap-1 px-1.5 py-0 text-[10px] bg-background/80 backdrop-blur-sm"
            title="Asset arquivado"
          >
            <Archive className="w-3 h-3" />
            Arquivado
          </Badge>
        )}
        {asset.ocr_match && (
          <Badge
            variant="default"
            className="absolute bottom-2 left-2 gap-1 px-1.5 py-0 text-[10px] bg-primary/90 backdrop-blur-sm"
            title="Encontrado pelo texto interno (OCR)"
          >
            <ScanText className="w-3 h-3" />
            OCR
          </Badge>
        )}
        {onRestore && asset.is_archived && (
          <div className="absolute inset-x-2 top-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1 text-xs shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onRestore(asset);
              }}
              title="Restaurar asset"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              Restaurar
            </Button>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="font-medium text-sm truncate" title={asset.name}>
          {asset.name}
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {asset.dominant_colors.length > 0 && (
          <div className="flex gap-1">
            {asset.dominant_colors.slice(0, 4).map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded border border-border"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
