import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AssetThumbnail } from "./AssetThumbnail";
import type { Asset } from "../hooks/use-assets";
import { cn } from "@/lib/utils";
import { ScanText } from "lucide-react";

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  isQuickActive?: boolean;
}

export function AssetCard({ asset, onClick, onHover, onHoverEnd, isQuickActive }: AssetCardProps) {
  return (
    <Card
      role={onClick ? "button" : undefined}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={cn(
        "overflow-hidden cursor-pointer hover:shadow-elegant transition-all group",
        isQuickActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
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