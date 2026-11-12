import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { AssetThumbnail } from "./AssetThumbnail";
import type { Asset } from "../hooks/use-assets";
import type { ColorEntry, FontEntry } from "../hooks/use-brand-guidelines";
import { useGoogleFonts } from "../lib/google-fonts-loader";
import { wcagBoth, bestTextColor, type WcagLevel } from "../lib/color-contrast";
import { copyHexToClipboard } from "../lib/copy-hex";

interface BrandPreviewCardProps {
  clientName: string;
  primary: ColorEntry[];
  secondary: ColorEntry[];
  fonts: FontEntry[];
  logo: Asset | null;
}

export function BrandPreviewCard({
  clientName,
  primary,
  secondary,
  fonts,
  logo,
}: BrandPreviewCardProps) {
  const heroColor = primary[0]?.hex ?? "#0f172a";
  const accentColor = primary[1]?.hex ?? secondary[0]?.hex ?? "#64748b";
  const headingFont = fonts[0]?.name ?? "Inter";
  const bodyFont = fonts[1]?.name ?? fonts[0]?.name ?? "Inter";
  const { allReady } = useGoogleFonts([headingFont, bodyFont]);

  const heroText = bestTextColor(heroColor);
  const accentText = bestTextColor(accentColor);

  const copyHex = (hex: string) => copyHexToClipboard(hex);

  const levelVariant = (l: WcagLevel): "default" | "secondary" | "destructive" | "outline" =>
    l === "AAA" ? "default" : l === "AA" ? "secondary" : "destructive";

  const allColors = [...primary, ...secondary];

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="overflow-hidden border-border">
        <div
          className="p-8 flex items-center gap-6"
          style={{ backgroundColor: heroColor, color: heroText }}
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
              style={{
                fontFamily: `"${headingFont}", sans-serif`,
                visibility: allReady ? "visible" : "hidden",
              }}
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
              {primary.slice(0, 5).map((c, i) => {
                const w = wcagBoth(c.hex);
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => copyHex(c.hex)}
                        className="relative w-7 h-7 rounded-full border-2 border-white/30 hover:scale-110 transition-transform cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                        style={{ backgroundColor: c.hex }}
                        aria-label={`Copiar cor ${c.name || c.hex.toUpperCase()} · contraste ${w.vsWhite} vs branco`}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-1 -right-1 text-[7px] font-bold px-1 rounded-full border border-white/40 leading-[1.1]"
                          style={{
                            backgroundColor:
                              w.vsWhite === "FAIL"
                                ? "#dc2626"
                                : w.vsWhite === "AAA"
                                  ? "#16a34a"
                                  : "#2563eb",
                            color: "#fff",
                          }}
                        >
                          {w.vsWhite}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {c.name || c.hex.toUpperCase()} · vs branco {w.ratioWhite.toFixed(2)}:1 · vs
                      preto {w.ratioBlack.toFixed(2)}:1
                    </TooltipContent>
                  </Tooltip>
                );
              })}
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
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: heroColor,
                  color: heroText,
                  fontFamily: `"${bodyFont}", sans-serif`,
                }}
              >
                Primária
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                  fontFamily: `"${bodyFont}", sans-serif`,
                }}
              >
                Secundária
              </button>
            </div>
          </div>
        </div>
        {allColors.length > 0 && (
          <div className="p-6 pt-0 bg-card">
            <div className="text-xs uppercase text-muted-foreground mb-3">
              Paleta completa · contraste WCAG
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allColors.map((c, i) => {
                const w = wcagBoth(c.hex);
                return (
                  <div
                    key={`${c.hex}-${i}`}
                    className="flex items-center gap-3 p-2 rounded-md border border-border hover:bg-muted/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => copyHex(c.hex)}
                      className="w-10 h-10 rounded-md border border-border shrink-0 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      style={{ backgroundColor: c.hex }}
                      aria-label={`Copiar swatch ${c.name || c.hex.toUpperCase()}`}
                    />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => copyHex(c.hex)}
                        className="block text-left w-full truncate text-xs font-medium hover:text-primary rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Clique para copiar"
                        aria-label={`Copiar nome — ${c.name || "Sem nome"} (${c.hex.toUpperCase()})`}
                      >
                        {c.name || "Sem nome"}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyHex(c.hex)}
                        className="block text-left w-full font-mono text-[10px] text-muted-foreground hover:text-foreground rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Copiar HEX ${c.hex.toUpperCase()}`}
                      >
                        {c.hex.toUpperCase()}
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={levelVariant(w.vsWhite)}
                            className="font-mono text-[9px] px-1.5 py-0 cursor-help"
                          >
                            {w.vsWhite}·W
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Contraste {w.ratioWhite.toFixed(2)}:1 vs branco
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={levelVariant(w.vsBlack)}
                            className="font-mono text-[9px] px-1.5 py-0 cursor-help"
                          >
                            {w.vsBlack}·B
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Contraste {w.ratioBlack.toFixed(2)}:1 vs preto
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
