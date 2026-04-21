import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetThumbnail } from "./AssetThumbnail";
import type { Asset } from "../hooks/use-assets";
import type { ColorEntry, FontEntry } from "../hooks/use-brand-guidelines";

interface BrandPreviewCardProps {
  clientName: string;
  primary: ColorEntry[];
  secondary: ColorEntry[];
  fonts: FontEntry[];
  logo: Asset | null;
}

export function BrandPreviewCard({ clientName, primary, secondary, fonts, logo }: BrandPreviewCardProps) {
  const heroColor = primary[0]?.hex ?? "#0f172a";
  const accentColor = primary[1]?.hex ?? secondary[0]?.hex ?? "#64748b";
  const headingFont = fonts[0]?.name ?? "Inter";
  const bodyFont = fonts[1]?.name ?? fonts[0]?.name ?? "Inter";

  return (
    <Card className="overflow-hidden border-border">
      <div
        className="p-8 flex items-center gap-6"
        style={{ backgroundColor: heroColor, color: "#fff" }}
      >
        {logo ? (
          <div className="w-20 h-20 rounded-lg bg-white/10 backdrop-blur overflow-hidden flex-shrink-0">
            <AssetThumbnail asset={logo} className="w-full h-full" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center text-3xl font-bold flex-shrink-0">
            {clientName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            className="text-3xl font-bold truncate"
            style={{ fontFamily: `"${headingFont}", sans-serif` }}
          >
            {clientName}
          </div>
          <div
            className="text-sm opacity-80 mt-1"
            style={{ fontFamily: `"${bodyFont}", sans-serif` }}
          >
            Brand preview · aplicação visual da identidade
          </div>
          <div className="flex gap-2 mt-3">
            {primary.slice(0, 5).map((c, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white/30"
                style={{ backgroundColor: c.hex }}
                title={c.name || c.hex}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-card">
        <div>
          <div className="text-xs uppercase text-muted-foreground mb-2">Tipografia</div>
          <div
            className="text-2xl font-bold"
            style={{ fontFamily: `"${headingFont}", sans-serif` }}
          >
            {headingFont}
          </div>
          <div
            className="text-sm text-muted-foreground mt-1"
            style={{ fontFamily: `"${bodyFont}", sans-serif` }}
          >
            The quick brown fox jumps over the lazy dog · 0123456789
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground mb-2">Botão de marca</div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: heroColor, fontFamily: `"${bodyFont}", sans-serif` }}
            >
              Primária
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: accentColor, fontFamily: `"${bodyFont}", sans-serif` }}
            >
              Secundária
            </button>
          </div>
          {secondary.length > 0 && (
            <div className="flex gap-2 mt-3">
              {secondary.slice(0, 6).map((c, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="font-mono text-[10px]"
                  style={{ borderColor: c.hex, color: c.hex }}
                >
                  {c.hex.toUpperCase()}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}