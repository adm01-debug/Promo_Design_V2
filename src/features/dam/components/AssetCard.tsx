import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AssetThumbnail } from "./AssetThumbnail";
import type { Asset } from "../hooks/use-assets";

export function AssetCard({ asset, onClick }: { asset: Asset; onClick?: () => void }) {
  return (
    <Card
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className="overflow-hidden cursor-pointer hover:shadow-elegant transition-shadow group"
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