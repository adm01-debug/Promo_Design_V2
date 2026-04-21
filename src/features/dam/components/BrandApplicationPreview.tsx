import { Card } from "@/components/ui/card";
import { AssetThumbnail } from "./AssetThumbnail";
import { useGoogleFonts } from "../lib/google-fonts-loader";
import { bestTextColor } from "../lib/color-contrast";
import type { Asset } from "../hooks/use-assets";
import type { ColorEntry, FontEntry } from "../hooks/use-brand-guidelines";

interface Props {
  clientName: string;
  primary: ColorEntry[];
  secondary: ColorEntry[];
  fonts: FontEntry[];
  logo: Asset | null;
}

export function BrandApplicationPreview({ clientName, primary, secondary, fonts, logo }: Props) {
  const heading = fonts[0]?.name ?? "Inter";
  const body = fonts[1]?.name ?? fonts[0]?.name ?? "Inter";
  const { allReady } = useGoogleFonts([heading, body]);

  const c1 = primary[0]?.hex ?? "#0f172a";
  const c2 = primary[1]?.hex ?? secondary[0]?.hex ?? "#64748b";
  const c3 = secondary[0]?.hex ?? "#94a3b8";
  const onC1 = bestTextColor(c1);

  return (
    <div className="space-y-6">
      {/* Site header simulation */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b" style={{ backgroundColor: c1, color: onC1 }}>
          <div className="flex items-center gap-3">
            {logo ? (
              <div className="w-9 h-9 rounded bg-white/15 overflow-hidden">
                <AssetThumbnail asset={logo} className="w-full h-full" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded bg-white/15 flex items-center justify-center font-bold">{clientName.charAt(0).toUpperCase()}</div>
            )}
            <span style={{ fontFamily: `"${heading}", sans-serif`, visibility: allReady ? "visible" : "hidden" }} className="font-bold text-lg">{clientName}</span>
          </div>
          <nav className="flex gap-5 text-sm opacity-90" style={{ fontFamily: `"${body}", sans-serif` }}>
            <span>Home</span><span>Produtos</span><span>Sobre</span><span>Contato</span>
          </nav>
          <button type="button" className="px-3 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: c2, color: bestTextColor(c2), fontFamily: `"${body}", sans-serif` }}>
            Comprar
          </button>
        </div>
        <div className="p-8 text-center" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, color: onC1 }}>
          <h2 style={{ fontFamily: `"${heading}", sans-serif`, visibility: allReady ? "visible" : "hidden" }} className="text-3xl font-bold mb-2">Sua marca em ação</h2>
          <p style={{ fontFamily: `"${body}", sans-serif` }} className="opacity-90">Combinação de cores primárias aplicadas em gradiente</p>
        </div>
      </Card>

      {/* Product card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card">
          <div className="aspect-square rounded-md mb-3" style={{ background: `linear-gradient(135deg, ${c1}, ${c3})` }} />
          <div style={{ fontFamily: `"${heading}", sans-serif` }} className="font-bold text-sm">Produto Premium</div>
          <div style={{ fontFamily: `"${body}", sans-serif` }} className="text-xs text-muted-foreground mt-1">Descrição curta do produto</div>
          <button type="button" className="mt-3 w-full px-3 py-2 rounded text-xs font-medium" style={{ backgroundColor: c1, color: onC1, fontFamily: `"${body}", sans-serif` }}>
            Adicionar
          </button>
        </Card>
        <Card className="p-4 flex flex-col justify-between" style={{ backgroundColor: c2, color: bestTextColor(c2) }}>
          <div>
            <div style={{ fontFamily: `"${heading}", sans-serif` }} className="font-bold text-lg">Promoção</div>
            <div style={{ fontFamily: `"${body}", sans-serif` }} className="text-xs opacity-80 mt-1">Aplicação em fundo de cor secundária</div>
          </div>
          <button type="button" className="mt-4 px-3 py-2 rounded text-xs font-medium self-start" style={{ backgroundColor: bestTextColor(c2), color: c2, fontFamily: `"${body}", sans-serif` }}>
            Saiba mais
          </button>
        </Card>
        <Card className="p-4 bg-card border-2" style={{ borderColor: c1 }}>
          <div style={{ fontFamily: `"${heading}", sans-serif`, color: c1 }} className="font-bold text-lg">Outline style</div>
          <div style={{ fontFamily: `"${body}", sans-serif` }} className="text-xs text-muted-foreground mt-1">Borda na cor primária, conteúdo neutro</div>
          <div className="flex gap-1.5 mt-3">
            {[c1, c2, c3].map((c, i) => <div key={i} className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}